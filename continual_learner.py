# continual_learner.py
# =====================
# Clase que implementa aprendizaje continuo (online) para el modelo GAT+Transformer.
# Se encarga de:
#   - Detectar incertidumbre (confianza + entropía)
#   - Almacenar muestras de baja confianza en un búfer
#   - Pseudo‑etiquetar de alta confianza
#   - Fine‑tune incremental con replay de datos originales
#   - Guardar versiones del modelo y escribir métricas en CSV
# =====================

import os
import time
import copy
import threading
from collections import deque
from datetime import datetime

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

# Importamos tu modelo ya modificado
try:
    from core.gnn_model import get_model, create_edge_index
except ImportError:
    from sign_ai.core.gnn_model import get_model, create_edge_index


class LowConfidenceBuffer:
    """Búfer circular (deque) que guarda secuencias y su etiqueta (si se conoce)."""
    def __init__(self, max_size: int, seq_len: int, num_nodes: int, num_feats: int):
        self.max_size = max_size
        self.seq_len = seq_len
        self.num_nodes = num_nodes
        self.num_feats = num_feats

        self.x_buf = deque(maxlen=max_size)   # Tensor (seq_len*num_nodes, num_feats)
        self.y_buf = deque(maxlen=max_size)   # int label (−1 si aún no tiene etiqueta)
        self.has_label = deque(maxlen=max_size)  # bool: True si la etiqueta es real

    def add(self, x_seq: torch.Tensor, label: int | None = None, pseudo: bool = False):
        """Añade una secuencia completa (ya en CPU)."""
        self.x_buf.append(x_seq.detach().cpu())
        if label is None:
            self.y_buf.append(torch.tensor(-1, dtype=torch.long))   # marcador sin etiqueta
        else:
            self.y_buf.append(torch.tensor(label, dtype=torch.long))
        self.has_label.append(label is not None and not pseudo)

    def get_all(self):
        """Devuelve tres tensores (X, Y, mask) listos para entrenar."""
        if len(self.x_buf) == 0:
            return None, None, None
        X = torch.stack(list(self.x_buf))          # (N, seq_len*num_nodes, num_feats)
        Y = torch.stack(list(self.y_buf))          # (N,)
        mask = torch.tensor(list(self.has_label), dtype=torch.bool)  # (N,)
        return X, Y, mask

    def __len__(self):
        return len(self.x_buf)


