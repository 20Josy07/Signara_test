#!/usr/bin/env bash
set -e
PORT="${PORT:-10000}"
WORKERS="${SIGNARA_WORKERS:-1}"
exec uvicorn api:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"
