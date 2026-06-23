import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv, global_mean_pool

def create_edge_index(num_nodes=42):
    """
    Edge index for two hands (21 landmarks each).
    - Fully connected inside each hand.
    - Corresponding landmarks between hands (i <-> i+21).
    Returns a COO tensor [2, num_edges].
    """
    edges = []
    # Inside each hand (fully connected)
    for hand_start in [0, 21]:
        for i in range(num_nodes // 2):
            for j in range(i + 1, num_nodes // 2):
                edges.append([hand_start + i, hand_start + j])
                edges.append([hand_start + j, hand_start + i])  # bidirectional

    # Between hands (same landmark index)
    for i in range(21):
        edges.append([i, 21 + i])
        edges.append([21 + i, i])

    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    return edge_index


def compute_edge_attr(pos, edge_index):
    """
    Computes edge attributes for GAT.
    pos: [num_nodes, 3] (x, y, z) for a single frame.
    Returns: [num_edges, 3] = [distance, angle_xy, speed_placeholder].
    For speed we would need temporal diff; here we set 0 (can be extended).
    """
    src, dst = edge_index
    # Euclidean distance
    diff = pos[src] - pos[dst]          # [E, 3]
    dist = torch.norm(diff, p=2, dim=1, keepdim=True)  # [E,1]

    # Angle in XY plane (range -pi to pi)
    angle = torch.atan2(diff[:, 1], diff[:, 0]).unsqueeze(1)  # [E,1]

    # Placeholder for speed (could be temporal difference of positions)
    speed = torch.zeros_like(dist)      # [E,1]

    edge_attr = torch.cat([dist, angle, speed], dim=1)  # [E,3]
    return edge_attr


class HandGAT(nn.Module):
    def __init__(self, num_features=4, hidden_channels=32, out_channels=64, heads=4, dropout=0.2):
        """
        num_features: 4 (x, y, z, hand_indicator)
        hidden_channels: size per attention head.
        out_channels: final embedding size per node after second GAT layer.
        heads: number of attention heads in each GAT layer.
        """
        super(HandGAT, self).__init__()
        self.dropout = dropout

        # First GAT layer
        self.gat1 = GATConv(
            in_channels=num_features,
            out_channels=hidden_channels,
            heads=heads,
            concat=True,          # we concatenate heads -> hidden_channels * heads
            dropout=dropout,
            edge_dim=3           # we will pass edge_attr of size 3
        )
        # Second GAT layer
        self.gat2 = GATConv(
            in_channels=hidden_channels * heads,
            out_channels=out_channels,
            heads=1,
            concat=False,         # average over heads -> out_channels
            dropout=dropout,
            edge_dim=3
        )

    def forward(self, x, edge_index, edge_attr, batch):
        """
        x: [N, num_features]  (N = batch_size * seq_len * num_nodes)
        edge_index: [2, E] (shared across all frames/batches)
        edge_attr: [E, 3] (computed per frame, will be expanded)
        batch: [N] (graph assignment)
        """
        # Edge attr needs to be expanded to match the replicated edge_index across batches/frames.
        # Since edge_index is the same for each graph, we can reuse the same edge_attr.
        # PyG's GATConv expects edge_attr shape [E, edge_dim] where E matches edge_index.
        # We'll compute edge_attr per frame later and replicate.

        x = self.gat1(x, edge_index, edge_attr)
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        x = self.gat2(x, edge_index, edge_attr)
        x = F.elu(x)
        # Global pooling per graph (frame)
        x = global_mean_pool(x, batch)   # [batch_size * seq_len, out_channels]
        return x


class SignLanguageModel(nn.Module):
    def __init__(self,
                 num_features=4,
                 hidden_channels=32,
                 out_channels=64,
                 gat_heads=4,
                 lstm_hidden=128,
                 transformer_layers=2,
                 transformer_nhead=4,
                 transformer_dim_feedforward=256,
                 num_classes=100,
                 seq_len=30,
                 use_transformer=True,
                 ctc=False):
        """
        Parameters
        ----------
        use_transformer : bool
            If True, uses a Transformer encoder after GAT; else uses LSTM (original).
        ctc : bool
            If True, returns logits for each time step (seq_len) suitable for CTC loss.
            If False, returns aggregated classification logits (last time step).
        """
        super(SignLanguageModel, self).__init__()
        self.seq_len = seq_len
        self.num_classes = num_classes
        self.use_transformer = use_transformer
        self.ctc = ctc

        self.hand_gat = HandGAT(
            num_features=num_features,
            hidden_channels=hidden_channels,
            out_channels=out_channels,
            heads=gat_heads,
            dropout=0.2
        )

        gat_out_dim = out_channels  # after global_mean_pool we have this per frame

        if use_transformer:
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=gat_out_dim,
                nhead=transformer_nhead,
                dim_feedforward=transformer_dim_feedforward,
                dropout=0.1,
                activation='gelu',
                batch_first=True
            )
            self.transformer_encoder = nn.TransformerEncoder(
                encoder_layer,
                num_layers=transformer_layers
            )
            self.temporal_out_dim = gat_out_dim
        else:
            self.lstm = nn.LSTM(gat_out_dim, lstm_hidden, batch_first=True)
            self.temporal_out_dim = lstm_hidden

        self.dropout = nn.Dropout(0.5)
        self.classifier = nn.Linear(self.temporal_out_dim, num_classes)

    def forward(self, x, edge_index, batch):
        """
        x: [batch_size * seq_len * num_nodes, num_features]
        edge_index: [2, E] (static, same for all frames/batches)
        batch: [batch_size * seq_len * num_nodes] (graph ids)
        Returns:
            - If ctc=False: [batch_size, num_classes]
            - If ctc=True:  [batch_size, seq_len, num_classes] (logits per time step)
        """
        # Determine batch size from the batch tensor (assumes contiguous ordering)
        # batch ordering: [b0_frame0_nodes, b0_frame1_nodes, ..., b0_frameT-1_nodes,
        #                  b1_frame0_nodes, ..., bB-1_frameT-1_nodes]
        total_elements = x.shape[0]
        num_nodes = 42  # fixed
        max_batch = batch.max().item() + 1
        # Each graph corresponds to one frame; thus:
        num_graphs = max_batch  # equals batch_size * seq_len
        batch_size = num_graphs // self.seq_len

        # --- Compute edge attributes per frame ---
        # Reshape x to [batch_size, seq_len, num_nodes, num_features]
        x_view = x.view(batch_size, self.seq_len, num_nodes, -1)
        # Positions are first 3 channels
        positions = x_view[..., :3]  # [B, T, V, 3]

        # For each frame compute edge_attr (same edge_index)
        edge_attr_list = []
        for t in range(self.seq_len):
            pos_t = positions[:, t, :, :]          # [B, V, 3]
            # Compute per graph in batch
            attr_frames = []
            for b in range(batch_size):
                attr = compute_edge_attr(pos_t[b], edge_index)  # [E,3]
                attr_frames.append(attr)
            # Stack along batch dimension -> [B, E, 3]
            attr_batch = torch.stack(attr_frames, dim=0)
            edge_attr_list.append(attr_batch)

        # Flatten to match PyG's replicated edge_index order: [num_graphs * E, 3]
        edge_attr_expanded = []
        graph_idx = 0
        for b in range(batch_size):
            for t in range(self.seq_len):
                edge_attr_expanded.append(edge_attr_list[t][b])  # [E,3]
                graph_idx += 1
        edge_attr = torch.cat(edge_attr_expanded, dim=0)  # [num_graphs * E, 3]

        # Flatten node features for GAT: already x is [num_graphs * num_nodes, num_features]
        gcn_out = self.hand_gat(x, edge_index, edge_attr, batch)  # [num_graphs, out_channels]

        # Reshape to [batch_size, seq_len, out_channels]
        gcn_out = gcn_out.view(batch_size, self.seq_len, -1)

        if self.use_transformer:
            # Transformer expects [batch, seq, dim]
            tf_out = self.transformer_encoder(gcn_out)  # [B, T, D]
            if self.ctc:
                # Return logits per time step
                logits = self.classifier(tf_out)  # [B, T, C]
                return logits
            else:
                # Use representation of the last time step (could also mean pool)
                last = tf_out[:, -1, :]  # [B, D]
                last = self.dropout(last)
                out = self.classifier(last)
                return out
        else:
            # LSTM path (kept for reference)
            lstm_out, _ = self.lstm(gcn_out)  # [B, T, H]
            if self.ctc:
                logits = self.classifier(lstm_out)  # [B, T, C]
                return logits
            else:
                lstm_last = lstm_out[:, -1, :]      # [B, H]
                lstm_last = self.dropout(lstm_last)
                out = self.classifier(lstm_last)
                return out


# Helper to instantiate model with recommended settings
def get_model(num_classes=100, seq_len=30, ctc=False):
    """
    Returns a model configured for high accuracy and efficiency:
    - GAT with edge attributes (distance, angle)
    - Transformer encoder (2 layers, 4 heads)
    - Optionally CTC loss for sequence‑to‑sequence training.
    """
    return SignLanguageModel(
        num_features=4,
        hidden_channels=32,
        out_channels=64,
        gat_heads=4,
        transformer_layers=2,
        transformer_nhead=4,
        transformer_dim_feedforward=256,
        num_classes=num_classes,
        seq_len=seq_len,
        use_transformer=True,
        ctc=ctc
    )


if __name__ == "__main__":
    # Quick sanity check
    model = get_model(num_classes=50, ctc=False)
    edge_index = create_edge_index()

    batch_size = 4
    seq_len = 30
    num_nodes = 42
    num_feats = 4

    x = torch.randn(batch_size * seq_len * num_nodes, num_feats)

    # Build batch tensor as expected by the model
    batch = torch.repeat_interleave(
        torch.repeat_interleave(torch.arange(batch_size), seq_len * num_nodes),
        num_nodes
    )

    out = model(x, edge_index, batch)
    print(f"Input shape: {x.shape}")
    print(f"Output shape: {out.shape}")  # [batch_size, num_classes]