#!/usr/bin/env bash
# KrishiKendram SAFE full shutdown. Fails closed if recovery checkpoint or DB dump fails.
set -Eeuo pipefail
PROJECT_ROOT="/home/jj/Dev/KrishiKendram"
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKEND_UNIT="krishikendram-backend.service"
FRONTEND_UNIT="krishikendram-frontend.service"
POSTGRES_CONTAINER="krishikendram-postgres"
POSTGRES_DB="krishikendram"
POSTGRES_USER="postgres"
DOCKER_DESKTOP_EXE='D:\KrishiKendram\06-Docker\DockerDesktop\Docker Desktop.exe'
BACKUP_BASE="/mnt/d/KrishiKendram/08-Recovery-Backup/KK-Safe-Shutdown"
STATE_DIR="/home/jj/.local/state/krishikendram"
OLLAMA_PID_FILE="$STATE_DIR/ollama-managed-windows.pid"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK=""
mkdir -p "$STATE_DIR"
LOG_FILE="$STATE_DIR/lifecycle.log"
exec > >(tee -a "$LOG_FILE") 2>&1

fail() { echo "FATAL: $*"; exit 20; }
on_exit() {
  rc=$?
  if [[ $rc -ne 0 && -n "$WORK" && -d "$WORK" ]]; then
    target="$BACKUP_BASE/INCOMPLETE-$STAMP"
    mkdir -p "$BACKUP_BASE" 2>/dev/null || true
    mv "$WORK" "$target" 2>/dev/null || true
    echo "INCOMPLETE recovery artifacts retained at: $target"
  fi
  echo "Shutdown script exit=$rc at $(date -Is)"
}
trap on_exit EXIT

echo
echo "========== KrishiKendram SAFE SHUTDOWN $(date -Is) =========="
echo "Policy: checkpoint first; no destructive Docker/WSL cleanup; fail closed on backup failure."
[[ -d "$PROJECT_ROOT" ]] || fail "Canonical root missing: $PROJECT_ROOT"
[[ -d /mnt/d/KrishiKendram/08-Recovery-Backup ]] || fail "D: recovery destination is not mounted; no services stopped."
command -v git >/dev/null && command -v tar >/dev/null && command -v sha256sum >/dev/null || fail "Required checkpoint tools unavailable."
# Docker Desktop/WSL can briefly report an unavailable engine during startup or load.
# Retry before failing, and preserve the final diagnostic so transient failures are distinguishable.
DOCKER_READY=false
DOCKER_ERROR="$STATE_DIR/docker-preflight.err"
for ATTEMPT in 1 2 3 4 5 6; do
  if timeout 8 docker info >/dev/null 2>"$DOCKER_ERROR"; then
    DOCKER_READY=true
    break
  fi
  echo "Docker readiness probe $ATTEMPT/6 failed; retrying in 2 seconds..."
  sleep 2
done
if [[ "$DOCKER_READY" != true ]]; then
  echo "Docker diagnostic from final probe:"
  cat "$DOCKER_ERROR" 2>/dev/null || true
  fail "Docker engine unavailable after 6 probes; database state cannot be safely verified. No services were stopped."
fi
rm -f "$DOCKER_ERROR"
echo "PASS: Docker engine preflight verified."

mkdir -p "$BACKUP_BASE"
WORK="$BACKUP_BASE/.tmp-$STAMP-$$"
mkdir -m 700 "$WORK"
printf 'created_at=%s\ncanonical_root=%s\nbackup_destination=%s\n' "$(date -Is)" "$PROJECT_ROOT" "$WORK" > "$WORK/manifest.txt"
printf 'Expected roots: A=%s; C=%s; B=%s\n' "$PROJECT_ROOT" "/home/jj/Dev/KrishiKendram-Development" "/home/jj/Dev/KrishiKendram-Integration" >> "$WORK/manifest.txt"

