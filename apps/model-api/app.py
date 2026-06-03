"""
ISO Policy Gap Detector — FastAPI Inference Service

Serves a multi-label gap detection model:
  XLM-RoBERTa → 16 sigmoid outputs (one per compliance gap)

Pipeline: Document → Chunk → Per-chunk prediction → Aggregate → Report

Gaps cover two NCA ECC-2:2024 domains:
  - Password Policy (ECC 2-2): GAP_PP_001–008
  - Risk Assessment (ECC 1-5): GAP_RA_001–008

Optimized for CPU deployment (Google Cloud Run).
"""

from __future__ import annotations

import os
import re
import json
import time
import logging
import gc
from pathlib import Path
from contextlib import asynccontextmanager

import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from safetensors.torch import load_file as load_safetensors_file
from transformers import AutoConfig, AutoTokenizer, AutoModel
from google.cloud import storage

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CURRENT_DIR = Path(__file__).resolve().parent


def find_repo_root(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        if (candidate / "apps").exists() and (candidate / "ml").exists():
            return candidate
    return None


def resolve_model_path() -> str:
    configured_path = os.getenv("MODEL_PATH")
    if configured_path:
        return configured_path

    repo_root = find_repo_root(CURRENT_DIR)
    candidates: list[Path] = []
    if repo_root is not None:
        candidates.extend(
            [
                repo_root / "ml" / "models" / "policy-gap-detector",
                repo_root / "ml" / "models" / "policy-compliance-classifier",
            ]
        )

    candidates.append(CURRENT_DIR / "policy_gap_detector")

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return str(candidates[-1])


MODEL_PATH = resolve_model_path()
MAX_LENGTH = 512
API_KEY = os.getenv("API_KEY", "")

DEFAULT_GAP_LABELS = [
    "GAP_PP_001", "GAP_PP_002", "GAP_PP_003", "GAP_PP_004",
    "GAP_PP_005", "GAP_PP_006", "GAP_PP_007", "GAP_PP_008",
    "GAP_RA_001", "GAP_RA_002", "GAP_RA_003", "GAP_RA_004",
    "GAP_RA_005", "GAP_RA_006", "GAP_RA_007", "GAP_RA_008",
]

POLICY_DOMAINS = {
    "password_policy": {
        "prefix": "GAP_PP_",
        "keywords": ["password", "mfa", "multi-factor", "authentication", "lockout", "credential"],
        "fallback_label": "GAP_PP_004",
    },
    "risk_assessment": {
        "prefix": "GAP_RA_",
        "keywords": ["risk assessment", "risk management", "risk register", "likelihood", "impact", "risk"],
        "fallback_label": "GAP_RA_001",
    },
    "access_control": {
        "prefix": "GAP_AC_",
        "keywords": ["access", "access review", "privilege", "permission", "authorization"],
        "fallback_label": "GAP_AC_001",
    },
    "asset_management": {
        "prefix": "GAP_AM_",
        "keywords": ["asset inventory", "asset", "inventory", "classification"],
        "fallback_label": "GAP_AM_001",
    },
    "business_continuity": {
        "prefix": "GAP_BC_",
        "keywords": ["business continuity", "bcp", "continuity", "disaster recovery", "backup"],
        "fallback_label": "GAP_BC_001",
    },
    "data_protection": {
        "prefix": "GAP_DP_",
        "keywords": ["encryption", "encrypt", "data protection", "sensitive data", "data"],
        "fallback_label": "GAP_DP_001",
    },
    "incident_response": {
        "prefix": "GAP_IR_",
        "keywords": ["incident response", "incident", "response plan"],
        "fallback_label": "GAP_IR_001",
    },
    "log_monitoring": {
        "prefix": "GAP_LM_",
        "keywords": ["log monitoring", "logs", "logging", "monitoring", "siem"],
        "fallback_label": "GAP_LM_001",
    },
    "third_party_security": {
        "prefix": "GAP_TP_",
        "keywords": ["third party", "third-party", "vendor", "vendors", "supplier", "suppliers", "vendor assessment"],
        "fallback_label": "GAP_TP_001",
    },
    "vuln_management": {
        "prefix": "GAP_VM_",
        "keywords": ["vulnerability", "vulnerabilities", "vuln", "scan", "patch"],
        "fallback_label": "GAP_VM_001",
    },
}

GAP_DESCRIPTIONS = {
    "GAP_PP_001": "Weak password complexity requirements",
    "GAP_PP_002": "Inadequate password expiration policy",
    "GAP_PP_003": "Weak account lockout policy",
    "GAP_PP_004": "Missing Multi-Factor Authentication (MFA)",
    "GAP_PP_005": "Missing Privileged Access Management (PAM)",
    "GAP_PP_006": "Missing password encryption/storage requirements",
    "GAP_PP_007": "Missing periodic review schedule (password policy)",
    "GAP_PP_008": "Missing or vague roles and responsibilities (password policy)",
    "GAP_RA_001": "Missing documented risk methodology",
    "GAP_RA_002": "Missing risk identification procedures",
    "GAP_RA_003": "Missing likelihood/impact assessment scales",
    "GAP_RA_004": "Missing risk treatment options",
    "GAP_RA_005": "Missing mandatory risk assessment triggers",
    "GAP_RA_006": "Missing risk register requirements",
    "GAP_RA_007": "Missing periodic review schedule (risk assessment)",
    "GAP_RA_008": "Missing integration with project management",
}

DEFAULT_GAP_DESCRIPTIONS = GAP_DESCRIPTIONS

DEFAULT_SEVERITY_WEIGHTS = {
    "GAP_PP_001": 3, "GAP_PP_002": 2, "GAP_PP_003": 2, "GAP_PP_004": 4,
    "GAP_PP_005": 4, "GAP_PP_006": 3, "GAP_PP_007": 2, "GAP_PP_008": 2,
    "GAP_RA_001": 4, "GAP_RA_002": 3, "GAP_RA_003": 3, "GAP_RA_004": 3,
    "GAP_RA_005": 4, "GAP_RA_006": 2, "GAP_RA_007": 2, "GAP_RA_008": 2,
}

# GCS Configuration
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "model-files33")
GCS_MODEL_PREFIX = os.getenv("GCS_MODEL_PREFIX", "policy_gap_detector/")
FALLBACK_GCS_PREFIXES = ["policy_gap_detector/", "checkpoint-505/"]

