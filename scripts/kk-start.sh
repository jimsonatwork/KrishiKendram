#!/usr/bin/env bash
# KrishiKendram lifecycle start — canonical runtime root A.
set -Eeuo pipefail
PROJECT_ROOT="/home/jj/Dev/KrishiKendram"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
NODE_BIN="/home/jj/.nvm/versions/node/v24.18.0/bin/node"
NPM_CLI="/home/jj/.nvm/versions/node/v24.18.0/lib/node_modules/npm/bin/npm-cli.js"
POSTGRES_CONTAINER="krishikendram-postgres"
POSTGRES_DB="krishikendram"
POSTGRES_USER="postgres"
BACKEND_UNIT="krishikendram-backend.service"
FRONTEND_UNIT="krishikendram-frontend.service"
DOCKER_DESKTOP_EXE='D:\KrishiKendram\06-Docker\DockerDesktop\Docker Desktop.exe'
STATE_DIR="/home/jj/.local/state/krishikendram"
OLLAMA_PID_FILE="$STATE_DIR/ollama-managed-windows.pid"
export PATH="/home/jj/.nvm/versions/node/v24.18.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
mkdir -p "$STATE_DIR"
LOG_FILE="$STATE_DIR/lifecycle.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo
echo "========== KrishiKendram supervised START $(date -Is) =========="
echo "Workspace: $PROJECT_ROOT"
echo "Lifecycle log: $LOG_FILE"
[[ -d "$PROJECT_ROOT" ]] || { echo "FATAL: canonical project root is missing."; exit 10; }
command -v systemctl >/dev/null
systemctl --user show-environment >/dev/null 2>&1 || { echo "FATAL: systemd user session unavailable; do not bypass service supervision."; exit 11; }

# Start Docker Desktop only if the engine is not already usable.
if ! timeout 5 docker info >/dev/null 2>&1; then
  echo "Docker engine unavailable; requesting Docker Desktop startup..."
  /mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -NonInteractive -Command "
    \$exe = '$DOCKER_DESKTOP_EXE'
    if (-not (Test-Path -LiteralPath \$exe)) { Write-Error 'Docker Desktop executable not found'; exit 2 }
    if (-not (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue)) { Start-Process -FilePath \$exe }
  " || true
  docker_ready=false
  for _ in $(seq 1 120); do
    if timeout 5 docker info >/dev/null 2>&1; then docker_ready=true; break; fi
    sleep 1
  done
  [[ "$docker_ready" == true ]] || { echo "FATAL: Docker engine did not become ready within 120s. No database reset attempted."; exit 12; }
fi
echo "PASS: Docker engine ready."

# Start the existing database container; never recreate or remove its volume.
if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  if [[ "$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER")" != "true" ]]; then
    echo "Starting existing PostgreSQL container (volume retained)..."
    docker start "$POSTGRES_CONTAINER" >/dev/null
  fi
else
  echo "FATAL: expected existing PostgreSQL container '$POSTGRES_CONTAINER' is missing."
  echo "No compose recreation attempted, to avoid silently creating a fresh empty database volume."
  exit 13
fi
db_ready=false
for _ in $(seq 1 90); do
  if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then db_ready=true; break; fi
  sleep 1
done
[[ "$db_ready" == true ]] || { echo "FATAL: PostgreSQL health check failed; container and volume were not removed."; exit 13; }
echo "PASS: PostgreSQL ready ($POSTGRES_DB)."

# Local LLM is opt-in and locally governed. Prefer the installed WSL/Linux runtime
# and its paired ownership-aware stop script; never enable cloud fallback.
if grep -Eq '^[[:space:]]*KK_AI_ALLOW_LOCAL_EVALUATION=(true|1)[[:space:]]*$' "/home/jj/Dev/KrishiKendram/backend/.env" 2>/dev/null; then
  if curl -fsS --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "PASS: local Ollama API healthy; existing server left unmanaged."
  elif [[ -x "/home/jj/Dev/KrishiKendram/scripts/kk-ai-runtime-start.sh" ]]; then
    echo "Local AI evaluation explicitly enabled; starting the configured WSL/Linux Ollama runtime..."
    if "/home/jj/Dev/KrishiKendram/scripts/kk-ai-runtime-start.sh"; then
      echo "PASS: local Ollama API ready (evaluation-only; cloud fallback disabled)."
    else
      echo "WARNING: local Ollama runtime did not become healthy; provider remains unverified and cloud fallback stays disabled."
    fi
  else
    echo "WARNING: local AI evaluation is enabled but the governed runtime launcher is missing; no cloud fallback attempted."
  fi
else
  echo "SKIP: local LLM server start is not opted in by backend/.env (KK_AI_ALLOW_LOCAL_EVALUATION)."
fi

systemctl --user daemon-reload
if ! systemctl --user is-active --quiet "$BACKEND_UNIT"; then
  if [[ ! -f "$BACKEND_DIR/dist/src/main.js" ]] || find "$BACKEND_DIR/src" -type f -newer "$BACKEND_DIR/dist/src/main.js" -print -quit | grep -q .; then
    echo "Building backend because build output is absent or stale..."
    cd "$BACKEND_DIR"
    "$NODE_BIN" "$NPM_CLI" run build
  fi
  systemctl --user start "$BACKEND_UNIT"
fi
if ! systemctl --user is-active --quiet "$FRONTEND_UNIT"; then systemctl --user start "$FRONTEND_UNIT"; fi

backend_ok=false; frontend_ok=false
for _ in $(seq 1 150); do
  curl -fsS --max-time 3 http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1 && backend_ok=true || backend_ok=false
  curl -fsS --max-time 3 http://127.0.0.1:4000/ >/dev/null 2>&1 && frontend_ok=true || frontend_ok=false
  [[ "$backend_ok" == true && "$frontend_ok" == true ]] && break
  sleep 1
done
if [[ "$backend_ok" != true || "$frontend_ok" != true ]]; then
  echo "FATAL: app health check failed; recent supervised logs follow."
  journalctl --user -u "$BACKEND_UNIT" -u "$FRONTEND_UNIT" -n 50 --no-pager || true
  exit 14
fi
echo "PASS: API http://localhost:3000/api/v1/health"
echo "PASS: UI  http://localhost:4000/"
echo "AI governance: local evaluation only when explicitly opted in; cloud fallback remains disabled."
echo "God Mode artifact paths (read locally only; never paste secrets into chat):"
echo "  $BACKEND_DIR/config/god-mode/rootpathss"
echo "  $BACKEND_DIR/config/god-mode/rootpathss.kkt"
echo "========== KrishiKendram START COMPLETE $(date -Is) =========="