# Snapshot committed history plus staged/unstaged edits and untracked source files.
# Do not alter the source repositories, Git index, branches, or remotes.
ROOTS=("$PROJECT_ROOT" "/home/jj/Dev/KrishiKendram-Development" "/home/jj/Dev/KrishiKendram-Integration")
for ROOT in "${ROOTS[@]}"; do
  LABEL="$(basename "$ROOT")"
  DEST="$WORK/$LABEL"
  mkdir -p "$DEST"
  if [[ ! -d "$ROOT/.git" && ! -f "$ROOT/.git" ]]; then
    echo "MISSING_REQUIRED_ROOT=$ROOT" | tee -a "$WORK/manifest.txt"
    fail "Expected project root unavailable; refusing shutdown before all working trees are checkpointed."
  fi
  echo "Checkpointing Git worktree: $ROOT"
  git -C "$ROOT" status --porcelain=v2 --branch > "$DEST/git-status.txt"
  git -C "$ROOT" rev-parse HEAD > "$DEST/HEAD.txt"
  git -C "$ROOT" branch --show-current > "$DEST/branch.txt"
  git -C "$ROOT" diff --binary HEAD > "$DEST/tracked-working-tree.patch"
  git -C "$ROOT" diff --cached --binary > "$DEST/staged.patch"
  git -C "$ROOT" diff --binary > "$DEST/unstaged.patch"
  git -C "$ROOT" ls-files --others --exclude-standard -z > "$DEST/untracked.list"
  if [[ -s "$DEST/untracked.list" ]]; then
    (cd "$ROOT" && tar --null -T "$DEST/untracked.list" -cf "$DEST/untracked-files.tar")
  else
    : > "$DEST/untracked-files.tar"
  fi
  git -C "$ROOT" bundle create "$DEST/repository.bundle" --all
  # Preserve local runtime configuration (may contain secrets; local backup only).
  : > "$DEST/local-config.list"
  for rel in .env frontend/.env frontend/.env.local backend/.env backend/config/resource-paths.json backend/config/god-mode/rootpathss backend/config/god-mode/rootpathss.kkt; do
    [[ -f "$ROOT/$rel" ]] && printf '%s\0' "$rel" >> "$DEST/local-config.list"
  done
  if [[ -s "$DEST/local-config.list" ]]; then
    (cd "$ROOT" && tar --null -T "$DEST/local-config.list" -cf "$DEST/local-config.tar")
  else
    : > "$DEST/local-config.tar"
  fi
  chmod -R go-rwx "$DEST"
done

# Stop only supervised app units, and confirm they exited before dumping PostgreSQL.
echo "Stopping supervised API/frontend services..."
timeout 45 systemctl --user stop "$BACKEND_UNIT" "$FRONTEND_UNIT" || fail "systemd could not stop app services cleanly."
systemctl --user is-active --quiet "$BACKEND_UNIT" && fail "Backend remains active after stop request."
systemctl --user is-active --quiet "$FRONTEND_UNIT" && fail "Frontend remains active after stop request."
for PORT in 3000 4000; do
  if ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    ss -ltnp "sport = :$PORT" 2>/dev/null || true
    fail "Port $PORT remains in use by an unsupervised process; inspect it before shutdown."
  fi
done
echo "PASS: supervised app units stopped and app ports are clear."

# Dump database in custom format while PostgreSQL is still running, then validate the file.
if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  DB_RUNNING="$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER")"
  if [[ "$DB_RUNNING" == "true" ]]; then
    echo "Creating consistent PostgreSQL logical backup..."
    DB_TMP="$WORK/postgres.dump.tmp"
    docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DB_TMP" || fail "pg_dump failed; database left running."
    [[ -s "$DB_TMP" ]] || fail "PostgreSQL dump is empty; database left running."
    [[ "$(head -c 5 "$DB_TMP")" == "PGDMP" ]] || fail "PostgreSQL dump format validation failed; database left running."
    mv "$DB_TMP" "$WORK/postgres.dump"
    echo "PASS: PostgreSQL dump validated ($(stat -c '%s' "$WORK/postgres.dump") bytes)."
  else
    echo "NOTE: PostgreSQL container was already stopped; its existing Docker volume is retained."
    printf 'database_dump=SKIPPED_CONTAINER_ALREADY_STOPPED_VOLUME_RETAINED\n' >> "$WORK/manifest.txt"
  fi
else
  fail "PostgreSQL container is missing; refusing to assume database state is safe."
fi

# Capture a runtime inventory before stopping the remaining project-managed AI runtime.
docker ps --format '{{.Names}}' > "$WORK/running-containers-before-stop.txt"
printf 'checkpoint_complete_at=%s\n' "$(date -Is)" >> "$WORK/manifest.txt"
(
  cd "$WORK"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 -r sha256sum > SHA256SUMS
)
chmod -R go-rwx "$WORK"
FINAL="$BACKUP_BASE/KK-checkpoint-$STAMP"
mv "$WORK" "$FINAL"
WORK=""
echo "PASS: recoverable checkpoint finalized: $FINAL"