# ---------------------------------------------------------------------------
# Global model / tokenizer (loaded once at startup)
# ---------------------------------------------------------------------------
tokenizer: AutoTokenizer | None = None
gap_model: nn.Module | None = None
model_config: dict | None = None


# ---------------------------------------------------------------------------
# Model Architecture (must match training notebook)
# ---------------------------------------------------------------------------
class GapDetectionModel(nn.Module):
    """
    Multi-label gap detection model (Enhanced).
    XLM-RoBERTa backbone (partially frozen) + wider classification head.
    """

    def __init__(
        self,
        model_source: str = "xlm-roberta-base",
        num_gaps: int = 16,
        dropout_rate: float = 0.4,
        freeze_layers: int = 8,
    ):
        super().__init__()
        bert_config = AutoConfig.from_pretrained(model_source)
        self.bert = AutoModel.from_config(bert_config)
        hidden_size = self.bert.config.hidden_size  # 768

        # Freeze embeddings + lower encoder layers
        for param in self.bert.embeddings.parameters():
            param.requires_grad = False
        for i in range(freeze_layers):
            for param in self.bert.encoder.layer[i].parameters():
                param.requires_grad = False

        # Wider classifier head: 768→512→256→num_gaps
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, num_gaps),
        )

    def mean_pooling(self, last_hidden_state, attention_mask):
        mask_expanded = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
        sum_embeddings = torch.sum(last_hidden_state * mask_expanded, dim=1)
        sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
        return sum_embeddings / sum_mask

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = self.mean_pooling(outputs.last_hidden_state, attention_mask)  # (batch, 768)
        logits = self.classifier(pooled)  # shape: (batch, 16)
        return logits  # raw logits — apply sigmoid at inference


