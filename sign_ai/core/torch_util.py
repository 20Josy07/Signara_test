"""Utilidades PyTorch ligeras (sin torch-geometric)."""

import os

import torch


def compile_model(model):
    """torch.compile consume RAM extra; desactivado por defecto en Render."""
    if os.getenv("SIGNARA_COMPILE", "0") != "1":
        return model
    try:
        return torch.compile(model)
    except Exception as exc:
        print(f"torch.compile no disponible: {exc}")
        return model


def load_state_dict(path: str) -> dict:
    state = torch.load(path, map_location="cpu", weights_only=True)
    if isinstance(state, dict) and "state_dict" in state:
        return state["state_dict"]
    return state


def detect_model_type(state: dict, hinted: str | None = None) -> str:
    if hinted in ("GCN+LSTM", "GAT+Transformer"):
        return hinted
    if any(k.startswith("backbone.") for k in state):
        return "GAT+Transformer"
    return "GCN+LSTM"