# Stop the existing PostgreSQL container gracefully; never run compose down or remove volumes.
if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1 && [[ "$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER")" == "true" ]]; then
  echo "Stopping PostgreSQL container gracefully (60s grace)..."
  docker stop --time 60 "$POSTGRES_CONTAINER" >/dev/null || fail "PostgreSQL did not stop cleanly; recovery checkpoint is safe at $FINAL."
fi
if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1 && [[ "$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER")" == "true" ]]; then
  fail "PostgreSQL still reports running; Docker Desktop and WSL will remain available for recovery."
fi
echo "PASS: PostgreSQL stopped; named volumes were not removed."

# Stop only the WSL/Linux Ollama instance created by the governed runtime launcher.
# Its PID file is written only by kk-ai-runtime-start.sh; never kill an unowned server.
if [[ -f "/tmp/krishikendram-ollama.pid" ]]; then
  echo "Stopping the KrishiKendram-managed local Ollama runtime..."
  KK_AI_OLLAMA_PID_FILE="/tmp/krishikendram-ollama.pid" KK_AI_OLLAMA_LOG_FILE="/tmp/krishikendram-ollama.log"     bash "/home/jj/Dev/KrishiKendram/scripts/kk-ai-runtime-stop.sh" || fail "Managed local Ollama did not stop cleanly; Docker Desktop and WSL remain available for recovery."
fi

# Stop the KK-managed Ollama process only. Do not kill a server that was already running before kk-start.
if [[ -f "$OLLAMA_PID_FILE" ]]; then
  OLLAMA_PID="$(cat "$OLLAMA_PID_FILE" 2>/dev/null || true)"
  if [[ "$OLLAMA_PID" =~ ^[0-9]+$ ]]; then
    echo "Stopping KrishiKendram-managed Ollama server PID $OLLAMA_PID..."
    /mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -NonInteractive -Command "
      \$id = $OLLAMA_PID
      \$p = Get-CimInstance Win32_Process -Filter \"ProcessId=\$id\" -ErrorAction SilentlyContinue
      if (\$p -and \$p.Name -ieq 'ollama.exe' -and \$p.CommandLine -match '\\bserve\\b') {
        Stop-Process -Id \$id -ErrorAction Stop
        exit 0
      }
      exit 3
    " >/dev/null 2>&1 || echo "NOTE: Managed Ollama PID no longer matches a server process; left unrelated processes untouched."
  fi
  rm -f "$OLLAMA_PID_FILE"
else
  echo "No Ollama process started/owned by kk-start; external Ollama instance will not be force-terminated."
fi

# Do not shut Docker Desktop if other projects' containers are still running.
OTHER_CONTAINERS="$(docker ps --format '{{.Names}}' | grep -v -x "$POSTGRES_CONTAINER" || true)"
if [[ -n "$OTHER_CONTAINERS" ]]; then
  echo "WARNING: Other Docker containers are still running:"
  printf '%s\n' "$OTHER_CONTAINERS"
  fail "Unrelated containers remain; their engine/WSL state will not be disrupted. Checkpoint is safe at $FINAL; stop unrelated containers deliberately, then rerun kk-shutdown."
else
  echo "Requesting graceful Docker Desktop shutdown via DockerCli.exe..."
  DOCKER_CLI_EXE='D:\KrishiKendram\06-Docker\DockerDesktop\DockerCli.exe'
  /mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -NonInteractive -Command "
    \$cli = '$DOCKER_CLI_EXE'
    if (-not (Test-Path -LiteralPath \$cli)) { Write-Error 'DockerCli.exe not found'; exit 2 }
    & \$cli -Shutdown
    if (\$LASTEXITCODE -ne 0) { exit \$LASTEXITCODE }
    \$deadline = (Get-Date).AddSeconds(60)
    while ((Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue) -and (Get-Date) -lt \$deadline) {
      Start-Sleep -Seconds 2
    }
    if (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue) {
      Write-Error 'Docker Desktop processes did not exit within 60 seconds'
      exit 3
    }
  " >/dev/null 2>&1 || fail "Docker Desktop graceful shutdown did not complete; checkpoint is safe at $FINAL and WSL will remain available."
  echo "PASS: Docker Desktop exited gracefully; no force-kill was performed."
fi

# Persist final status before asking Windows to stop all WSL2 distributions.
STATUS_FILE="$PROJECT_ROOT/2026-10-13_live-status.md"
cat > "$STATUS_FILE" <<EOF
# KrishiKendram Live Execution Status

Last refreshed: $(date -Is)
Lifecycle action: SAFE FULL SHUTDOWN

- PASS: recoverable checkpoint created at $FINAL
- PASS: Git bundle, staged/unstaged patches, and untracked-file archives captured for A/B/C roots.
- PASS: PostgreSQL dump validated if the container was running; see checkpoint manifest.
- PASS: PostgreSQL container stopped without deleting Docker volumes.
- PASS: API/frontend systemd units stopped and ports 3000/4000 verified clear.
- AI: only a process explicitly started and owned by kk-start is stopped. Cloud fallback remains disabled.
- Docker Desktop: graceful shutdown requested only when no unrelated containers remain; Docker backend is never force-killed.
- WSL: shutdown request follows this status write.
- No Git stage, commit, push, reset, cleanup, or promotion was performed.

Resume: run kk-start. It starts Docker Desktop if needed, starts the existing PostgreSQL container without volume reset, optionally starts local Ollama only when KK_AI_ALLOW_LOCAL_EVALUATION=true, then verifies API/UI health.
EOF
echo "PASS: final live status written."
echo "========== SAFE SHUTDOWN CHECKPOINT COMPLETE $(date -Is) =========="
echo "Requesting WSL2 shutdown now..."
/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -NonInteractive -Command "wsl.exe --shutdown" >/dev/null 2>&1 || true