# ---------------------------------------------------------------------------
# GCS Download
# ---------------------------------------------------------------------------
def _has_local_model_files(model_dir: Path) -> bool:
    return (
        (model_dir / "config.json").exists()
        and ((model_dir / "model.safetensors").exists() or (model_dir / "model.pt").exists())
    )


def download_model_from_gcs():
    """Download model files from GCS bucket if not present locally."""
    model_dir = Path(MODEL_PATH)

    if model_dir.exists() and _has_local_model_files(model_dir):
        logger.info("Model already exists locally at %s", MODEL_PATH)
        return

    model_dir.mkdir(parents=True, exist_ok=True)

    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET_NAME)

    prefixes_to_try: list[str] = []
    for prefix in ["policy_gap_detector/", GCS_MODEL_PREFIX, *FALLBACK_GCS_PREFIXES]:
        if prefix and prefix not in prefixes_to_try:
            prefixes_to_try.append(prefix)

    logger.info("GCS model search order: %s", prefixes_to_try)

    for prefix in prefixes_to_try:
        logger.info("Downloading model from gs://%s/%s", GCS_BUCKET_NAME, prefix)
        blobs = list(bucket.list_blobs(prefix=prefix))
        downloaded = 0

        for blob in blobs:
            if blob.name.endswith("/"):
                continue
            relative = blob.name[len(prefix):]
            if not relative:
                continue
            local = model_dir / relative
            local.parent.mkdir(parents=True, exist_ok=True)
            size_mb = blob.size / (1024 * 1024) if blob.size else 0
            logger.info("Downloading %s (%.2f MB)", blob.name, size_mb)
            blob.download_to_filename(str(local))
            downloaded += 1

        if downloaded > 0 and _has_local_model_files(model_dir):
            logger.info("Downloaded %d files from GCS ✓", downloaded)
            return

        logger.warning("No usable model files found in GCS at %s", prefix)

    raise FileNotFoundError(
        f"No model files found in gs://{GCS_BUCKET_NAME}/{GCS_MODEL_PREFIX} or fallback prefixes"
    )


def resolve_model_source(config: dict) -> str:
    """Resolve the BERT backbone source from model config with safe fallbacks."""
    for key in ("model_name", "_name_or_path", "base_model_name_or_path"):
        value = config.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return "xlm-roberta-base"


def load_gap_model_weights(model_dir: str) -> dict[str, torch.Tensor]:
    """Load model weights from either safetensors or a PyTorch checkpoint."""
    safetensors_path = os.path.join(model_dir, "model.safetensors")
    pytorch_path = os.path.join(model_dir, "model.pt")

    if os.path.exists(safetensors_path):
        logger.info("Loading weights from %s", safetensors_path)
        return load_safetensors_file(safetensors_path, device="cpu")
    if os.path.exists(pytorch_path):
        logger.info("Loading weights from %s", pytorch_path)
        try:
            return torch.load(
                pytorch_path,
                map_location="cpu",
                mmap=True,
                weights_only=True,
            )
        except TypeError:
            try:
                return torch.load(
                    pytorch_path,
                    map_location="cpu",
                    weights_only=True,
                )
            except TypeError:
                return torch.load(pytorch_path, map_location="cpu")

    raise FileNotFoundError(
        f"No model weights found in {model_dir}. Expected model.safetensors or model.pt"
    )


def extract_model_state_dict(checkpoint: dict[str, torch.Tensor] | dict) -> dict[str, torch.Tensor]:
    """Handle raw state dicts as well as wrapped checkpoints."""
    if not checkpoint:
        raise ValueError("Checkpoint is empty")

    for key in ("state_dict", "model_state_dict", "model"):
        value = checkpoint.get(key) if isinstance(checkpoint, dict) else None
        if isinstance(value, dict) and value:
            return value

    return checkpoint


