"""
Utilidades para convertir MSL-150 → CSV raw de sign_ai (*_raw.csv).

Formato de salida (por fila):
  label, persona, muestra, frame, mano, id, x, y, z

mano: 0 = izquierda (lh), 1 = derecha (rh) — igual que 06_gnn_train.py
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np

RAW_COLUMNS = ["label", "persona", "muestra", "frame", "mano", "id", "x", "y", "z"]

HAND_SUFFIXES = [
    "WRIST",
    "THUMB_CMC", "THUMB_MCP", "THUMB_IP", "THUMB_TIP",
    "INDEX_FINGER_MCP", "INDEX_FINGER_PIP", "INDEX_FINGER_DIP", "INDEX_FINGER_TIP",
    "MIDDLE_FINGER_MCP", "MIDDLE_FINGER_PIP", "MIDDLE_FINGER_DIP", "MIDDLE_FINGER_TIP",
    "RING_FINGER_MCP", "RING_FINGER_PIP", "RING_FINGER_DIP", "RING_FINGER_TIP",
    "PINKY_MCP", "PINKY_PIP", "PINKY_DIP", "PINKY_TIP",
]

# En MSL-150 npy: 56 landmarks × (x,y,z,visibility); 0–20 = RH, 21–41 = LH
NPY_HAND_LANDMARKS = 21
NPY_HAND_BLOCKS = 2
NPY_STRIDE = 4


def normalize_label(name: str) -> str:
    """dolor → DOLOR, como_que → COMO_QUE (compatible con sign_ai)."""
    cleaned = re.sub(r"[^0-9a-zA-Záéíóúñü]+", "_", str(name).strip().lower())
    cleaned = cleaned.strip("_")
    return cleaned.upper() if cleaned else "UNKNOWN"


def mirror_x(x: float) -> float:
    """Alinea con la cámara espejada del navegador (InterpretScreen)."""
    return 1.0 - float(x)


def hand_rows_from_xyz(
    lh: np.ndarray,
    rh: np.ndarray,
    *,
    label: str,
    persona: str,
    muestra: int,
    frame: int,
    mirror: bool,
) -> list[list]:
    rows = []
    for mano, block in ((0, lh), (1, rh)):
        for lid in range(min(21, len(block))):
            x, y, z = block[lid]
            if mirror:
                x = mirror_x(x)
            rows.append([label, persona, muestra, frame, mano, lid, float(x), float(y), float(z)])
    return rows


def npy_frame_to_hands(vec: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Vector (226,) MSL-150 → lh (21,3), rh (21,3)."""
    vec = np.asarray(vec, dtype=np.float32).reshape(-1)
    rh = np.zeros((21, 3), dtype=np.float32)
    lh = np.zeros((21, 3), dtype=np.float32)
    for i in range(NPY_HAND_LANDMARKS):
        base = i * NPY_STRIDE
        if base + 2 < len(vec):
            rh[i] = vec[base : base + 3]
    for i in range(NPY_HAND_LANDMARKS):
        base = (NPY_HAND_LANDMARKS + i) * NPY_STRIDE
        if base + 2 < len(vec):
            lh[i] = vec[base : base + 3]
    return lh, rh


def csv_hand_column_map(columns: list[str]) -> tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]:
    """Devuelve listas (prefix, suffix, axis) para LEFT y RIGHT."""
    left_cols: list[tuple[str, str, str]] = []
    right_cols: list[tuple[str, str, str]] = []
    for suffix in HAND_SUFFIXES:
        for side, bucket, prefix in (
            ("LEFT", left_cols, "LEFT"),
            ("RIGHT", right_cols, "RIGHT"),
        ):
            for axis in ("X", "Y", "Z"):
                col = f"{prefix}_{suffix}_{axis}"
                if col in columns:
                    bucket.append((prefix, suffix, axis))
    return left_cols, right_cols


def _hand_block_from_csv_row(row, col_map: list[tuple[str, str, str]]) -> np.ndarray:
    block = np.zeros((21, 3), dtype=np.float32)
    for lid, (prefix, suffix, _) in enumerate(HAND_SUFFIXES):
        for ai, axis in enumerate(("X", "Y", "Z")):
            col = f"{prefix}_{suffix}_{axis}"
            val = row.get(col, 0.0)
            try:
                block[lid, ai] = float(val) if val == val else 0.0  # NaN check
            except (TypeError, ValueError):
                block[lid, ai] = 0.0
    return block


def iter_npy_samples(
    root: Path,
    *,
    persona: str = "msl150",
    max_classes: int | None = None,
    max_samples_per_class: int | None = None,
    mirror: bool = True,
):
    """
    Recorre sample_npy/<clase>/<muestra_id>/<frame>.npy
    o raw_npy con la misma estructura.
    """
    root = Path(root)
    if not root.is_dir():
        raise FileNotFoundError(f"No existe carpeta MSL-150: {root}")

    class_dirs = sorted([p for p in root.iterdir() if p.is_dir()])
    if max_classes:
        class_dirs = class_dirs[:max_classes]

    for class_dir in class_dirs:
        label = normalize_label(class_dir.name)
        sample_dirs = sorted(
            [p for p in class_dir.iterdir() if p.is_dir()],
            key=lambda p: int(p.name) if p.name.isdigit() else p.name,
        )
        if max_samples_per_class:
            sample_dirs = sample_dirs[:max_samples_per_class]

        for sample_dir in sample_dirs:
            try:
                muestra = int(sample_dir.name)
            except ValueError:
                muestra = hash(sample_dir.name) % 1_000_000

            frame_files = sorted(
                sample_dir.glob("*.npy"),
                key=lambda p: int(p.stem) if p.stem.isdigit() else p.stem,
            )
            for frame_path in frame_files:
                try:
                    frame = int(frame_path.stem)
                except ValueError:
                    frame = 0
                lh, rh = npy_frame_to_hands(np.load(frame_path))
                yield hand_rows_from_xyz(
                    lh, rh,
                    label=label,
                    persona=persona,
                    muestra=muestra,
                    frame=frame,
                    mirror=mirror,
                )


