#!/usr/bin/env python3
"""
Importa MSL-150 (LSM) al formato raw de sign_ai para entrenar el GNN.

Fuentes soportadas:
  1. Carpeta sample_npy/ o raw_npy/ (demo GitHub o Zenodo descomprimido)
  2. CSV maestro de Zenodo (MSL-150_Mexican_Sign_Language_Dataset.csv)

Uso (demo rápido con subset GitHub):
    cd sign_ai
    git clone --depth 1 https://github.com/armandobecerril/MSL-150-Dataset ../MSL-150-Dataset
    python 08_import_msl150.py --npy-dir ../MSL-150-Dataset/data/sample_npy

Uso (dataset completo Zenodo):
    python 08_import_msl150.py --csv path/to/MSL-150_Mexican_Sign_Language_Dataset.csv

Luego entrenar:
    python 06_gnn_train.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from core.msl150_io import import_msl150_csv, import_msl150_npy


def main() -> int:
    parser = argparse.ArgumentParser(description="MSL-150 → sign_ai data/*_raw.csv")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--npy-dir", type=Path, help="Carpeta sample_npy o raw_npy de MSL-150")
    src.add_argument("--csv", type=Path, help="CSV maestro de Zenodo (~14 GB)")

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/msl150_raw.csv"),
        help="Archivo CSV de salida (default: data/msl150_raw.csv)",
    )
    parser.add_argument("--persona", default="msl150", help="Nombre de persona en el CSV raw")
    parser.add_argument("--max-classes", type=int, default=None, help="Limitar clases (pruebas)")
    parser.add_argument(
        "--max-samples-per-class",
        type=int,
        default=None,
        help="Limitar muestras por clase (pruebas)",
    )
    parser.add_argument(
        "--no-mirror-x",
        action="store_true",
        help="No aplicar x = 1-x (dejar datos tal cual del dataset)",
    )
    parser.add_argument(
        "--merge-existing",
        action="store_true",
        help="Añadir al CSV existente en lugar de sobrescribir",
    )
    args = parser.parse_args()

    mirror = not args.no_mirror_x
    append = args.merge_existing

    if args.output.exists() and not append:
        print(f"[!] Sobrescribiendo {args.output}")

    try:
        if args.npy_dir:
            stats = import_msl150_npy(
                args.npy_dir,
                args.output,
                persona=args.persona,
                max_classes=args.max_classes,
                max_samples_per_class=args.max_samples_per_class,
                mirror=mirror,
                append=append,
            )
        else:
            stats = import_msl150_csv(
                args.csv,
                args.output,
                persona=args.persona,
                max_classes=args.max_classes,
                max_samples_per_class=args.max_samples_per_class,
                mirror=mirror,
                append=append,
            )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    summary_path = args.output.with_suffix(".summary.json")
    summary_path.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\nOK Importacion MSL-150 completada")
    print(f"   Filas       : {stats['rows']:,}")
    print(f"   Clases      : {stats['classes']}")
    print(f"   Muestras    : {stats['samples']:,}")
    print(f"   Salida      : {stats['output']}")
    print(f"   Resumen     : {summary_path}")
    print("\nSiguiente paso: python 06_gnn_train.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
