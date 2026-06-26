#!/usr/bin/env bash
set -e
PORT="${PORT:-10000}"
# Un solo proceso: --workers duplica RAM y mata hijos en plan free.
exec uvicorn api:app --host 0.0.0.0 --port "$PORT"
