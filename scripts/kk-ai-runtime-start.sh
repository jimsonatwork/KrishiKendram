#!/usr/bin/env bash
set -Eeuo pipefail

OLLAMA_BIN="${KK_AI_OLLAMA_BIN:-/mnt/d/KrishiKendram/08-AI/Tools/Ollama/bin/ollama}"
MODEL_DIR="${KK_AI_OLLAMA_MODELS_DIR:-/home/jj/.local/share/krishikendram/ollama-models}"
PID_FILE="${KK_AI_OLLAMA_PID_FILE:-/tmp/krishikendram-ollama.pid}"
LOG_FILE="${KK_AI_OLLAMA_LOG_FILE:-/tmp/krishikendram-ollama.log}"
HEALTH_URL="http://127.0.0.1:11434/api/tags"

if [[ ! -x "$OLLAMA_BIN" ]]; then
  echo "ERROR: Ollama binary not found or not executable: $OLLAMA_BIN"
  exit 1
fi
mkdir -p "$MODEL_DIR"

if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  echo "READY: Ollama is already answering on 127.0.0.1:11434"
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ "$old_pid" =~ ^[0-9]+$ ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "ERROR: Ollama PID $old_pid exists but health check failed. Inspect $LOG_FILE before retrying."
    exit 1
  fi
fi

echo "Starting local Ollama runtime."
echo "Binary: $OLLAMA_BIN"
echo "Model storage: $MODEL_DIR"
nohup env OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MODELS="$MODEL_DIR" OLLAMA_NO_CLOUD=true "$OLLAMA_BIN" serve >"$LOG_FILE" 2>&1 </dev/null &
pid=$!
printf '%s\n' "$pid" > "$PID_FILE"

for _ in $(seq 1 60); do
  if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "READY: local Ollama API http://127.0.0.1:11434"
    echo "PID: $pid"
    echo "Log: $LOG_FILE"
    exit 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "ERROR: Ollama exited during startup."
    tail -n 40 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo "ERROR: Ollama did not become healthy within 60 seconds."
tail -n 40 "$LOG_FILE" 2>/dev/null || true
exit 1
