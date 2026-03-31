"""
Quick local sanity check — run BEFORE Docker/Cloud deployment.

Usage:
    python test_local.py

Requires the model files in ./gap-detector-deploy/ (or ./policy_gap_detector/).
"""

import json
import torch
from safetensors.torch import load_file as load_safetensors_file
from transformers import BertConfig, BertTokenizer, BertModel
import torch.nn as nn


# Must match the training notebook
class GapDetectionModel(nn.Module):
    def __init__(self, model_source="bert-base-multilingual-cased",
                 num_gaps=16, dropout_rate=0.3):
        super().__init__()
        self.bert = BertModel(BertConfig.from_pretrained(model_source))
        hidden_size = self.bert.config.hidden_size
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, num_gaps),
        )

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.pooler_output
        return self.classifier(pooled)


GAP_LABELS = [
    "GAP_PP_001", "GAP_PP_002", "GAP_PP_003", "GAP_PP_004",
    "GAP_PP_005", "GAP_PP_006", "GAP_PP_007", "GAP_PP_008",
    "GAP_RA_001", "GAP_RA_002", "GAP_RA_003", "GAP_RA_004",
    "GAP_RA_005", "GAP_RA_006", "GAP_RA_007", "GAP_RA_008",
]

# Try both possible model directories
import os
MODEL_PATH = "./policy_gap_detector"
if not os.path.exists(os.path.join(MODEL_PATH, "config.json")):
    MODEL_PATH = "./gap-detector-deploy"
if not os.path.exists(os.path.join(MODEL_PATH, "config.json")):
    MODEL_PATH = "../policy_gap_detector"

print(f"Loading model from {MODEL_PATH} …")

with open(os.path.join(MODEL_PATH, "config.json"), "r", encoding="utf-8") as f:
    config = json.load(f)


def resolve_model_source(config: dict) -> str:
    for key in ("model_name", "_name_or_path", "base_model_name_or_path"):
        value = config.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return "bert-base-multilingual-cased"


def load_gap_model_weights(model_dir: str):
    safetensors_path = os.path.join(model_dir, "model.safetensors")
    pytorch_path = os.path.join(model_dir, "model.pt")
    if os.path.exists(safetensors_path):
        return load_safetensors_file(safetensors_path, device="cpu")
    if os.path.exists(pytorch_path):
        return torch.load(pytorch_path, map_location="cpu")
    raise FileNotFoundError(
        f"No model weights found in {model_dir}. Expected model.safetensors or model.pt"
    )


def extract_model_state_dict(checkpoint):
    if not checkpoint:
        raise ValueError("Checkpoint is empty")
    for key in ("state_dict", "model_state_dict", "model"):
        value = checkpoint.get(key) if isinstance(checkpoint, dict) else None
        if isinstance(value, dict) and value:
            return value
    return checkpoint


def normalize_state_dict_keys(state_dict):
    normalized = {}
    for key, value in state_dict.items():
        new_key = key
        if new_key.startswith("module."):
            new_key = new_key[len("module."):]
        new_key = new_key.replace(".gamma", ".weight")
        new_key = new_key.replace(".beta", ".bias")
        normalized[new_key] = value
    return normalized


def validate_gap_checkpoint(state_dict):
    expected_head = {
        "classifier.0.weight": (256, 768),
        "classifier.0.bias": (256,),
        "classifier.3.weight": (len(GAP_LABELS), 256),
        "classifier.3.bias": (len(GAP_LABELS),),
    }
    missing = [key for key in expected_head if key not in state_dict]
    if missing:
        old_classifier_shape = tuple(state_dict["classifier.weight"].shape) if "classifier.weight" in state_dict else None
        raise ValueError(
            "Uploaded model artifact does not match GapDetectionModel. "
            f"Missing expected keys: {missing}. "
            f"Detected legacy classifier.weight shape: {old_classifier_shape}."
        )
    for key, expected_shape in expected_head.items():
        actual_shape = tuple(state_dict[key].shape)
        if actual_shape != expected_shape:
            raise ValueError(
                f"Incompatible checkpoint for {key}: got {actual_shape}, expected {expected_shape}."
            )

tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = GapDetectionModel(
    model_source=resolve_model_source(config),
    num_gaps=config.get("num_gaps", len(GAP_LABELS)),
    dropout_rate=config.get("dropout_rate", 0.3),
)
state_dict = load_gap_model_weights(MODEL_PATH)
state_dict = extract_model_state_dict(state_dict)
state_dict = normalize_state_dict_keys(state_dict)
validate_gap_checkpoint(state_dict)
model.load_state_dict(state_dict)
model.eval()

# --- Test samples ---
samples = [
    ("Compliant PP", "The organization requires passwords of at least 12 characters with MFA for all remote access. Passwords expire every 90 days with history of 12. PAM solution enforces least privilege."),
    ("Weak PP", "Users should use passwords. No specific length or complexity required. No lockout policy."),
    ("Arabic PP", "يجب أن تتكون كلمة المرور من 12 حرفاً على الأقل مع المصادقة متعددة العوامل"),
    ("Risk mgmt", "The organization lacks a formal risk assessment methodology. No risk register is maintained."),
]

print("\n" + "=" * 70)
print("ISO Policy Gap Detection — Local Test")
print("=" * 70)

for label, text in samples:
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding="max_length")
    with torch.no_grad():
        logits = model(inputs["input_ids"], inputs["attention_mask"])
        probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()

    detected = [(GAP_LABELS[i], round(float(probs[i]), 3)) for i in range(len(GAP_LABELS)) if probs[i] >= 0.5]
    print(f"\n[{label}]")
    print(f"  Text:     {text[:80]}{'…' if len(text) > 80 else ''}")
    print(f"  Detected: {len(detected)} gaps")
    for gap_id, conf in detected:
        print(f"    {gap_id}: {conf:.1%}")
    if not detected:
        print(f"    No gaps (all < 0.5)")

print("\n" + "=" * 70)
print("✓ Model loads and runs correctly. Ready for deployment.")
print("=" * 70)
