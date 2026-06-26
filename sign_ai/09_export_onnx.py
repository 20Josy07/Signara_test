#!/usr/bin/env python3
"""
Exporta signara_gnn.pt (GCN+LSTM) a ONNX para despliegue ligero en Render.

Uso (requiere torch local):
    cd sign_ai
    python 09_export_onnx.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import torch

from core.gnn_legacy import GCN_LSTM, LEGACY_SEQ_LEN
from core.sign_constants import LEGACY_HAND_NODES, N_FEATURES

MODEL_PATH = Path("models/signara_gnn.pt")
LABEL_PATH = Path("models/labels_gnn.json")
ONNX_PATH = Path("models/signara_gnn.onnx")


def main() -> int:
    if not MODEL_PATH.exists():
        print(f"No existe {MODEL_PATH}")
        return 1
    if not LABEL_PATH.exists():
        print(f"No existe {LABEL_PATH}")
        return 1

    with open(LABEL_PATH, encoding="utf-8") as f:
        labels = json.load(f)

    state = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]

    model = GCN_LSTM(n_classes=len(labels))
    model.load_state_dict(state)
    model.eval()

    dummy = torch.randn(1, LEGACY_SEQ_LEN, LEGACY_HAND_NODES, N_FEATURES)
    ONNX_PATH.parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        model,
        dummy,
        str(ONNX_PATH),
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )

    size_kb = ONNX_PATH.stat().st_size / 1024
    print(f"Exportado -> {ONNX_PATH} ({size_kb:.1f} KB, {len(labels)} clases)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