def import_msl150_npy(
    root: Path,
    out_csv: Path,
    *,
    persona: str = "msl150",
    max_classes: int | None = None,
    max_samples_per_class: int | None = None,
    mirror: bool = True,
    append: bool = False,
) -> dict:
    import pandas as pd

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    rows: list[list] = []
    classes: set[str] = set()
    samples = 0

    for block in iter_npy_samples(
        root,
        persona=persona,
        max_classes=max_classes,
        max_samples_per_class=max_samples_per_class,
        mirror=mirror,
    ):
        if block:
            classes.add(block[0][0])
            if block[0][3] == 0:
                samples += 1
            rows.extend(block)

    df = pd.DataFrame(rows, columns=RAW_COLUMNS)
    mode = "a" if append and out_csv.is_file() else "w"
    header = not (append and out_csv.is_file())
    df.to_csv(out_csv, index=False, mode=mode, header=header)

    return {
        "rows": len(df),
        "classes": len(classes),
        "samples": samples,
        "output": str(out_csv),
    }


def import_msl150_csv(
    csv_path: Path,
    out_csv: Path,
    *,
    persona: str = "msl150",
    chunksize: int = 50_000,
    max_classes: int | None = None,
    max_samples_per_class: int | None = None,
    mirror: bool = True,
    append: bool = False,
) -> dict:
    import pandas as pd

    csv_path = Path(csv_path)
    if not csv_path.is_file():
        raise FileNotFoundError(f"No existe CSV MSL-150: {csv_path}")

    # Leer cabecera
    header = pd.read_csv(csv_path, nrows=0).columns.tolist()
    meta = {"VIDEO_SAMPLE", "CLASSIFICATION", "FRAME"}
    if not meta.issubset(set(header)):
        raise ValueError(
            "CSV no parece MSL-150 (faltan VIDEO_SAMPLE, CLASSIFICATION, FRAME). "
            f"Columnas: {header[:8]}…",
        )

    hand_cols = []
    for suffix in HAND_SUFFIXES:
        for side in ("LEFT", "RIGHT"):
            for axis in ("X", "Y", "Z"):
                col = f"{side}_{suffix}_{axis}"
                if col in header:
                    hand_cols.append(col)

    usecols = ["VIDEO_SAMPLE", "CLASSIFICATION", "FRAME", *hand_cols]
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    mode = "a" if append and out_csv.is_file() else "w"
    wrote_header = append and out_csv.is_file()

    classes_seen: set[str] = set()
    per_class_count: dict[str, int] = {}
    total_rows = 0
    total_samples = 0

    for chunk in pd.read_csv(csv_path, usecols=usecols, chunksize=chunksize, dtype=str):
        chunk["CLASSIFICATION"] = chunk["CLASSIFICATION"].fillna("").str.strip()
        chunk["FRAME"] = chunk["FRAME"].astype(int)
        chunk["VIDEO_SAMPLE"] = chunk["VIDEO_SAMPLE"].astype(int)

        for col in hand_cols:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce").fillna(0.0)

        batch: list[list] = []
        for (label_raw, video_sample), group in chunk.groupby(["CLASSIFICATION", "VIDEO_SAMPLE"]):
            label = normalize_label(label_raw)
            if not label or label == "UNKNOWN":
                continue
            if label not in classes_seen:
                if max_classes and len(classes_seen) >= max_classes:
                    continue
                classes_seen.add(label)
            if label not in per_class_count:
                per_class_count[label] = 0
            if max_samples_per_class and per_class_count[label] >= max_samples_per_class:
                continue
            per_class_count[label] += 1
            total_samples += 1

            for _, row in group.sort_values("FRAME").iterrows():
                frame = int(row["FRAME"])
                muestra = int(row["VIDEO_SAMPLE"])
                lh = np.zeros((21, 3), dtype=np.float32)
                rh = np.zeros((21, 3), dtype=np.float32)
                for lid, suffix in enumerate(HAND_SUFFIXES):
                    for ai, axis in enumerate(("X", "Y", "Z")):
                        lc = f"LEFT_{suffix}_{axis}"
                        rc = f"RIGHT_{suffix}_{axis}"
                        if lc in row:
                            lh[lid, ai] = float(row[lc])
                        if rc in row:
                            rh[lid, ai] = float(row[rc])
                batch.extend(
                    hand_rows_from_xyz(
                        lh, rh,
                        label=label,
                        persona=persona,
                        muestra=muestra,
                        frame=frame,
                        mirror=mirror,
                    ),
                )

        if batch:
            df = pd.DataFrame(batch, columns=RAW_COLUMNS)
            df.to_csv(out_csv, index=False, mode=mode, header=not wrote_header)
            wrote_header = True
            mode = "a"
            total_rows += len(df)

    return {
        "rows": total_rows,
        "classes": len(classes_seen),
        "samples": total_samples,
        "output": str(out_csv),
    }
