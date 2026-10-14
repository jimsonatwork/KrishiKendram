#!/usr/bin/env bash

# ============================================================
# KrishiKendram - Full Development Shutdown
# ============================================================
# Stops:
#   1. KrishiKendram frontend
#   2. KrishiKendram backend
#   3. Development ports
#   4. KrishiKendram Docker Compose services
#   5. Docker Desktop
#
# Safety:
#   - Docker volumes are NEVER removed.
#   - PostgreSQL data is preserved.
#   - Docker commands have hard timeouts.
#   - A stopped/unresponsive Docker Desktop cannot block exit.
#   - If Docker Desktop is already stopped, shutdown completes
#     normally.
# ============================================================

set -u

# backend/scripts -> backend -> KrishiKendram
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"

DOCKER_TIMEOUT=10

echo ""
echo "=========================================="
echo " KrishiKendram - Full Development Shutdown"
echo "=========================================="
echo ""

# ------------------------------------------------------------
# Stop a tracked development process gracefully, then force
# kill it if it does not exit within the timeout.
# ------------------------------------------------------------

stop_process() {
    local NAME="$1"
    local PID="$2"

    if ! kill -0 "$PID" 2>/dev/null; then
        echo "$NAME is not running."
        return 0
    fi

    echo "Stopping $NAME (PID $PID)..."
    kill "$PID" 2>/dev/null || true

    for _ in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "$NAME stopped."
            return 0
        fi
        sleep 1
    done

    echo "$NAME did not stop gracefully. Force stopping PID $PID..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1

    if kill -0 "$PID" 2>/dev/null; then
        echo "WARNING: Could not stop $NAME (PID $PID)."
    else
        echo "$NAME force-stopped."
    fi
}

# ------------------------------------------------------------
# Stop frontend
# ------------------------------------------------------------

if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID="$(cat "$FRONTEND_PID_FILE")"
    stop_process "Frontend" "$FRONTEND_PID"
    rm -f "$FRONTEND_PID_FILE"
else
    echo "No frontend PID file found."
fi

# ------------------------------------------------------------
# Stop backend
# ------------------------------------------------------------

if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID="$(cat "$BACKEND_PID_FILE")"
    stop_process "Backend" "$BACKEND_PID"
    rm -f "$BACKEND_PID_FILE"
else
    echo "No backend PID file found."
fi

# ------------------------------------------------------------
# Free development ports
# ------------------------------------------------------------

echo ""
echo "Checking development ports..."

for PORT in 4000 3000; do
    PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"

    if [ -n "$PIDS" ]; then
        echo "Stopping remaining process(es) on port $PORT..."
        kill $PIDS 2>/dev/null || true
        sleep 1

        REMAINING_PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"

        if [ -n "$REMAINING_PIDS" ]; then
            echo "Force stopping remaining process(es) on port $PORT..."
            kill -9 $REMAINING_PIDS 2>/dev/null || true
        fi
    else
        echo "Port $PORT is already free."
    fi
done

# ------------------------------------------------------------
# Docker helper
#
# Every Docker command gets a timeout. This is important because
# Docker Desktop may be paused, shutting down, or otherwise
# unavailable. kk-shutdown must never hang waiting for Docker.
# ------------------------------------------------------------

docker_command() {
    timeout "$DOCKER_TIMEOUT" docker "$@" 2>/dev/null
}

# ------------------------------------------------------------
# Stop KrishiKendram Docker Compose services.
#
# IMPORTANT:
#   docker compose down does NOT remove named volumes.
#   PostgreSQL data is therefore preserved.
# ------------------------------------------------------------

echo ""
echo "Checking KrishiKendram Docker services..."

cd "$PROJECT_ROOT"

COMPOSE_CONTAINERS="$(timeout "$DOCKER_TIMEOUT" docker compose ps -q 2>/dev/null || true)"