def normalize_state_dict_keys(state_dict: dict[str, torch.Tensor]) -> dict[str, torch.Tensor]:
    """Convert legacy/TensorFlow-style parameter names to PyTorch names."""
    normalized: dict[str, torch.Tensor] = {}

    for key, value in state_dict.items():
        new_key = key
        if new_key.startswith("module."):
            new_key = new_key[len("module."):]
        new_key = new_key.replace(".gamma", ".weight")
        new_key = new_key.replace(".beta", ".bias")
        normalized[new_key] = value

    return normalized


def get_config_gap_labels(config: dict | None) -> list[str]:
    labels = config.get("gap_labels") if config else None
    if isinstance(labels, list) and labels and all(isinstance(label, str) for label in labels):
        return labels
    return DEFAULT_GAP_LABELS


def get_model_gap_labels() -> list[str]:
    return get_config_gap_labels(model_config)


def get_domain_gap_ids(domain: str) -> list[str]:
    if model_config:
        domain_groups = model_config.get("domain_groups")
        if isinstance(domain_groups, dict):
            labels = domain_groups.get(domain)
            if isinstance(labels, list) and all(isinstance(label, str) for label in labels):
                return labels

    domain_config = POLICY_DOMAINS.get(domain)
    if domain_config:
        prefix = domain_config["prefix"]
        matching = [label for label in get_model_gap_labels() if label.startswith(prefix)]
        if matching:
            return matching

    if domain == "password_policy":
        return DEFAULT_GAP_LABELS[:8]
    if domain == "risk_assessment":
        return DEFAULT_GAP_LABELS[8:]
    return []


def get_gap_description(gap_id: str) -> str:
    if model_config:
        descriptions = model_config.get("gap_descriptions")
        if isinstance(descriptions, dict):
            description = descriptions.get(gap_id)
            if isinstance(description, str):
                return description
    return DEFAULT_GAP_DESCRIPTIONS.get(gap_id, gap_id)


def get_gap_domain(gap_id: str) -> str:
    for domain, domain_config in POLICY_DOMAINS.items():
        if gap_id.startswith(domain_config["prefix"]):
            return domain
    if gap_id.startswith("GAP_PP_"):
        return "password_policy"
    if gap_id.startswith("GAP_RA_"):
        return "risk_assessment"
    return "unknown"


def get_gap_severity(gap_id: str) -> str:
    weight = get_severity_weight(gap_id)
    if weight >= 4:
        return "high"
    if weight >= 2:
        return "medium"
    return "low"


def get_gap_recommendation(gap_id: str) -> str:
    domain = get_gap_domain(gap_id).replace("_", " ")
    return f"Implement and document controls for {domain}: {get_gap_description(gap_id)}."


def get_severity_weight(gap_id: str) -> int:
    return DEFAULT_SEVERITY_WEIGHTS.get(gap_id, 1)


def validate_gap_checkpoint(state_dict: dict[str, torch.Tensor], expected_num_gaps: int) -> None:
    """Fail fast with a useful error if the uploaded artifact is not the gap detector."""
    # Enhanced model head: 768→512→256→16
    expected_head = {
        "classifier.0.weight": (512, 768),
        "classifier.0.bias": (512,),
        "classifier.1.weight": (512,),        # BatchNorm1d
        "classifier.1.bias": (512,),           # BatchNorm1d
        "classifier.4.weight": (256, 512),
        "classifier.4.bias": (256,),
        "classifier.7.weight": (expected_num_gaps, 256),
        "classifier.7.bias": (expected_num_gaps,),
    }

    missing = [key for key in expected_head if key not in state_dict]
    if missing:
        old_classifier_shape = tuple(state_dict["classifier.weight"].shape) if "classifier.weight" in state_dict else None
        raise ValueError(
            "Uploaded model artifact does not match GapDetectionModel (Enhanced). "
            f"Missing expected keys: {missing}. "
            f"Detected legacy classifier.weight shape: {old_classifier_shape}. "
            "Upload the exported policy_gap_detector/ folder from the enhanced notebook "
            "(model.pt, config.json, tokenizer.json, tokenizer_config.json, vocab files)."
        )

    for key, expected_shape in expected_head.items():
        actual_shape = tuple(state_dict[key].shape)
        if actual_shape != expected_shape:
            raise ValueError(
                "Uploaded model artifact has incompatible head dimensions for GapDetectionModel. "
                f"Key {key} has shape {actual_shape}, expected {expected_shape}. "
                "Upload the exported policy_gap_detector/ folder from the enhanced gap-detection notebook."
            )


