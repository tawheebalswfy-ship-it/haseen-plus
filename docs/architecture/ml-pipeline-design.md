# ML Pipeline Design Document — PolicyShield

> **Project:** PolicyShield — AI-powered NCA ECC-2:2024 / ISO 27001 Compliance Gap Detector  
> **University:** College of Computing, Umm Al-Qura University (2025-2026)  
> **Department:** Cybersecurity

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Dataset Generation](#2-dataset-generation)
3. [Data Preprocessing](#3-data-preprocessing)
4. [Model Architecture](#4-model-architecture)
5. [Training Configuration](#5-training-configuration)
6. [Evaluation Metrics](#6-evaluation-metrics)
7. [Model Export & Versioning](#7-model-export--versioning)
8. [Inference Pipeline](#8-inference-pipeline)
9. [Deployment Pipeline](#9-deployment-pipeline)
10. [Model Evolution](#10-model-evolution)

---

## 1. Pipeline Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Dataset    │───▶│    Data      │───▶│   Model      │───▶│   Model      │───▶│  Deployment  │
│  Generation  │    │ Preprocessing│    │  Training    │    │   Export     │    │  (Cloud Run) │
│  (Gemini)    │    │  (Pandas)    │    │  (mBERT)     │    │ (SafeTensors)│    │  (FastAPI)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
      │                    │                   │                   │                   │
  Google Gemini       Multi-hot           HuggingFace        SafeTensors +       Docker + GCS
  2.5 Flash API       vectors (16)        Trainer            Tokenizer files     → Cloud Run
```

**End-to-end flow:**
1. **Generate** synthetic policy documents using Google Gemini 2.5 Flash
2. **Preprocess** into multi-hot gap vectors (16 labels)
3. **Train** an mBERT-based multi-label classifier
4. **Export** to SafeTensors format with tokenizer
5. **Deploy** as a FastAPI service on Google Cloud Run

---

## 2. Dataset Generation

### 2.1 Generation Architecture

The dataset is synthetically generated using the **Google Gemini 2.5 Flash** API via the `google-genai` SDK.

```
generate_compliance_dataset.py
         │
         ├── Step 1: Prompt Gemini → generate policy excerpt
         │       (domain, profile, language, industry, company size)
         │
         └── Step 2: Prompt Gemini → verify gap labels
                 (binary confirmation per gap)
```

### 2.2 Domain Coverage

| Domain | NCA Control | ISO 27001 | Gap IDs | Count |
|--------|-------------|-----------|---------|-------|
| Password Policy | ECC 2-2 | A.5.17, A.8.5 | GAP_PP_001–008 | 8 |
| Risk Assessment | ECC 1-5 | 6.1.2, 8.2 | GAP_RA_001–008 | 8 |
| **Total** | — | — | — | **16** |

### 2.3 Gap Definitions

#### Password Policy Gaps (ECC 2-2)

| ID | Gap Description | Severity |
|----|----------------|----------|
| GAP_PP_001 | Weak password complexity requirements | High (3) |
| GAP_PP_002 | Inadequate password expiration policy | Medium (2) |
| GAP_PP_003 | Weak account lockout policy | Medium (2) |
| GAP_PP_004 | Missing Multi-Factor Authentication (MFA) | Critical (4) |
| GAP_PP_005 | Missing Privileged Access Management (PAM) | Critical (4) |
| GAP_PP_006 | Missing password encryption/storage requirements | High (3) |
| GAP_PP_007 | Missing periodic review schedule | Medium (2) |
| GAP_PP_008 | Missing or vague roles and responsibilities | Medium (2) |

#### Risk Assessment Gaps (ECC 1-5)

| ID | Gap Description | Severity |
|----|----------------|----------|
| GAP_RA_001 | Missing documented risk methodology | Critical (4) |
| GAP_RA_002 | Missing risk identification procedures | High (3) |
| GAP_RA_003 | Missing likelihood/impact assessment scales | High (3) |
| GAP_RA_004 | Missing risk treatment options | High (3) |
| GAP_RA_005 | Missing mandatory risk assessment triggers | Critical (4) |
| GAP_RA_006 | Missing risk register requirements | Medium (2) |
| GAP_RA_007 | Missing periodic review schedule | Medium (2) |
| GAP_RA_008 | Missing integration with project management | Medium (2) |

### 2.4 Sample Profiles

14 sample profiles control the diversity and balance of generated data:

| Profile Type | Gap Count Range | Description |
|-------------|-----------------|-------------|
| Compliant | 0 gaps | Addresses all requirements |
| Partially Compliant | 1–7 gaps | Some gaps present |
| Non-Compliant | 5–12 gaps | Significant deficiencies |
| Critical | 12–16 gaps | Severe non-compliance |

### 2.5 Variation Dimensions

| Dimension | Values |
|-----------|--------|
| Languages | English (`en`), Arabic (`ar`) |
| Industries | 12 (Finance, Healthcare, Government, Telco, Energy, etc.) |
| Company Sizes | 5 (Startup, SME, Medium, Large Enterprise, Government Agency) |

### 2.6 Quality Assurance

- **Two-pass verification:** Each sample is generated then independently verified by a second Gemini call
- **Rate limiting:** 5s sleep between API calls, 30s retry on rate limits (max 3 retries)
- **Resumable:** Incremental JSONL output allows resuming from interruptions

### 2.7 Output Formats

| Format | File | Purpose |
|--------|------|---------|
| JSON | `compliance_dataset.json` | Full structured dataset |
| CSV | `compliance_dataset.csv` | Tabular analysis |
| JSONL | `incremental_samples.jsonl` | Streaming / incremental |

### 2.8 Compliance Scoring

Compliance score is severity-weighted:

$$\text{score} = 1 - \frac{\sum_{g \in \text{detected\_gaps}} w_g}{\sum_{g \in \text{all\_gaps}} w_g}$$

Where $w_g$ is the severity weight (2–4) of gap $g$.

Classification thresholds:
- **Fully Compliant:** score ≥ 0.9 (and 0 gaps detected)
- **Partially Compliant:** 0.5 ≤ score < 0.9
- **Non-Compliant:** score < 0.5

---

## 3. Data Preprocessing

### 3.1 Label Encoding

From `dataset_utils.py`:

```
Raw Sample → extract_gap_vectors() → np.ndarray shape (N, 16)
```

Each sample produces a **16-dimensional binary vector** (multi-hot encoding):

```
[PP_001, PP_002, PP_003, PP_004, PP_005, PP_006, PP_007, PP_008,
 RA_001, RA_002, RA_003, RA_004, RA_005, RA_006, RA_007, RA_008]
```

### 3.2 Tokenization

| Parameter | Value |
|-----------|-------|
| Tokenizer | `bert-base-multilingual-cased` |
| Vocabulary size | 119,547 tokens |
| Max sequence length | 512 tokens |
| Padding | Dynamic (to longest in batch) |
| Truncation | True |

### 3.3 Document Chunking (for long documents)

Documents exceeding 512 tokens are split into overlapping chunks:

| Parameter | Value |
|-----------|-------|
| Max chunk size | ~350 words |
| Overlap | ~50 words |
| Splitting strategy | Section headings → paragraphs → word-count |
| Aggregation | Max-pooling across chunk predictions |

### 3.4 Filtering Capabilities

The `dataset_utils.py` module supports filtering by:
- Language (`en` / `ar`)
- Compliance level (Fully Compliant / Partially / Non-Compliant)
- Domain (Password Policy / Risk Assessment)
- Gap count range

---

## 4. Model Architecture

### 4.1 Production Model (v2.0 — Gap Detector)

```
┌─────────────────────────────────────────────────┐
│               GapDetectionModel                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │   mBERT Backbone (bert-base-multilingual) │  │
│  │   12 layers • 12 heads • 768 hidden       │  │
│  │   110M parameters                         │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ [CLS] → 768-dim            │
│  ┌──────────────────┴────────────────────────┐  │
│  │   Classification Head                      │  │
│  │   Linear(768 → 256) → ReLU → Dropout(0.3) │  │
│  │   Linear(256 → 16) → Sigmoid              │  │
│  └───────────────────────────────────────────┘  │
│                     │                            │
│              16 probabilities                    │
│         (one per compliance gap)                 │
└─────────────────────────────────────────────────┘
```

### 4.2 Model Specifications

| Property | Value |
|----------|-------|
| Base model | `bert-base-multilingual-cased` |
| Task | Multi-label binary classification |
| Number of labels | 16 |
| Hidden size | 768 |
| Intermediate size | 3072 |
| Attention heads | 12 |
| Transformer layers | 12 |
| Vocabulary | 119,547 (multilingual WordPiece) |
| Classifier dropout | 0.3 |
| Activation | ReLU (hidden), Sigmoid (output) |
| Total parameters | ~110M (backbone) + ~200K (head) |
| Model size | ~681 MB (SafeTensors) |
| Max input tokens | 512 |

### 4.3 Why mBERT?

| Requirement | mBERT Capability |
|-------------|-----------------|
| Bilingual (Arabic + English) | Pre-trained on 104 languages including Arabic |
| Domain understanding | Strong contextual encoding of security policy language |
| Sequence classification | CLS token pooling well-suited for document-level labels |
| Deployment constraints | ~110M params fits comfortably in Cloud Run CPU instances |

---

## 5. Training Configuration

### 5.1 Training Hyperparameters

| Parameter | Value |
|-----------|-------|
| Optimizer | AdamW |
| Learning rate | 2e-5 (with warmup) |
| Batch size | 8–16 |
| Epochs | Variable (early stopping) |
| Loss function | BCEWithLogitsLoss (multi-label) |
| Weight decay | 0.01 |
| Warmup steps | 10% of total |
| Gradient clipping | 1.0 |
| Evaluation strategy | Per epoch |
| Framework | HuggingFace Transformers `Trainer` |

### 5.2 Loss Function

For multi-label classification, **Binary Cross-Entropy with Logits** is used:

$$\mathcal{L} = -\frac{1}{N \cdot K} \sum_{i=1}^{N} \sum_{k=1}^{K} \left[ y_{ik} \log(\sigma(z_{ik})) + (1 - y_{ik}) \log(1 - \sigma(z_{ik})) \right]$$

Where:
- $N$ = batch size, $K$ = 16 gap labels
- $y_{ik}$ = ground truth (0 or 1)
- $z_{ik}$ = raw logit output
- $\sigma$ = sigmoid function

### 5.3 Training Environment

| Resource | Details |
|----------|---------|
| Platform | Google Colab / Local GPU |
| GPU | NVIDIA T4 / A100 (Colab) |
| Python | 3.12+ |
| PyTorch | ≥ 2.0.0 |
| Transformers | ≥ 4.35.0 |

---

## 6. Evaluation Metrics

### 6.1 Multi-Label Metrics

| Metric | Description | Relevance |
|--------|-------------|-----------|
| **Hamming Loss** | Fraction of incorrectly predicted labels | Primary — penalizes each wrong gap label |
| **Subset Accuracy** | Exact match of all 16 labels | Strict — all gaps must match exactly |
| **Micro F1** | F1 averaged over all label predictions | Balances precision/recall across all gaps |
| **Macro F1** | F1 averaged per-label then averaged | Ensures rare gaps are not ignored |
| **Per-gap Precision** | Correct gap detections / total gap predictions | Avoids false positives per gap |
| **Per-gap Recall** | Correct gap detections / actual gaps present | Avoids missing real gaps |
| **AUC-ROC (per label)** | Area under ROC curve per gap | Threshold-independent performance |

### 6.2 Business Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Overall compliance accuracy | ≥ 85% | Correct compliance level assignment |
| Critical gap recall | ≥ 90% | Must not miss severity-4 gaps |
| Inference latency (p95) | < 500ms | User-facing API constraint |
| False positive rate | < 15% | Avoid alert fatigue |

---

## 7. Model Export & Versioning

### 7.1 Export Pipeline

```python
# export_gap_detector.py
model → SafeTensors (model.safetensors)     # ~681 MB
      → PyTorch     (model.pt)              # ~681 MB (backup)
      → Tokenizer   (tokenizer.json +       # ~2 MB
                      tokenizer_config.json)
```

### 7.2 Artifact Storage

| Artifact | Location | Purpose |
|----------|----------|---------|
| `model.safetensors` | GCS `gs://model-files33/policy_gap_detector/` | Production weights |
| `tokenizer.json` | GCS (same prefix) | WordPiece vocabulary |
| `tokenizer_config.json` | GCS (same prefix) | Tokenizer settings |
| `config.json` | GCS (same prefix) | Model architecture config |

### 7.3 Version History

| Version | Type | Labels | Status |
|---------|------|--------|--------|
| v1.0 | BertForSequenceClassification | 3 classes (FC/PC/NC) | Legacy — local checkpoints only |
| **v2.0** | **GapDetectionModel (custom)** | **16 multi-label (sigmoid)** | **Production** |

### 7.4 Checkpoint Validation

At startup, the API validates that loaded weights match the expected architecture:
- Classifier layer 0 weight shape: `(256, 768)`
- Classifier layer 3 weight shape: `(16, 256)`
- Rejects legacy 3-class checkpoints automatically

---

## 8. Inference Pipeline

### 8.1 End-to-End Inference Flow

```
Input Document (text, 1–50,000 chars)
         │
         ▼
┌──────────────────────┐
│  Domain Detection    │  Keyword heuristic:
│  (keyword matching)  │  PP → 1+ keyword match
│                      │  RA → 2+ keyword matches
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Document Chunking   │  Split at ~350 words
│  (with overlap)      │  with ~50-word overlap
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Per-Chunk Inference  │  For each chunk:
│  (mBERT + Sigmoid)   │  tokenize → forward → sigmoid
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Max-Pool Aggregation │  Per-gap max probability
│  across all chunks   │  across all chunks
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Threshold & Score   │  prob > threshold → gap detected
│  (default t=0.6)     │  severity-weighted scoring
└──────────┬───────────┘
           │
           ▼
    AnalyzeResponse
    (compliance level, scores, gap details)
```

### 8.2 Performance Characteristics

| Metric | Typical Value |
|--------|---------------|
| Short document (< 512 tokens) | ~100ms |
| Medium document (1–3 chunks) | ~200–300ms |
| Long document (5+ chunks) | ~400–500ms |
| Model memory footprint | ~1.5 GB RAM |
| Cold start (model download) | ~15–30s |

---

## 9. Deployment Pipeline

### 9.1 Architecture

```
Developer Machine                  Google Cloud
      │                                │
      │  docker build                  │
      ▼                                │
┌──────────┐    docker push     ┌──────────────────┐
│ Dockerfile│──────────────────▶│ Artifact Registry │
│ (Python   │                   │ (me-central3)     │
│  3.12     │                   └────────┬─────────┘
│  slim)    │                            │
└──────────┘                    Cloud Run Deploy
                                         │
                                         ▼
                                ┌──────────────────┐
                                │   Cloud Run       │
                                │   (me-central1)   │
                                │                   │
                                │  ┌─────────────┐  │
                                │  │  FastAPI +   │  │
                                │  │  Uvicorn     │  │
                                │  └──────┬──────┘  │
                                │         │         │
                                │  ┌──────┴──────┐  │
                                │  │ GCS Model   │  │
                                │  │ Download    │  │
                                │  └─────────────┘  │
                                └──────────────────┘
```

### 9.2 Docker Configuration

| Setting | Value |
|---------|-------|
| Base image | `python:3.12-slim` |
| PyTorch build | CPU-only (`download.pytorch.org/whl/cpu`) |
| Health check interval | 30s |
| Health start period | 60s |
| Runtime command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Default port | 8080 |

### 9.3 Cloud Run Settings

| Setting | Value |
|---------|-------|
| Region | `me-central1` (Doha, Qatar) |
| Scaling | Auto (0 → N instances) |
| Memory | Sufficient for ~1.5 GB model |
| CPU | 1+ vCPU |
| Startup probe | `GET /health` |

### 9.4 Model Loading Strategy

1. Check local path (`./policy_gap_detector/`)
2. If not found → download from GCS (`gs://model-files33/policy_gap_detector/`)
3. Fallback prefixes: `policy_gap_detector/`, `checkpoint-505/`
4. Validate checkpoint shape before loading
5. Set model to eval mode + inference mode

---

## 10. Model Evolution

### 10.1 v1.0 → v2.0 Migration

| Aspect | v1.0 (Legacy) | v2.0 (Current) |
|--------|---------------|-----------------|
| Task | 3-class classification | 16-label multi-label |
| Labels | Fully / Partially / Non-Compliant | 16 specific gap IDs |
| Architecture | BertForSequenceClassification | Custom GapDetectionModel |
| Loss | CrossEntropyLoss | BCEWithLogitsLoss |
| Output | Softmax (3 probs) | Sigmoid (16 probs) |
| Granularity | Document-level only | Per-gap, per-domain |
| Actionability | Low (just a label) | High (specific gaps to fix) |

### 10.2 Future Improvements

| Enhancement | Description |
|-------------|-------------|
| Additional domains | ECC 3-x, 4-x controls |
| Document structure awareness | Section-level gap attribution |
| Active learning | Flag uncertain predictions for human review |
| Model distillation | Smaller model for edge deployment |
| Continuous training | Re-train on verified predictions |

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Data generation | Google Gemini 2.5 Flash | Latest |
| Data processing | Pandas, NumPy | ≥ 2.0, ≥ 1.24 |
| Arabic NLP | arabert, pyarabic | ≥ 1.0, ≥ 0.6.15 |
| ML framework | PyTorch | ≥ 2.0.0 |
| NLP library | HuggingFace Transformers | ≥ 4.35.0 |
| Training | HuggingFace Trainer | ≥ 4.35.0 |
| Model format | SafeTensors | ≥ 0.4.0 |
| API framework | FastAPI + Uvicorn | ≥ 0.115.0 |
| Container | Docker (Python 3.12-slim) | — |
| Cloud platform | Google Cloud Run | — |
| Model storage | Google Cloud Storage | — |
| Dataset toolkit | scikit-learn, datasets | ≥ 1.3, ≥ 2.14 |
