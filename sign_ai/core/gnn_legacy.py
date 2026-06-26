"""Modelo GCN+LSTM legado (solo manos, 42 nodos)."""

import numpy as np
import torch
import torch.nn as nn

from core.sign_constants import LEGACY_N_NODES, LEGACY_SEQ_LEN, N_FEATURES

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20),
]


def build_adjacency():
    A = np.zeros((LEGACY_N_NODES, LEGACY_N_NODES), dtype=np.float32)
    for i, j in HAND_CONNECTIONS:
        A[i, j] = 1.0
        A[j, i] = 1.0
        A[i + 21, j + 21] = 1.0
        A[j + 21, i + 21] = 1.0
    A += np.eye(LEGACY_N_NODES, dtype=np.float32)
    D_inv_sqrt = np.diag(1.0 / np.sqrt(np.maximum(A.sum(axis=1), 1e-8)))
    return torch.FloatTensor(D_inv_sqrt @ A @ D_inv_sqrt)


A_HAT = build_adjacency()


class GCNLayer(nn.Module):
    def __init__(self, in_features: int, out_features: int):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)
        self.bn = nn.BatchNorm1d(out_features)
        self.act = nn.ReLU()

    def forward(self, x, a_hat):
        out = torch.bmm(a_hat.unsqueeze(0).expand(x.size(0), -1, -1), x)
        out = self.linear(out)
        b, n, f = out.shape
        out = self.bn(out.view(b * n, f)).view(b, n, f)
        return self.act(out)


class HandGCN(nn.Module):
    def __init__(self):
        super().__init__()
        self.gcn1 = GCNLayer(N_FEATURES, 32)
        self.drop = nn.Dropout(0.3)
        self.gcn2 = GCNLayer(32, 64)

    def forward(self, x, a_hat):
        x = self.gcn1(x, a_hat)
        x = self.drop(x)
        x = self.gcn2(x, a_hat)
        return x.mean(dim=1)


class GCN_LSTM(nn.Module):
    def __init__(self, n_classes: int):
        super().__init__()
        self.register_buffer("A_hat", A_HAT)
        self.gcn = HandGCN()
        self.lstm = nn.LSTM(
            input_size=64,
            hidden_size=128,
            num_layers=2,
            batch_first=True,
            dropout=0.3,
        )
        self.classifier = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, n_classes),
        )

    def forward(self, x):
        batch, seq, nodes, feats = x.shape
        x_flat = x.view(batch * seq, nodes, feats)
        emb = self.gcn(x_flat, self.A_hat)
        emb = emb.view(batch, seq, 64)
        out, _ = self.lstm(emb)
        return self.classifier(out[:, -1, :])


def predict_proba_legacy(model, gnn_seq):
    x = torch.as_tensor(gnn_seq, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
    order = np.argsort(probs)[::-1]
    return probs, order