if [ -n "$COMPOSE_CONTAINERS" ]; then
    echo "Stopping KrishiKendram Docker Compose services..."

    if timeout "$DOCKER_TIMEOUT" docker compose down; then
        echo "KrishiKendram Docker Compose services stopped."
    else
        echo "WARNING: Docker Compose did not respond within ${DOCKER_TIMEOUT}s."
        echo "Continuing to Docker Desktop shutdown."
    fi
else
    echo "No running KrishiKendram Docker Compose services found."
fi

# ------------------------------------------------------------
# Docker Desktop detection and shutdown
#
# Docker Desktop is a Windows process while this script runs
# inside WSL.
#
# We intentionally use Windows PowerShell here instead of
# "docker desktop stop", because the Docker CLI itself may be
# unavailable/unresponsive when Docker Desktop is paused or
# already shutting down.
# ------------------------------------------------------------

echo ""
echo "Checking Docker Desktop..."

DOCKER_DESKTOP_PRESENT=0

if command -v powershell.exe >/dev/null 2>&1; then
    if powershell.exe -NoProfile -NonInteractive -Command \
        "if (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" \
        >/dev/null 2>&1; then
        DOCKER_DESKTOP_PRESENT=1
        echo "Docker Desktop is running."
    else
        echo "Docker Desktop is already stopped."
    fi
else
    echo "WARNING: powershell.exe is not available from WSL."
fi

# ------------------------------------------------------------
# Stop Docker Desktop if it is running.
#
# First try Docker Desktop's Windows process shutdown.
# If it does not disappear within the timeout, force terminate
# the remaining Docker Desktop process so kk-shutdown cannot
# remain stuck indefinitely.
# ------------------------------------------------------------

if [ "$DOCKER_DESKTOP_PRESENT" -eq 1 ]; then
    echo "Stopping Docker Desktop..."

    powershell.exe -NoProfile -NonInteractive -Command \
        "Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -ErrorAction SilentlyContinue" \
        >/dev/null 2>&1 || true

    DOCKER_STOPPED=0

    for _ in {1..10}; do
        if ! powershell.exe -NoProfile -NonInteractive -Command \
            "if (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" \
            >/dev/null 2>&1; then
            DOCKER_STOPPED=1
            break
        fi

        sleep 1
    done

    if [ "$DOCKER_STOPPED" -eq 1 ]; then
        echo "Docker Desktop stopped."
    else
        echo "Docker Desktop did not stop within ${DOCKER_TIMEOUT}s."
        echo "Force stopping remaining Docker Desktop process..."

        powershell.exe -NoProfile -NonInteractive -Command \
            "Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" \
            >/dev/null 2>&1 || true

        sleep 2

        if powershell.exe -NoProfile -NonInteractive -Command \
            "if (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" \
            >/dev/null 2>&1; then
            echo "WARNING: Docker Desktop process is still present."
        else
            echo "Docker Desktop force-stopped."
        fi
    fi
fi

# ------------------------------------------------------------
# Final verification
# ------------------------------------------------------------

echo ""
echo "Final shutdown verification..."

for PORT in 4000 3000 5432; do
    if lsof -ti :"$PORT" >/dev/null 2>&1; then
        echo "WARNING: Port $PORT is still in use."
    else
        echo "Port $PORT is free."
    fi
done

# Docker may already be stopped, so this check is deliberately
# timeout protected and is informational only.
REMAINING_COMPOSE="$(
    timeout "$DOCKER_TIMEOUT" docker compose ps -q 2>/dev/null || true
)"

if [ -n "$REMAINING_COMPOSE" ]; then
    echo "WARNING: KrishiKendram Docker services are still running."
else
    echo "KrishiKendram Docker services are stopped or Docker Desktop is stopped."
fi

rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"

echo ""
echo "=========================================="
echo " KrishiKendram Shutdown Complete"
echo "=========================================="
echo ""
echo " Frontend:          stopped"
echo " Backend:           stopped"
echo " PostgreSQL:        stopped"
echo " Docker Compose:    stopped"
echo " Database data:     preserved"
echo " Docker Desktop:    stopped or already stopped"
echo ""
