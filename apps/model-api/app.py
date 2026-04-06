"""
ISO Policy Gap Detector — FastAPI Inference Service

Serves a multi-label gap detection model:
  mBERT → 16 sigmoid outputs (one per compliance gap)

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
from transformers import BertConfig, BertTokenizer, BertModel
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

GAP_LABELS = [
    "GAP_PP_001", "GAP_PP_002", "GAP_PP_003", "GAP_PP_004",
    "GAP_PP_005", "GAP_PP_006", "GAP_PP_007", "GAP_PP_008",
    "GAP_RA_001", "GAP_RA_002", "GAP_RA_003", "GAP_RA_004",
    "GAP_RA_005", "GAP_RA_006", "GAP_RA_007", "GAP_RA_008",
]

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

SEVERITY_WEIGHTS = {
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
tokenizer: BertTokenizer | None = None
gap_model: nn.Module | None = None
model_config: dict | None = None


# ---------------------------------------------------------------------------
# Model Architecture (must match training notebook)
# ---------------------------------------------------------------------------
class GapDetectionModel(nn.Module):
    """
    Multi-label gap detection model (Enhanced).
    mBERT backbone (partially frozen) + wider classification head.
    """

    def __init__(
        self,
        model_source: str = "bert-base-multilingual-cased",
        num_gaps: int = 16,
        dropout_rate: float = 0.4,
        freeze_layers: int = 8,
    ):
        super().__init__()
        bert_config = BertConfig.from_pretrained(model_source)
        self.bert = BertModel(bert_config)
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

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.pooler_output  # [CLS] token, shape: (batch, 768)
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
    return "bert-base-multilingual-cased"


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


def validate_gap_checkpoint(state_dict: dict[str, torch.Tensor]) -> None:
    """Fail fast with a useful error if the uploaded artifact is not the gap detector."""
    # Enhanced model head: 768→512→256→16
    expected_head = {
        "classifier.0.weight": (512, 768),
        "classifier.0.bias": (512,),
        "classifier.1.weight": (512,),        # BatchNorm1d
        "classifier.1.bias": (512,),           # BatchNorm1d
        "classifier.4.weight": (256, 512),
        "classifier.4.bias": (256,),
        "classifier.7.weight": (len(GAP_LABELS), 256),
        "classifier.7.bias": (len(GAP_LABELS),),
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
    """Detect which policy domains are discussed in the document text.

    Password-policy detection requires 1+ keyword match (primary domain).
    Risk-assessment detection requires 2+ *distinct* keyword matches to
    prevent false triggers from casual mentions like
    "No risk assessment performed."
    """
    lower = text.lower()
    domains: list[str] = []
    if any(kw in lower for kw in _PP_KEYWORDS):
        domains.append("password_policy")
    ra_hits = sum(1 for kw in _RA_KEYWORDS if kw in lower)
    if ra_hits >= 2:
        domains.append("risk_assessment")
    return domains


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
    return {gap: round(float(probs[i]), 4) for i, gap in enumerate(GAP_LABELS)}


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
    domain_weight_total = sum(SEVERITY_WEIGHTS[g] for g in gap_ids)
    weighted_penalty = sum(
        SEVERITY_WEIGHTS[g] * float(aggregated[g]["probability"])
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
                "description": GAP_DESCRIPTIONS[g],
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
    for gap_id in GAP_LABELS:
        max_prob = max(cr[gap_id] for cr in chunk_results)
        gap_threshold = per_label_thresholds.get(gap_id, threshold)
        aggregated[gap_id] = {
            "probability": round(max_prob, 4),
            "detected": max_prob >= gap_threshold,
        }

    # 4. Detect applicable domains and build report only for those domains
    domains = detect_domains(text)
    pp_applicable = "password_policy" in domains or len(domains) == 0
    ra_applicable = "risk_assessment" in domains or len(domains) == 0

    password_policy = build_domain_result(GAP_LABELS[:8], aggregated, pp_applicable)
    risk_assessment = build_domain_result(GAP_LABELS[8:], aggregated, ra_applicable)

    pp_gaps = password_policy["gaps_detected"]
    ra_gaps = risk_assessment["gaps_detected"]
    all_gaps = pp_gaps + ra_gaps

    # Compliance level (derived from gap count)
    if len(all_gaps) == 0:
        compliance = "compliant"
    elif len(all_gaps) >= 6:
        compliance = "non_compliant"
    else:
        compliance = "partially_compliant"

    # Overall score: confidence-weighted penalty across applicable domains only
    applicable_gaps = []
    if pp_applicable:
        applicable_gaps.extend(GAP_LABELS[:8])
    if ra_applicable:
        applicable_gaps.extend(GAP_LABELS[8:])

    total_weight = sum(SEVERITY_WEIGHTS[g] for g in applicable_gaps) or 1
    weighted_penalty = sum(
        SEVERITY_WEIGHTS[g] * float(aggregated[g]["probability"])
        for g in all_gaps
    )
    score = round(max(0.0, 1.0 - weighted_penalty / total_weight), 4)

    return {
        "overall_compliance": compliance,
        "overall_score": score,
        "gap_count": len(all_gaps),
        "num_chunks": len(chunks),
        "domains_detected": domains,
        "password_policy": password_policy,
        "risk_assessment": risk_assessment,
        "all_gap_probabilities": {
            g: aggregated[g]["probability"] for g in GAP_LABELS
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

    # Load tokenizer
    logger.info("Loading tokenizer from %s …", MODEL_PATH)
    tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
    logger.info("Tokenizer loaded ✓")

    # Load gap detection model
    logger.info("Loading gap detection model…")
    gap_model = GapDetectionModel(
        model_source=resolve_model_source(model_config),
        num_gaps=model_config.get("num_gaps", len(GAP_LABELS)),
        dropout_rate=model_config.get("dropout_rate", 0.3),
    )
    state_dict = load_gap_model_weights(MODEL_PATH)
    state_dict = extract_model_state_dict(state_dict)
    state_dict = normalize_state_dict_keys(state_dict)
    validate_gap_checkpoint(state_dict)
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
        model_config.get("num_gaps", len(GAP_LABELS)),
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


class AnalyzeResponse(BaseModel):
    overall_compliance: str
    overall_score: float
    gap_count: int
    num_chunks: int
    inference_time_ms: float
    domains_detected: list[str]
    password_policy: DomainResult
    risk_assessment: DomainResult
    all_gap_probabilities: dict[str, float]


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
        num_gaps=len(GAP_LABELS),
        gap_labels=GAP_LABELS,
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