# ---------------------------------------------------------------------------
# Document Chunking
# ---------------------------------------------------------------------------
def chunk_document(
    text: str, max_chunk_words: int = 350, overlap_words: int = 50
) -> list[str]:
    """Split a full document into overlapping chunks by section headings."""
    # Try splitting on headings
    section_pattern = r"(?=\n#{1,4}\s|\n\d+[\.\)]\s|\n[١-٩][\.\-])"
    sections = re.split(section_pattern, text)
    sections = [s.strip() for s in sections if s.strip()]

    # Fallback to paragraphs
    if len(sections) <= 1:
        sections = re.split(r"\n\s*\n", text)
        sections = [s.strip() for s in sections if s.strip()]

    # Merge small sections, split large ones
    chunks: list[str] = []
    current = ""
    for section in sections:
        if len(section.split()) > max_chunk_words:
            if current:
                chunks.append(current)
                current = ""
            words = section.split()
            start = 0
            while start < len(words):
                end = min(start + max_chunk_words, len(words))
                chunks.append(" ".join(words[start:end]))
                start += max_chunk_words - overlap_words
        else:
            combined = (
                (current + "\n\n" + section).strip() if current else section
            )
            if len(combined.split()) > max_chunk_words:
                if current:
                    chunks.append(current)
                current = section
            else:
                current = combined
    if current:
        chunks.append(current)

    # Merge tiny chunks (<20 words) into previous
    final: list[str] = []
    for chunk in chunks:
        if len(chunk.split()) < 20 and final:
            final[-1] += "\n\n" + chunk
        else:
            final.append(chunk)

    return final if final else [text]


# ---------------------------------------------------------------------------
# Domain Detection (keyword heuristic)
# ---------------------------------------------------------------------------
_PP_KEYWORDS = [
    "password", "كلمة المرور", "authentication", "المصادقة",
    "mfa", "multi-factor", "lockout", "قفل الحساب",
    "privileged access", "الوصول المميز", "credential",
]
_RA_KEYWORDS = [
    "risk assessment", "تقييم المخاطر", "risk management",
    "إدارة المخاطر", "risk register", "سجل المخاطر",
    "likelihood", "الاحتمالية", "risk treatment", "معالجة المخاطر",
    "threat identification", "vulnerability assessment", "risk appetite",
]


def detect_domains(text: str) -> list[str]:
    """Detect which policy domains are discussed in the document text."""
    lower = text.lower()
    domains: list[str] = []
    for domain, domain_config in POLICY_DOMAINS.items():
        if any(keyword in lower for keyword in domain_config["keywords"]):
            domains.append(domain)
    return domains


NEGATION_PATTERNS = [
    r"\bno\s+{keyword}\b",
    r"\bno\s+\w+\s+{keyword}\b",
    r"\bdoes\s+not\s+\w*\s*{keyword}\b",
    r"\bdo\s+not\s+\w*\s*{keyword}\b",
    r"\bdoesn't\s+\w*\s*{keyword}\b",
    r"\bwithout\s+{keyword}\b",
    r"\bnot\s+\w*\s*{keyword}\b",
]


def detect_explicit_negative_gaps(text: str, labels: list[str]) -> set[str]:
    """Detect explicit non-compliance statements as a conservative fallback."""
    lower = text.lower()
    label_set = set(labels)
    detected: set[str] = set()

    for domain, domain_config in POLICY_DOMAINS.items():
        matched = False
        for keyword in domain_config["keywords"]:
            escaped = re.escape(keyword)
            if any(re.search(pattern.format(keyword=escaped), lower) for pattern in NEGATION_PATTERNS):
                matched = True
                break
        if not matched:
            continue

        fallback_label = domain_config["fallback_label"]
        if fallback_label in label_set:
            detected.add(fallback_label)
            continue

        domain_labels = get_domain_gap_ids(domain)
        if domain_labels:
            detected.add(domain_labels[0])

    return detected


