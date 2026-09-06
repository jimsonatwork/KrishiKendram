#!/usr/bin/env bash

# ============================================================
# KrishiKendram - Full Development Restart
# ============================================================
# Stops existing KrishiKendram frontend/backend processes,
# frees development ports, starts both services, and verifies
# that they remain healthy.
#
# Docker and PostgreSQL are intentionally NOT restarted here.
# Database migrations are intentionally NOT run here.
# ============================================================

set -u

# backend/scripts -> backend -> KrishiKendram
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"

FRONTEND_LOG="$PROJECT_ROOT/frontend-dev.log"
BACKEND_LOG="$PROJECT_ROOT/backend-dev.log"

FRONTEND_PORT=4000
BACKEND_PORT=3000

echo ""
echo "=========================================="
echo " KrishiKendram - Full Dev Restart"
echo "=========================================="
echo ""

# ------------------------------------------------------------
# Step 1 - Stop processes tracked by KrishiKendram
# ------------------------------------------------------------

echo "Stopping existing development servers..."

for PID_FILE in "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"; do
    if [ -f "$PID_FILE" ]; then
        PID="$(cat "$PID_FILE")"

        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping process $PID..."
            kill "$PID" 2>/dev/null || true
        fi

        rm -f "$PID_FILE"
    fi
done

# ------------------------------------------------------------
# Step 2 - Free development ports
# ------------------------------------------------------------

echo ""
echo "Checking development ports..."

for PORT in "$FRONTEND_PORT" "$BACKEND_PORT"; do
    PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"

    if [ -n "$PIDS" ]; then
        echo "Freeing port $PORT..."

        kill $PIDS 2>/dev/null || true

        sleep 1

        # Force-stop anything that still owns the port.
        REMAINING="$(lsof -ti :"$PORT" 2>/dev/null || true)"

        if [ -n "$REMAINING" ]; then
            echo "Force stopping remaining process(es) on port $PORT..."
            kill -9 $REMAINING 2>/dev/null || true
        fi
    else
        echo "Port $PORT is free."
    fi
done

# ------------------------------------------------------------
# Step 3 - Start backend
# ------------------------------------------------------------

echo ""
echo "Starting backend..."

cd "$BACKEND_DIR" || {
    echo "ERROR: Backend directory not found:"
    echo "  $BACKEND_DIR"
    exit 1
}

nohup npm run start:dev \
    > "$BACKEND_LOG" 2>&1 &

BACKEND_PID=$!

echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

echo "Backend PID: $BACKEND_PID"
echo "Backend log: $BACKEND_LOG"

# ------------------------------------------------------------
# Step 4 - Start frontend
# ------------------------------------------------------------

echo ""
echo "Starting frontend..."

cd "$FRONTEND_DIR" || {
    echo "ERROR: Frontend directory not found:"
    echo "  $FRONTEND_DIR"
    exit 1
}

nohup npm run dev \
    > "$FRONTEND_LOG" 2>&1 &

FRONTEND_PID=$!

echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

echo "Frontend PID: $FRONTEND_PID"
echo "Frontend log: $FRONTEND_LOG"

# ------------------------------------------------------------
# Step 5 - Wait for services to initialize
# ------------------------------------------------------------

echo ""
echo "Waiting for services to initialize..."

MAX_WAIT=150
WAITED=0

while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    BACKEND_LISTENING=false
    FRONTEND_LISTENING=false

    if lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        BACKEND_LISTENING=true
    fi

    if lsof -nP -iTCP:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        FRONTEND_LISTENING=true
    fi

    if [ "$BACKEND_LISTENING" = true ] && [ "$FRONTEND_LISTENING" = true ]; then
        echo "✓ Both services are listening."
        break
    fi

    sleep 1
    WAITED=$((WAITED + 1))
    echo "  Waiting... ${WAITED}s/${MAX_WAIT}s"
done
# ------------------------------------------------------------
# Step 6 - Verify backend process
# ------------------------------------------------------------

echo ""
echo "Verifying backend..."

BACKEND_OK=true

if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "✓ Backend process is running (PID $BACKEND_PID)"
else
    echo "✗ Backend process stopped unexpectedly."
    BACKEND_OK=false
fi

# ------------------------------------------------------------
# Step 7 - Verify backend port
# ------------------------------------------------------------

if lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "✓ Backend listening on port $BACKEND_PORT"
else
    echo "✗ Backend is not listening on port $BACKEND_PORT"
    BACKEND_OK=false
fi

# ------------------------------------------------------------
# Step 8 - Verify backend health endpoint
# ------------------------------------------------------------

if [ "$BACKEND_OK" = true ]; then
    HEALTH_URL="http://localhost:$BACKEND_PORT/api/v1/health"

    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
        echo "✓ Backend health endpoint responding"
    else
        echo "⚠ Backend is running, but health endpoint did not respond."
        echo "  URL: $HEALTH_URL"
    fi
fi

# ------------------------------------------------------------
# Step 9 - Verify frontend process
# ------------------------------------------------------------

echo ""
echo "Verifying frontend..."

FRONTEND_OK=true

if kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "✓ Frontend process is running (PID $FRONTEND_PID)"
else
    echo "✗ Frontend process stopped unexpectedly."
    FRONTEND_OK=false
fi

# ------------------------------------------------------------
# Step 10 - Verify frontend port
# ------------------------------------------------------------

if lsof -nP -iTCP:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "✓ Frontend listening on port $FRONTEND_PORT"
else
    echo "✗ Frontend is not listening on port $FRONTEND_PORT"
    FRONTEND_OK=false
fi

# ------------------------------------------------------------
# Step 11 - Final status
# ------------------------------------------------------------

echo ""
echo "=========================================="

if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo " KrishiKendram is READY"
    echo "=========================================="
    echo ""
    echo "✓ Backend  → http://localhost:$BACKEND_PORT"
    echo "✓ Frontend → http://localhost:$FRONTEND_PORT"
    echo ""
    echo "Logs:"
    echo "  Backend  → $BACKEND_LOG"
    echo "  Frontend → $FRONTEND_LOG"
    echo ""
    echo "Global commands:"
    echo "  kk-restart"
    echo "  kk-stop"
    echo ""

    exit 0
fi

echo " KrishiKendram restart FAILED"
echo "=========================================="
echo ""

if [ "$BACKEND_OK" != true ]; then
    echo "Backend failed to start correctly."
    echo ""
    echo "Last backend log lines:"
    tail -n 30 "$BACKEND_LOG" 2>/dev/null || true
    echo ""
fi

if [ "$FRONTEND_OK" != true ]; then
    echo "Frontend failed to start correctly."
    echo ""
    echo "Last frontend log lines:"
    tail -n 30 "$FRONTEND_LOG" 2>/dev/null || true
    echo ""
fi

exit 1