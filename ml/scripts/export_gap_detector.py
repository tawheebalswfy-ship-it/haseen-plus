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
from transformers import AutoModel, AutoTokenizer


MODEL_NAME = "microsoft/mdeberta-v3-base"
NUM_GAPS = 16
# These defaults are overridden at runtime from the saved config.json
DROPOUT_RATE = 0.4
FREEZE_LAYERS = 8
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
        freeze_layers: int = FREEZE_LAYERS,
    ):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        hidden_size = self.bert.config.hidden_size

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
        pooled = self.mean_pooling(outputs.last_hidden_state, attention_mask)
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

    # Try to load config from the notebook's save directory
    saved_config_path = checkpoint_path.parent / "config.json"
    dropout_rate = DROPOUT_RATE
    freeze_layers = FREEZE_LAYERS
    saved_config = {}
    if saved_config_path.exists():
        with open(saved_config_path, "r", encoding="utf-8") as f:
            saved_config = json.load(f)
        dropout_rate = saved_config.get("dropout_rate", DROPOUT_RATE)
        freeze_layers = saved_config.get("freeze_layers", FREEZE_LAYERS)
        print(f"Loaded config from {saved_config_path}")
        print(f"  dropout_rate={dropout_rate}, freeze_layers={freeze_layers}")

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = GapDetectionModel(
        dropout_rate=dropout_rate,
        freeze_layers=freeze_layers,
    )

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
        "dropout_rate": dropout_rate,
        "freeze_layers": freeze_layers,
        "hidden_dims": [512, 256],
        "model_type": "gap_detection_multilabel",
    }
    # Merge in training info from saved config
    if saved_config:
        config["optimal_thresholds"] = saved_config.get("optimal_thresholds", {})
        config["threshold"] = saved_config.get("threshold", 0.5)
        config["training_info"] = saved_config.get("training_info", {})

    with open(EXPORT_DIR / "config.json", "w", encoding="utf-8") as file:
        json.dump(config, file, ensure_ascii=False, indent=2)

    print(f"Exported gap detector to {EXPORT_DIR}/")
    for path in sorted(EXPORT_DIR.iterdir()):
        if path.is_file():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"  {path.name}: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()