# ---------------------------------------------------------------------------
# Inference Pipeline
# ---------------------------------------------------------------------------
@torch.no_grad()
def predict_chunk(text: str) -> dict[str, float]:
    """Predict gap probabilities for a single text chunk."""
    inputs = tokenizer(
        text,
        padding="max_length",
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="pt",
    )
    logits = gap_model(inputs["input_ids"], inputs["attention_mask"])
    probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()
    labels = get_model_gap_labels()
    if len(probs) != len(labels):
        raise RuntimeError(
            f"Model output dimension mismatch: got {len(probs)} probabilities for {len(labels)} labels"
        )
    return {gap: round(float(probs[i]), 4) for i, gap in enumerate(labels)}


def build_domain_result(
    gap_ids: list[str],
    aggregated: dict[str, dict[str, float | bool]],
    applicable: bool,
) -> dict:
    if not applicable:
        return {
            "gaps_detected": [],
            "gap_count": 0,
            "score": 1.0,
            "details": [],
        }

    detected_gaps = [g for g in gap_ids if aggregated[g]["detected"]]
    domain_weight_total = sum(get_severity_weight(g) for g in gap_ids)
    weighted_penalty = sum(
        get_severity_weight(g) * float(aggregated[g]["probability"])
        for g in detected_gaps
    )
    domain_score = round(max(0.0, 1.0 - weighted_penalty / domain_weight_total), 4)

    return {
        "gaps_detected": detected_gaps,
        "gap_count": len(detected_gaps),
        "score": domain_score,
        "details": [
            {
                "gap_id": g,
                "description": get_gap_description(g),
                "confidence": aggregated[g]["probability"],
            }
            for g in detected_gaps
        ],
    }


