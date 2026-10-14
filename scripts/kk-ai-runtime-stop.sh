#!/usr/bin/env bash
set -Eeuo pipefail

PID_FILE="${KK_AI_OLLAMA_PID_FILE:-/tmp/krishikendram-ollama.pid}"
LOG_FILE="${KK_AI_OLLAMA_LOG_FILE:-/tmp/krishikendram-ollama.log}"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Ollama PID file not found; no managed runtime to stop."
  exit 0
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
  echo "ERROR: invalid Ollama PID file. Inspect $PID_FILE manually."
  exit 1
fi

if ! kill -0 "$pid" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "Ollama process is already stopped."
  exit 0
fi

kill -TERM "$pid"
for _ in $(seq 1 15); do
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "Ollama stopped cleanly."
    exit 0
  fi
  sleep 1
done

echo "ERROR: Ollama has not exited after SIGTERM. No SIGKILL was issued."
echo "Inspect log: $LOG_FILE"
exit 1