class ContinualLearner:
    """
    Orquesta el aprendizaje continuo mientras el modelo está en producción.
    """

    def __init__(
        self,
        base_model: nn.Module,
        edge_index: torch.Tensor,
        num_classes: int,
        seq_len: int = 30,
        device: torch.device | str = "cpu",
        # ----- Umbrales de incertidumbre -----
        conf_thresh: float = 0.60,
        entropy_thresh: float = 1.5,
        # ----- Búfer y fine‑tune -----
        buffer_max_size: int = 2000,
        replay_ratio: float = 0.15,
        fine_tune_epochs: int = 3,
        lr_fine: float = 1e-4,
        weight_decay: float = 1e-4,
        check_interval: int = 60,          # segundos entre chequeos del búfer
        # ----- Paths -----
        model_dir: str = "models",
        log_dir: str = "logs",
    ):
        self.device = torch.device(device)
        self.num_classes = num_classes
        self.seq_len = seq_len

        # Modelo base (se usará para inferencia). Guardamos una copia para poder volver atrás.
        self.base_model = base_model.to(self.device).eval()
        self.edge_index = edge_index.to(self.device)

        # Optimizer y pérdida para fine‑tune
        self.optimizer = None          # se crea cuando arranca el fine‑tune
        self.criterion = nn.CrossEntropyLoss()   # Cambia a CTCLoss si usas CTC
        self.fine_tune_epochs = fine_tune_epochs
        self.lr_fine = lr_fine
        self.weight_decay = weight_decay

        # Umbrales de incertidumbre
        self.conf_thresh = conf_thresh
        self.entropy_thresh = entropy_thresh

        # Búfer
        self.buffer = LowConfidenceBuffer(
            max_size=buffer_max_size,
            seq_len=seq_len,
            num_nodes=42,          # 21 landmarks × 2 manos (fijo en tu modelo)
            num_feats=4,           # x, y, z, hand_indicator
        )
        self.replay_ratio = replay_ratio
        self.replay_loader = None      # se inicializa con los datos de entrenamiento original
        self.replay_iter = None

        # Hilo de fine‑tune
        self.check_interval = check_interval
        self._stop_event = threading.Event()
        self._tune_thread = None

        # Paths y versionado
        self.model_dir = model_dir
        self.log_dir = log_dir
        os.makedirs(self.model_dir, exist_ok=True)
        os.makedirs(self.log_dir, exist_ok=True)
        self.metrics_path = os.path.join(self.log_dir, "metrics.csv")
        self._init_metrics_file()

        # Versión actual
        self.current_version = 0
        self._save_model(self.base_model, version=self.current_version)  # v0

        # Estadísticas simples (para graficar)
        self._metrics = []  # lista de dicts: {timestamp, version, buffer_len, loss, holdout_acc}

    # --------------------------------------------------------------------- #
    #  Métricas y logging
    # --------------------------------------------------------------------- #
    def _init_metrics_file(self):
        if not os.path.isfile(self.metrics_path):
            with open(self.metrics_path, "w", encoding="utf-8") as f:
                f.write("timestamp,version,buffer_len,fine_tune_loss,holdout_acc\n")

    def _log_metrics(self, buffer_len: float, loss: float | None, holdout_acc: float | None):
        ts = datetime.now().isoformat(timespec="seconds")
        row = f"{ts},{self.current_version},{buffer_len},{loss if loss is not None else ''},{holdout_acc if holdout_acc is not None else ''}\n"
        with open(self.metrics_path, "a", encoding="utf-8") as f:
            f.write(row)

    # --------------------------------------------------------------------- #
    #  Modelo y versionado
    # --------------------------------------------------------------------- #
    def _save_model(self, model: nn.Module, version: int):
        path = os.path.join(self.model_dir, f"signer_v{version}.pt")
        torch.save(model.state_dict(), path)
        print(f"[ContinualLearner] Modelo guardado como {path}")

    def _load_model(self, version: int) -> nn.Module:
        path = os.path.join(self.model_dir, f"signer_v{version}.pt")
        model = copy.deepcopy(self.base_model)
        model.load_state_dict(torch.load(path, map_location=self.device))
        model.to(self.device).eval()
        return model

    def _maybe_rollback(self, holdout_acc: float, min_improvement: float = 0.01):
        """
        Si la accuracy en el hold‑out cae más de `min_improvement` respecto a la versión anterior,
        revertimos a la versión anterior.
        """
        if len(self._metrics) < 2:
            return
        prev_acc = self._metrics[-2].get("holdout_acc")
        if prev_acc is None or holdout_acc is None:
            return
        if holdout_acc < prev_acc - min_improvement:
            print(f"[ContinualLearner] Hold‑out accuracy cayó ({holdout_acc:.4f} < {prev_acc:.4f}), haciendo rollback a v{self.current_version-1}")
            self.current_version -= 1
            self.base_model = self._load_model(self.current_version)
        else:
            # aceptamos la nueva versión
            self.current_version += 1
            self._save_model(self.base_model, version=self.current_version)

    # --------------------------------------------------------------------- #
    #  Detección de incertidumbre
    # --------------------------------------------------------------------- #
    @staticmethod
    def _uncertainty(logits: torch.Tensor):
        """
        Devuelve (max_prob, entropy) para cada muestra del batch.
        logits: (B, C) o (B, T, C) si se usa CTC (nosotros usamos solo la salida final).
        """
        probs = F.softmax(logits, dim=-1)          # (B, C)
        max_prob, _ = probs.max(dim=-1)            # (B,)
        entropy = -(probs * torch.log(probs + 1e-8)).sum(dim=-1)  # (B,)
        return max_prob, entropy

    # --------------------------------------------------------------------- #
    #  Fine‑tuning interno (llamado por el hilo de fondo)
    # --------------------------------------------------------------------- #
    def _fine_tune_step(self):
        """Ejecuta un ciclo de fine‑tune cuando el búfer está lleno."""
        if len(self.buffer) < self.buffer.max_size:
            return  # aún no alcanzamos el umbral

        print("[ContinualLearner] Búfer lleno → iniciando fine‑tune...")
        X_buf, Y_buf, mask = self.buffer.get_all()
        X_buf = X_buf.to(self.device)
        Y_buf = Y_buf.to(self.device)

        # ---------- 1) Pseudo‑etiquetado de alta confianza ----------
        unlabeled_idx = (~mask).nonzero(as_tuple=False).squeeze(-1)
        if len(unlabeled_idx) > 0:
            with torch.no_grad():
                # Construir tensor batch para PyG (repetir según batch size)
                batch_unlab = torch.repeat_interleave(
                    torch.repeat_interleave(
                        torch.arange(len(unlabeled_idx), device=self.device),
                        self.seq_len * 42),
                    42)
                logits_unlab = self.base_model(
                    X_buf[unlabeled_idx],
                    self.edge_index,
                    batch_unlab,
                )  # (U, C)
                probs_unlab = F.softmax(logits_unlab, dim=-1)
                max_prob_unlab, pred_unlab = probs_unlab.max(dim=-1)
                high_conf = max_prob_unlab > 0.90   # umbral muy alto para pseudo‑etiqueta
                if high_conf.any():
                    idx_to_label = unlabeled_idx[high_conf]
                    Y_buf[idx_to_label] = pred_unlab[high_conf]
                    mask[idx_to_label] = True
                    print(f"  → Pseudo‑etiquetadas {high_conf.sum().item()} muestras (conf>0.90)")

        # ---------- 2) Preparar datos finales (reales + pseudo) ----------
        labeled_idx = mask.nonzero(as_tuple=False).squeeze(-1)
        X_final = X_buf[labeled_idx]
        Y_final = Y_buf[labeled_idx]

        # ---------- 3) DataLoader con buffer + replay ----------
        buffer_dataset = TensorDataset(X_final, Y_final)
        buffer_loader = DataLoader(
            buffer_dataset,
            batch_size=64,
            shuffle=True,
            drop_last=False,
        )

        # Si no se ha cargado todavía el replay de datos originales, lo hacemos ahora.
        if self.replay_loader is None:
            # Aquí deberías cargar un pequeño subconjunto de tu dataset de entrenamiento
            # original. Para la demostración usamos datos aleatorios; reemplázalo.
            dummy_x = torch.randn(500, self.seq_len * 42, 4)
            dummy_y = torch.randint(0, self.num_classes, (500,))
            replay_ds = TensorDataset(dummy_x, dummy_y)
            self.replay_loader = DataLoader(
                replay_ds,
                batch_size=int(64 * self.replay_ratio),
                shuffle=True,
                drop_last=False,
            )
            self.replay_iter = iter(self.replay_loader)

        # ---------- 4) Optimizer y modelo en modo train ----------
        self.base_model.train()
        self.optimizer = torch.optim.AdamW(
            self.base_model.parameters(),
            lr=self.lr_fine,
            weight_decay=self.weight_decay,
        )

        epoch_losses = []
        for epoch in range(self.fine_tune_epochs):
            epoch_loss = 0.0
            n_batches = 0
            for xb, yb in buffer_loader:
                xb = xb.to(self.device)
                yb = yb.to(self.device)

                # Obtener un batch de replay (si se agota el iterador, reiniciamos)
                try:
                    xr, yr = next(self.replay_iter)
                except StopIteration:
                    self.replay_iter = iter(self.replay_loader)
                    xr, yr = next(self.replay_iter)
                xr = xr.to(self.device)
                yr = yr.to(self.device)

                # Concatenamos buffer + replay
                x_cat = torch.cat([xb, xr], dim=0)
                y_cat = torch.cat([yb, yr], dim=0)

                # Batch tensor para PyG (necesitamos saber cuántos gráficos hay)
                batch_size_total = x_cat.size(0)
                batch_tensor = torch.repeat_interleave(
                    torch.repeat_interleave(
                        torch.arange(batch_size_total, device=self.device),
                        self.seq_len * 42),
                    42)

                self.optimizer.zero_grad()
                logits = self.base_model(x_cat, self.edge_index, batch_tensor)
                loss = self.criterion(logits, y_cat)
                loss.backward()
                self.optimizer.step()

                epoch_loss += loss.item()
                n_batches += 1

            avg_loss = epoch_loss / max(n_batches, 1)
            epoch_losses.append(avg_loss)
            print(f"    Epoch {epoch+1}/{self.fine_tune_epochs} – loss: {avg_loss:.4f}")

        # ---------- 5) Validación rápida (hold‑out) ----------
        # Aquí puedes cargar tu propio set de validación; para demostración usamos
        # otro batch aleatorio.
        holdout_acc = None
        try:
            with torch.no_grad():
                val_x = torch.randn(200, self.seq_len * 42, 4, device=self.device)
                val_y = torch.randint(0, self.num_classes, (200,), device=self.device)
                batch_val = torch.repeat_interleave(
                    torch.repeat_interleave(
                        torch.arange(val_x.size(0), device=self.device),
                        self.seq_len * 42),
                    42)
                val_logits = self.base_model(val_x, self.edge_index, batch_val)
                val_pred = val_logits.argmax(dim=-1)
                holdout_acc = (val_pred == val_y).float().mean().item()
                print(f"[ContinualLearner] Hold‑out accuracy: {holdout_acc:.4f}")
        except Exception as e:
            print(f"[ContinualLearner] No se pudo calcular hold‑out: {e}")

        # ---------- 6) Guardar versión y posible rollback ----------
        self._log_metrics(
            buffer_len=len(self.buffer),
            loss=sum(epoch_losses) / len(epoch_losses),
            holdout_acc=holdout_acc,
        )
        self._maybe_rollback(holdout_acc if holdout_acc is not None else 0.0)

        # ---------- 7) Reset del búфер ----------
        self.buffer.x_buf.clear()
        self.buffer.y_buf.clear()
        self.buffer.has_label.clear()
        print("[ContinualLearner] Fine‑tune terminado. Búfer vaciado.\n")

    # --------------------------------------------------------------------- #
    #  Hilo de fondo que dispara el fine‑tune periódicamente
    # --------------------------------------------------------------------- #
    def _tuning_loop(self):
        while not self._stop_event.is_set():
            time.sleep(self.check_interval)
            self._fine_tune_step()

    def start(self):
        """Arranca el hilo de fine‑tune en background."""
        if self._tune_thread is None or not self._tune_thread.is_alive():
            self._tune_thread = threading.Thread(target=self._tuning_loop, daemon=True)
            self._tune_thread.start()
            print("[ContinualLearner] Hilo de aprendizaje continuo iniciado.")

    def stop(self):
        """Detiene el hilo (útil al terminar el proceso)."""
        self._stop_event.set()
        if self._tune_thread is not None:
            self._tune_thread.join(timeout=5)
        print("[ContinualLearner] Hilo de aprendizaje detenido.")

    # --------------------------------------------------------------------- #
    #  Método público para usarlo desde el bucle de inferencia
    # --------------------------------------------------------------------- #
    def observe(self, x_seq_batch: torch.Tensor):
        """
        Llamarlo en cada paso de inferencia.
        x_seq_batch: Tensor (B, SEQ_LEN*42, 4) ya en el dispositivo correcto.
        Hace:
            - forward pass
            - calcula confianza + entropía
            - almacena las muestras inciertas en el búfer
        """
        self.base_model.eval()
        with torch.no_grad():
            # Construir tensor batch para PyG (b*seq_len*42 nodos)
            batch = torch.repeat_interleave(
                torch.repeat_interleave(
                    torch.arange(x_seq_batch.size(0), device=self.device),
                    self.seq_len * 42),
                42)

            logits = self.base_model(x_seq_batch, self.edge_index, batch)   # (B, C)
            max_prob, entropy = self._uncertainty(logits)                   # (B,) cada uno

            uncertain = (max_prob < self.conf_thresh) | (entropy > self.entropy_thresh)
            idx_unc = uncertain.nonzero(as_tuple=False).squeeze(-1)

            if idx_unc.numel() > 0:
                for i in idx_unc.tolist():
                    seq = x_seq_batch[i].detach().cpu()   # (SEQ_LEN*42, 4)
                    # No tenemos etiqueta todavía → None
                    self.buffer.add(seq, label=None, pseudo=False)