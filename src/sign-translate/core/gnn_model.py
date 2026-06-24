"""GAT + Transformer ligero con grafo manos + cara para LSC en tiempo real."""

import os

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv, global_mean_pool

HAND_LANDMARKS_PER_HAND = 21
HAND_TOTAL_NODES = HAND_LANDMARKS_PER_HAND * 2

# Subconjunto de la malla facial MediaPipe (468 puntos → ~46 clave)
FACE_IDX_RAW = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
    291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324,
    33, 133, 159, 145, 153, 154, 155, 246, 161,
    160, 158, 157, 173, 144,
    70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
]
FACE_IDX = list(dict.fromkeys(FACE_IDX_RAW))
FACE_TOTAL_NODES = len(FACE_IDX)

N_NODES = HAND_TOTAL_NODES + FACE_TOTAL_NODES
N_FEATURES = 4
SEQ_LEN = 15

NODE_TYPE_HAND_L = 0.0
NODE_TYPE_HAND_R = 1.0
NODE_TYPE_FACE = 2.0

COMPACT_HAND_DIM = HAND_LANDMARKS_PER_HAND * 3 * 2
COMPACT_FACE_DIM = FACE_TOTAL_NODES * 3
COMPACT_DIM = COMPACT_HAND_DIM + COMPACT_FACE_DIM

HIDDEN_CH = 32
OUT_CH = 32
GAT_HEADS = 2
TRANS_LAYERS = 1
TRANS_HEADS = 2
TRANS_FF_DIM = 128


def create_edge_index(num_nodes=N_NODES):
    """Grafos completos dentro del bloque de manos y dentro del bloque de cara."""
    edges = []

    hand_end = HAND_TOTAL_NODES
    for i in range(hand_end):
        for j in range(i + 1, hand_end):
            edges += [[i, j], [j, i]]

    face_start = hand_end
    face_end = face_start + FACE_TOTAL_NODES
    for i in range(face_start, face_end):
        for j in range(i + 1, face_end):
            edges += [[i, j], [j, i]]

    return torch.tensor(edges, dtype=torch.long).t().contiguous()


def compute_edge_attr_batch(pos, edge_index, num_nodes=N_NODES):
    """pos: [G*V, 3] → edge_attr: [G*E, 3]."""
    src, dst = edge_index
    num_graphs = pos.size(0) // num_nodes
    pos_g = pos.view(num_graphs, num_nodes, 3)
    diff = pos_g[:, src] - pos_g[:, dst]
    dist = torch.norm(diff, p=2, dim=2, keepdim=True)
    angle = torch.atan2(diff[:, :, 1], diff[:, :, 0]).unsqueeze(2)
    speed = torch.zeros_like(dist)
    attr = torch.cat([dist, angle, speed], dim=2)
    return attr.reshape(num_graphs * edge_index.size(1), 3)


class HandFaceGAT(nn.Module):
    def __init__(
        self,
        in_feats=N_FEATURES,
        hidden=HIDDEN_CH,
        out_feats=OUT_CH,
        heads=GAT_HEADS,
        dropout=0.2,
    ):
        super().__init__()
        self.dropout = dropout
        self.gat = GATConv(
            in_channels=in_feats,
            out_channels=hidden,
            heads=heads,
            concat=True,
            dropout=dropout,
            edge_dim=3,
        )
        self.proj = nn.Linear(hidden * heads, out_feats)

    def forward(self, x, edge_index, edge_attr, batch):
        x = self.gat(x, edge_index, edge_attr)
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = self.proj(x)
        return global_mean_pool(x, batch)


class SignLanguageModel(nn.Module):
    def __init__(
        self,
        num_classes=100,
        seq_len=SEQ_LEN,
        use_transformer=True,
        ctc=False,
    ):
        super().__init__()
        self.seq_len = seq_len
        self.num_classes = num_classes
        self.use_transformer = use_transformer
        self.ctc = ctc

        self.backbone = HandFaceGAT()
        self.backbone_out = OUT_CH

        if use_transformer:
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=self.backbone_out,
                nhead=TRANS_HEADS,
                dim_feedforward=TRANS_FF_DIM,
                dropout=0.1,
                activation="gelu",
                batch_first=True,
            )
            self.temp_encoder = nn.TransformerEncoder(encoder_layer, num_layers=TRANS_LAYERS)
            self.temporal_out = self.backbone_out
        else:
            self.lstm = nn.LSTM(self.backbone_out, hidden_size=64, batch_first=True)
            self.temporal_out = 64

        self.dropout = nn.Dropout(0.5)
        self.classifier = nn.Linear(self.temporal_out, num_classes)

    def forward(self, x, edge_index, batch):
        xyz = x[:, :3]
        edge_attr = compute_edge_attr_batch(xyz, edge_index)
        feat = self.backbone(x, edge_index, edge_attr, batch)
        feat = feat.view(-1, self.seq_len, self.backbone_out)

        if self.use_transformer:
            out_seq = self.temp_encoder(feat)
            if self.ctc:
                return self.classifier(out_seq)
            last = self.dropout(out_seq[:, -1, :])
            return self.classifier(last)

        lstm_out, _ = self.lstm(feat)
        if self.ctc:
            return self.classifier(lstm_out)
        last = self.dropout(lstm_out[:, -1, :])
        return self.classifier(last)


_BATCH_CACHE: dict[tuple, torch.Tensor] = {}


def build_batch_index(batch_size, seq_len=SEQ_LEN, num_nodes=N_NODES, device=None):
    device = device or torch.device("cpu")
    key = (batch_size, seq_len, num_nodes, str(device))
    cached = _BATCH_CACHE.get(key)
    if cached is not None:
        return cached
    batch = torch.repeat_interleave(
        torch.repeat_interleave(torch.arange(batch_size, device=device), seq_len * num_nodes),
        num_nodes,
    )
    _BATCH_CACHE[key] = batch
    return batch


def predict_proba(model, edge_index, gnn_seq, device=None, batch_index=None, seq_len=SEQ_LEN):
    """Inferencia sobre una secuencia (seq_len, N_NODES, 4)."""
    device = device or next(model.parameters()).device
    model.eval()
    x = torch.as_tensor(gnn_seq, dtype=torch.float32).reshape(-1, N_FEATURES).to(device)
    batch = batch_index if batch_index is not None else build_batch_index(1, seq_len=seq_len, device=device)
    edge = edge_index.to(device)
    with torch.inference_mode():
        logits = model(x, edge, batch)
        probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
    order = np.argsort(probs)[::-1]
    return probs, order


def compile_model(model):
    if os.getenv("SIGNARA_COMPILE", "1") == "0":
        return model
    try:
        return torch.compile(model)
    except Exception as exc:
        print(f"⚠  torch.compile no disponible: {exc}")
        return model


def get_model(num_classes=100, seq_len=SEQ_LEN, use_transformer=True, ctc=False):
    return SignLanguageModel(
        num_classes=num_classes,
        seq_len=seq_len,
        use_transformer=use_transformer,
        ctc=ctc,
    )
