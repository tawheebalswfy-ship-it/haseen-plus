# API Design Document — PolicyShield Gap Detector

> **Version:** 2.0.0  
> **Base URL:** `https://ecc-model-host-636663078359.me-central1.run.app`  
> **Framework:** FastAPI + Uvicorn  
> **Deployment:** Docker → Google Cloud Run (me-central1, Doha)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Authentication & CORS](#3-authentication--cors)
4. [Endpoints](#4-endpoints)
   - [GET /](#41-get--)
   - [GET /health](#42-get-health)
   - [POST /analyze](#43-post-analyze)
5. [Data Models (Schemas)](#5-data-models-schemas)
6. [Gap Labels Reference](#6-gap-labels-reference)
7. [Error Handling](#7-error-handling)
8. [Rate Limits & Constraints](#8-rate-limits--constraints)
9. [Example Workflows](#9-example-workflows)

---

## 1. Overview

The PolicyShield API serves an **mBERT-based multi-label gap detection model** that analyzes organisation security policy documents against NCA ECC-2:2024 / ISO 27001:2022 requirements.

**Key capabilities:**
- Accepts full policy documents up to 50,000 characters
- Automatically chunks text into 512-token BERT segments
- Detects 16 compliance gaps across 2 domains (Password Policy, Risk Assessment)
- Returns overall compliance level, per-domain scores, and confidence values
- Inference time: ~100–500ms per document on CPU

---

## 2. Architecture

```
Client  ──POST /analyze──▶  FastAPI (Uvicorn)
                                │
                       ┌────────┴────────┐
                       │  Input Validation │
                       │  (Pydantic)      │
                       └────────┬────────┘
                                │
                       ┌────────┴────────┐
                       │  Document Chunker│
                       │  (512 tokens)    │
                       └────────┬────────┘
                                │
                       ┌────────┴────────┐
                       │  mBERT Backbone  │
                       │  + Classifier    │
                       │  (16 sigmoid)    │
                       └────────┬────────┘
                                │
                       ┌────────┴────────┐
                       │  Max-Pooling     │
                       │  Aggregation     │
                       └────────┬────────┘
                                │
                       ┌────────┴────────┐
                       │  Domain Scoring  │
                       │  & Compliance    │
                       └────────┬────────┘
                                │
                        AnalyzeResponse
```

---

## 3. Authentication & CORS

| Setting | Value |
|---------|-------|
| Authentication | None (public API) |
| CORS Origins | `*` (all origins allowed) |
| CORS Methods | `*` |
| CORS Headers | `*` |
| Credentials | Allowed |

> **Note:** For production deployment, restrict CORS origins to the frontend domain(s) only.

---

## 4. Endpoints

### 4.1 GET `/`

Returns API metadata and version information.

**Tags:** `meta`

**Request:** No parameters.

**Response:** `200 OK`
```json
{
  "message": "ISO Policy Gap Detector API",
  "version": "2.0.0",
  "docs": "/docs"
}
```

---

### 4.2 GET `/health`

Health / readiness probe used by Cloud Run.

**Tags:** `meta`

**Response Model:** `HealthResponse`

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_path": "./policy_gap_detector",
  "model_type": "gap_detection_multilabel",
  "num_gaps": 16,
  "gap_labels": [
    "GAP_PP_001", "GAP_PP_002", "GAP_PP_003", "GAP_PP_004",
    "GAP_PP_005", "GAP_PP_006", "GAP_PP_007", "GAP_PP_008",
    "GAP_RA_001", "GAP_RA_002", "GAP_RA_003", "GAP_RA_004",
    "GAP_RA_005", "GAP_RA_006", "GAP_RA_007", "GAP_RA_008"
  ]
}
```

---

### 4.3 POST `/analyze`

Analyze a policy document for compliance gaps. This is the primary inference endpoint.

**Tags:** `inference`

**Request Model:** `AnalyzeRequest`

**Request Body:**
```json
{
  "text": "## Password Policy\n\nPasswords must be at least 8 characters long...",
  "threshold": 0.6
}
```

| Field | Type | Required | Constraints | Default | Description |
|-------|------|----------|-------------|---------|-------------|
| `text` | string | Yes | 1–50,000 chars | — | Full policy document text |
| `threshold` | float | No | 0.0–1.0 | 0.6 | Probability threshold for gap detection |

**Response Model:** `AnalyzeResponse`

**Response:** `200 OK`
```json
{
  "overall_compliance": "Partially Compliant",
  "overall_score": 72.5,
  "gap_count": 5,
  "num_chunks": 3,
  "inference_time_ms": 245.31,
  "domains_detected": ["password_policy", "risk_assessment"],
  "password_policy": {
    "gaps_detected": ["GAP_PP_001", "GAP_PP_004"],
    "gap_count": 2,
    "score": 75.0,
    "details": [
      {
        "gap_id": "GAP_PP_001",
        "description": "Weak password complexity requirements",
        "confidence": 0.87
      },
      {
        "gap_id": "GAP_PP_004",
        "description": "Missing Multi-Factor Authentication (MFA)",
        "confidence": 0.92
      }
    ]
  },
  "risk_assessment": {
    "gaps_detected": ["GAP_RA_001", "GAP_RA_003", "GAP_RA_005"],
    "gap_count": 3,
    "score": 70.0,
    "details": [
      {
        "gap_id": "GAP_RA_001",
        "description": "Missing documented risk methodology",
        "confidence": 0.78
      },
      {
        "gap_id": "GAP_RA_003",
        "description": "Missing likelihood/impact assessment scales",
        "confidence": 0.65
      },
      {
        "gap_id": "GAP_RA_005",
        "description": "Missing mandatory risk assessment triggers",
        "confidence": 0.71
      }
    ]
  },
  "all_gap_probabilities": {
    "GAP_PP_001": 0.87,
    "GAP_PP_002": 0.12,
    "GAP_PP_003": 0.08,
    "GAP_PP_004": 0.92,
    "GAP_PP_005": 0.45,
    "GAP_PP_006": 0.22,
    "GAP_PP_007": 0.31,
    "GAP_PP_008": 0.15,
    "GAP_RA_001": 0.78,
    "GAP_RA_002": 0.38,
    "GAP_RA_003": 0.65,
    "GAP_RA_004": 0.29,
    "GAP_RA_005": 0.71,
    "GAP_RA_006": 0.18,
    "GAP_RA_007": 0.41,
    "GAP_RA_008": 0.11
  }
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `422` | Validation error (empty text, text > 50 000 chars, threshold out of range) | Pydantic validation detail |
| `503` | Model not loaded at startup | `{"detail": "Model not loaded"}` |

---

## 5. Data Models (Schemas)

### AnalyzeRequest

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `text` | `str` | min_length=1, max_length=50000 | Policy document text |
| `threshold` | `float` | ge=0.0, le=1.0, default=0.6 | Gap detection confidence threshold |

### GapDetail

| Field | Type | Description |
|-------|------|-------------|
| `gap_id` | `str` | Gap identifier (e.g., `GAP_PP_001`) |
| `description` | `str` | Human-readable gap description |
| `confidence` | `float` | Model confidence score (0.0–1.0) |

### DomainResult

| Field | Type | Description |
|-------|------|-------------|
| `gaps_detected` | `list[str]` | List of detected gap IDs for this domain |
| `gap_count` | `int` | Number of gaps detected |
| `score` | `float` | Domain compliance score (0–100) |
| `details` | `list[GapDetail]` | Detailed gap information |

### AnalyzeResponse

| Field | Type | Description |
|-------|------|-------------|
| `overall_compliance` | `str` | Compliance level label |
| `overall_score` | `float` | Overall compliance score (0–100) |
| `gap_count` | `int` | Total gaps detected across all domains |
| `num_chunks` | `int` | Number of 512-token chunks processed |
| `inference_time_ms` | `float` | Total inference time in milliseconds |
| `domains_detected` | `list[str]` | Domains found in the document |
| `password_policy` | `DomainResult` | Password Policy domain results |
| `risk_assessment` | `DomainResult` | Risk Assessment domain results |
| `all_gap_probabilities` | `dict[str, float]` | Raw probability for every gap label |

### HealthResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"healthy"` or `"unhealthy"` |
| `model_loaded` | `bool` | Whether the model loaded successfully |
| `model_path` | `str` | Filesystem path to model artifacts |
| `model_type` | `str` | Always `"gap_detection_multilabel"` |
| `num_gaps` | `int` | Number of gap labels (16) |
| `gap_labels` | `list[str]` | All gap label identifiers |

---

## 6. Gap Labels Reference

### Password Policy Domain (ECC 2-2)

| Gap ID | Description | Severity Weight |
|--------|-------------|-----------------|
| GAP_PP_001 | Weak password complexity requirements | 3 |
| GAP_PP_002 | Inadequate password expiration policy | 2 |
| GAP_PP_003 | Weak account lockout policy | 2 |
| GAP_PP_004 | Missing Multi-Factor Authentication (MFA) | 4 |
| GAP_PP_005 | Missing Privileged Access Management (PAM) | 4 |
| GAP_PP_006 | Missing password encryption/storage requirements | 3 |
| GAP_PP_007 | Missing periodic review schedule (password policy) | 2 |
| GAP_PP_008 | Missing or vague roles and responsibilities (password policy) | 2 |

### Risk Assessment Domain (ECC 1-5)

| Gap ID | Description | Severity Weight |
|--------|-------------|-----------------|
| GAP_RA_001 | Missing documented risk methodology | 4 |
| GAP_RA_002 | Missing risk identification procedures | 3 |
| GAP_RA_003 | Missing likelihood/impact assessment scales | 3 |
| GAP_RA_004 | Missing risk treatment options | 3 |
| GAP_RA_005 | Missing mandatory risk assessment triggers | 4 |
| GAP_RA_006 | Missing risk register requirements | 2 |
| GAP_RA_007 | Missing periodic review schedule (risk assessment) | 2 |
| GAP_RA_008 | Missing integration with project management | 2 |

Severity scale: **1** = Low, **2** = Medium, **3** = High, **4** = Critical

---

## 7. Error Handling

| HTTP Status | Meaning | When |
|-------------|---------|------|
| `200` | Success | Request processed normally |
| `422` | Validation Error | Missing `text`, text too long, invalid `threshold` |
| `503` | Service Unavailable | Model failed to load at startup |
| `500` | Internal Server Error | Unexpected runtime failure |

### 422 Validation Error Format
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "text"],
      "msg": "String should have at least 1 character",
      "input": "",
      "ctx": {"min_length": 1}
    }
  ]
}
```

---

## 8. Rate Limits & Constraints

| Constraint | Value |
|-----------|-------|
| Max input length | 50,000 characters |
| Max tokens per chunk | 512 tokens |
| Chunk overlap | Sentence-boundary aware |
| Model memory | ~1.5 GB RAM |
| Inference time (typical) | 100–500ms per document |
| Concurrency | Cloud Run auto-scaling (0 → N instances) |
| Cold start | ~15–30s (model download from GCS) |

---

## 9. Example Workflows

### Single Document Analysis (cURL)

```bash
curl -X POST "https://ecc-model-host-636663078359.me-central1.run.app/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "## Password Policy\n\nAll users must use passwords of at least 12 characters with uppercase, lowercase, digits, and special characters. Passwords expire every 90 days. Accounts lock after 5 failed attempts.",
    "threshold": 0.6
  }'
```

### Health Check (cURL)

```bash
curl "https://ecc-model-host-636663078359.me-central1.run.app/health"
```

### Frontend Integration (JavaScript)

```javascript
const response = await fetch('/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: policyText,
    threshold: 0.6,
  }),
});

const result = await response.json();
// result.overall_compliance → "Fully Compliant" | "Partially Compliant" | "Non-Compliant"
// result.password_policy.gaps_detected → ["GAP_PP_001", ...]
// result.risk_assessment.score → 85.0
```

### Interactive API Docs

FastAPI auto-generates OpenAPI (Swagger) docs:
- **Swagger UI:** `{BASE_URL}/docs`
- **ReDoc:** `{BASE_URL}/redoc`
- **OpenAPI JSON:** `{BASE_URL}/openapi.json`
