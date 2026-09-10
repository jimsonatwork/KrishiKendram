#!/usr/bin/env bash

# ============================================================
# KrishiKendram - Full Development Shutdown
# ============================================================
# Stops the KrishiKendram frontend and backend development
# servers, frees development ports, and shuts down the
# KrishiKendram Docker Compose services.
#
# Database data is preserved because Docker volumes are not
# removed. Docker Desktop and unrelated containers are left
# running.
# ============================================================

set -u

# backend/scripts -> backend -> KrishiKendram
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"

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
# Stop KrishiKendram Docker Compose services.
#
# docker compose down removes project containers and network
# but does NOT remove named volumes, so PostgreSQL data stays.
# ------------------------------------------------------------

echo ""
echo "Checking KrishiKendram Docker services..."

cd "$PROJECT_ROOT"

COMPOSE_CONTAINERS="$(docker compose ps -q 2>/dev/null || true)"

if [ -n "$COMPOSE_CONTAINERS" ]; then
    echo "Stopping KrishiKendram Docker Compose services..."
    docker compose down
else
    echo "No running KrishiKendram Docker Compose services found."
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

REMAINING_COMPOSE="$(docker compose ps -q 2>/dev/null || true)"

if [ -n "$REMAINING_COMPOSE" ]; then
    echo "WARNING: KrishiKendram Docker services are still running."
else
    echo "KrishiKendram Docker services are stopped."
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
echo " Docker Desktop:    left running"
echo ""