def analyze_document(text: str, threshold: float = 0.6) -> dict:
    """
    Full document analysis pipeline.

    1. Chunk the document into BERT-sized pieces
    2. Run per-chunk gap prediction (16 sigmoid outputs)
    3. Aggregate via max-pooling across chunks
    4. Derive compliance level and domain-level reports

    Uses per-label optimized thresholds from model config when available,
    falling back to the provided threshold parameter.
    """
    # Load per-label thresholds from model config if available
    per_label_thresholds = {}
    if model_config and "optimal_thresholds" in model_config:
        per_label_thresholds = model_config["optimal_thresholds"]

    # 1. Chunk
    chunks = chunk_document(text)

    # 2. Predict per chunk
    chunk_results = [predict_chunk(chunk) for chunk in chunks]

    # 3. Aggregate: max probability across chunks for each gap
    aggregated = {}
    labels = get_model_gap_labels()
    explicit_negative_gaps = detect_explicit_negative_gaps(text, labels)
    for gap_id in labels:
        max_prob = max(cr[gap_id] for cr in chunk_results)
        gap_threshold = per_label_thresholds.get(gap_id, threshold)
        detected = max_prob >= gap_threshold or gap_id in explicit_negative_gaps
        aggregated[gap_id] = {
            "probability": round(max_prob, 4),
            "detected": detected,
            "threshold": round(float(gap_threshold), 4),
            "source": "explicit_negative_text" if gap_id in explicit_negative_gaps and max_prob < gap_threshold else "model",
        }

    top_predictions = sorted(
        ((gap_id, data["probability"], data["threshold"], data["detected"]) for gap_id, data in aggregated.items()),
        key=lambda item: item[1],
        reverse=True,
    )[:10]
    logger.info("Analyze text length=%d preview=%r", len(text), text[:200])
    logger.info("Top gap predictions=%s", top_predictions)

    # 4. Detect applicable domains and build report for all represented domains
    domains = detect_domains(text)
    if not domains:
        domains = sorted({get_gap_domain(gap_id) for gap_id in labels if get_gap_domain(gap_id) != "unknown"})

    domain_results = {
        domain: build_domain_result(get_domain_gap_ids(domain), aggregated, domain in domains)
        for domain in POLICY_DOMAINS
        if get_domain_gap_ids(domain)
    }

    all_gaps = [gap_id for gap_id, data in aggregated.items() if data["detected"]]
    detected_gap_details = [
        {
            "label": gap_id,
            "gap_id": gap_id,
            "domain": get_gap_domain(gap_id),
            "severity": get_gap_severity(gap_id),
            "confidence": aggregated[gap_id]["probability"],
            "recommendation": get_gap_recommendation(gap_id),
            "description": get_gap_description(gap_id),
            "source": aggregated[gap_id]["source"],
        }
        for gap_id in all_gaps
    ]

    # Compliance level (derived from gap count)
    if len(all_gaps) == 0:
        compliance = "compliant"
    elif len(all_gaps) >= 6:
        compliance = "non_compliant"
    else:
        compliance = "partially_compliant"

    simple_gap_score = max(0, 100 - len(all_gaps) * 5)
    if all_gaps:
        score = round(simple_gap_score / 100, 4)
    else:
        score = 1.0

    domains_payload = {
        domain: {
            "gap_count": result["gap_count"],
            "score": result["score"],
            "status": "Needs Attention" if result["gap_count"] else "No Gaps Detected",
            "gaps": result["details"],
        }
        for domain, result in domain_results.items()
        if domain in domains or result["gap_count"] > 0
    }

    return {
        "overall_compliance": compliance,
        "overall_score": score,
        "score": round(score * 100),
        "compliance_score": round(score * 100),
        "compliance_status": "Fully Compliant" if compliance == "compliant" else "Non-Compliant" if compliance == "non_compliant" else "Partially Compliant",
        "gap_count": len(all_gaps),
        "num_chunks": len(chunks),
        "domains_detected": domains,
        "password_policy": domain_results.get("password_policy", build_domain_result([], aggregated, False)),
        "risk_assessment": domain_results.get("risk_assessment", build_domain_result([], aggregated, False)),
        "domains": domains_payload,
        "detected_gaps": detected_gap_details,
        "gaps": detected_gap_details,
        "gap_labels": all_gaps,
        "recommendations": [gap["recommendation"] for gap in detected_gap_details],
        "all_gap_probabilities": {
            g: aggregated[g]["probability"] for g in labels
        },
        "predictions": {
            g: {
                "probability": aggregated[g]["probability"],
                "threshold": aggregated[g]["threshold"],
                "detected": aggregated[g]["detected"],
            }
            for g in labels
        },
    }


