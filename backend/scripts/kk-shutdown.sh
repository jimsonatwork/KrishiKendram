#!/usr/bin/env bash

# ============================================================
# KrishiKendram - Shutdown Frontend + Backend
# ============================================================
# Stops the KrishiKendram frontend and backend development
# servers without stopping Docker/PostgreSQL.
# ============================================================

set -u

# backend/scripts -> backend -> KrishiKendram
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"

echo ""
echo "=========================================="
echo " KrishiKendram - Shutdown"
echo "=========================================="
echo ""

# ------------------------------------------------------------
# Stop frontend
# ------------------------------------------------------------

if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID="$(cat "$FRONTEND_PID_FILE")"

    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping frontend (PID $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
    else
        echo "Frontend is not running."
    fi

    rm -f "$FRONTEND_PID_FILE"
else
    echo "No frontend PID file found."
fi

# ------------------------------------------------------------
# Stop backend
# ------------------------------------------------------------

if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID="$(cat "$BACKEND_PID_FILE")"

    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping backend (PID $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
    else
        echo "Backend is not running."
    fi

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
    else
        echo "Port $PORT is already free."
    fi
done

echo ""
echo "=========================================="
echo " Frontend + Backend stopped"
echo " Docker/PostgreSQL NOT stopped"
echo "=========================================="
echo ""