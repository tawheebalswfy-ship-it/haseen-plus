"""Export the trained gap detector checkpoint for monorepo deployment.

Usage:
        python ml/scripts/export_gap_detector.py

Optional environment variables:
    - GAP_CHECKPOINT_PATH: override the source checkpoint path
    - GAP_EXPORT_DIR: override the export directory

The default export location is:
    - ml/models/policy-gap-detector/
"""

from __future__ import annotations

import os
import json
from pathlib import Path

import torch
import torch.nn as nn
from safetensors.torch import save_file as save_safetensors_file
from transformers import BertModel, BertTokenizer


MODEL_NAME = "bert-base-multilingual-cased"
NUM_GAPS = 16
DROPOUT_RATE = 0.3
SCRIPT_DIR = Path(__file__).resolve().parent
ML_ROOT = SCRIPT_DIR.parent
EXPORT_DIR = Path(
    os.getenv("GAP_EXPORT_DIR", str(ML_ROOT / "models" / "policy-gap-detector"))
)


class GapDetectionModel(nn.Module):
    def __init__(
        self,
        model_name: str = MODEL_NAME,
        num_gaps: int = NUM_GAPS,
        dropout_rate: float = DROPOUT_RATE,
    ):
        super().__init__()
        self.bert = BertModel.from_pretrained(model_name)
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


def resolve_checkpoint_path() -> Path:
    override = os.getenv("GAP_CHECKPOINT_PATH")
    if override:
        return Path(override)

    candidates = [
        Path.cwd() / "gap_model_best.pt",
        SCRIPT_DIR / "gap_model_best.pt",
        ML_ROOT / "models" / "gap_model_best.pt",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0]


def main() -> None:
    checkpoint_path = resolve_checkpoint_path()

    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Missing trained checkpoint: {checkpoint_path}. "
            "Set GAP_CHECKPOINT_PATH or run the training notebook export step first."
        )

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
    model = GapDetectionModel()

    state_dict = torch.load(checkpoint_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    export_state_dict = model.state_dict()
    save_safetensors_file(export_state_dict, str(EXPORT_DIR / "model.safetensors"))
    torch.save(export_state_dict, EXPORT_DIR / "model.pt")
    tokenizer.save_pretrained(EXPORT_DIR)

    config = {
        "model_name": MODEL_NAME,
        "num_gaps": NUM_GAPS,
        "dropout_rate": DROPOUT_RATE,
        "model_type": "gap_detection_multilabel",
    }
    with open(EXPORT_DIR / "config.json", "w", encoding="utf-8") as file:
        json.dump(config, file, ensure_ascii=False, indent=2)

    print(f"Exported gap detector to {EXPORT_DIR}/")
    for path in sorted(EXPORT_DIR.iterdir()):
        if path.is_file():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"  {path.name}: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()