# ---------------------------------------------------------------------------
# Startup / Shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, clean up on shutdown."""
    global tokenizer, gap_model, model_config

    start = time.time()

    # Download from GCS if needed
    logger.info("Starting model download from GCS...")
    download_model_from_gcs()
    logger.info("Download completed in %.2f seconds", time.time() - start)

    # Load config
    config_path = os.path.join(MODEL_PATH, "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        model_config = json.load(f)

    configured_labels = get_config_gap_labels(model_config)
    configured_num_gaps = int(model_config.get("num_gaps", len(configured_labels)))
    if configured_num_gaps != len(configured_labels):
        raise ValueError(
            "Model config mismatch: "
            f"num_gaps={configured_num_gaps}, gap_labels={len(configured_labels)}"
        )

    # Load tokenizer
    logger.info("Loading tokenizer from %s …", MODEL_PATH)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    logger.info("Tokenizer loaded ✓")

    # Load gap detection model
    logger.info("Loading gap detection model…")
    gap_model = GapDetectionModel(
        model_source=resolve_model_source(model_config),
        num_gaps=configured_num_gaps,
        dropout_rate=model_config.get("dropout_rate", 0.3),
        freeze_layers=model_config.get("freeze_layers", 8),
    )
    state_dict = load_gap_model_weights(MODEL_PATH)
    state_dict = extract_model_state_dict(state_dict)
    state_dict = normalize_state_dict_keys(state_dict)
    validate_gap_checkpoint(state_dict, configured_num_gaps)
    try:
        gap_model.load_state_dict(state_dict, assign=True)
    except TypeError:
        gap_model.load_state_dict(state_dict)
    del state_dict
    gc.collect()
    gap_model.eval()
    torch.set_grad_enabled(False)

    total = time.time() - start
    logger.info(
        "Model loaded ✓ — %d gap labels — startup: %.2f seconds",
        configured_num_gaps,
        total,
    )

    yield

    # Cleanup
    logger.info("Shutting down …")
    del gap_model, tokenizer, model_config


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ISO Policy Gap Detector",
    description=(
        "Detect compliance gaps in policy documents against NCA ECC-2:2024 "
        "and ISO 27001:2022 using multilingual BERT (16 gap labels)."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API Key dependency
# ---------------------------------------------------------------------------
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify the API key if one is configured."""
    if not API_KEY:
        return  # no key configured → allow (dev mode)
    if not api_key or api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    """Full policy document text for gap analysis."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        examples=[
            "## Password Policy\n\nPasswords must be at least 8 characters long."
        ],
    )
    threshold: float = Field(
        0.6,
        ge=0.0,
        le=1.0,
        description="Probability threshold for gap detection (default 0.6)",
    )


class GapDetail(BaseModel):
    gap_id: str
    description: str
    confidence: float


class DomainResult(BaseModel):
    gaps_detected: list[str]
    gap_count: int
    score: float
    details: list[GapDetail]


class DetectedGap(BaseModel):
    label: str
    gap_id: str
    domain: str
    severity: str
    confidence: float
    recommendation: str
    description: str
    source: str = "model"


class AnalyzeResponse(BaseModel):
    overall_compliance: str
    overall_score: float
    score: int
    compliance_score: int
    compliance_status: str
    gap_count: int
    num_chunks: int
    inference_time_ms: float
    domains_detected: list[str]
    password_policy: DomainResult
    risk_assessment: DomainResult
    domains: dict[str, dict]
    detected_gaps: list[DetectedGap]
    gaps: list[DetectedGap]
    gap_labels: list[str]
    recommendations: list[str]
    all_gap_probabilities: dict[str, float]
    predictions: dict[str, dict]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str
    model_type: str
    num_gaps: int
    gap_labels: list[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["meta"])
def root():
    return {
        "message": "ISO Policy Gap Detector API",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health():
    """Health check — used by Cloud Run readiness probes."""
    return HealthResponse(
        status="healthy" if gap_model is not None else "unhealthy",
        model_loaded=gap_model is not None,
        model_path=MODEL_PATH,
        model_type="gap_detection_multilabel",
        num_gaps=len(get_model_gap_labels()),
        gap_labels=get_model_gap_labels(),
    )


@app.post("/analyze", response_model=AnalyzeResponse, tags=["inference"])
def analyze(req: AnalyzeRequest, _: None = Depends(verify_api_key)):
    """
    Analyze a policy document for compliance gaps.

    Accepts full document text (up to 50 000 chars). The API handles:
    1. Chunking the document into BERT-sized pieces
    2. Running per-chunk multi-label gap detection
    3. Max-pooling aggregation across chunks
    4. Deriving compliance level and domain-level reports

    Returns detected gaps with per-domain breakdown, overall compliance
    level, and score.
    """
    if gap_model is None:
        raise HTTPException(503, "Model not loaded")

    start = time.perf_counter()
    result = analyze_document(req.text, threshold=req.threshold)
    elapsed = (time.perf_counter() - start) * 1000

    return AnalyzeResponse(inference_time_ms=round(elapsed, 2), **result)


# ---------------------------------------------------------------------------
# Run with: uvicorn app:app --host 0.0.0.0 --port 8080
# ---------------------------------------------------------------------------
