#!/usr/bin/env bash

set -u

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=4000

cd "$PROJECT_DIR" || exit 1

# ---------------------------------------------------------
# KrishiKendram Frontend Toolkit
# ---------------------------------------------------------

print_header() {
  echo
  echo "========================================="
  echo " KrishiKendram Frontend Toolkit (kkf)"
  echo "========================================="
  echo
}

find_port_pids() {
  lsof -t -i :"$PORT" 2>/dev/null || true
}

stop_port() {
  local pids
  pids="$(find_port_pids)"

  if [ -z "$pids" ]; then
    echo "✅ Port $PORT is free."
    return 0
  fi

  echo "⚠️  Processes using port $PORT:"
  echo "$pids"

  echo "🛑 Stopping processes on port $PORT..."

  while read -r pid; do
    [ -z "$pid" ] && continue

    kill "$pid" 2>/dev/null || true
    sleep 1

    if kill -0 "$pid" 2>/dev/null; then
      echo "⚠️  PID $pid did not stop. Force killing..."
      kill -9 "$pid" 2>/dev/null || true
    fi
  done <<< "$pids"

  sleep 1

  if [ -n "$(find_port_pids)" ]; then
    echo "❌ Port $PORT is still occupied."
    return 1
  fi

  echo "✅ Port $PORT is now free."
}

start() {
  print_header

  echo "🚀 Starting KrishiKendram frontend..."
  echo "📁 $PROJECT_DIR"
  echo "🌐 http://localhost:$PORT"
  echo

  npm run dev
}

stop() {
  print_header

  echo "🛑 Stopping frontend..."

  if stop_port; then
    echo "✅ Frontend stopped."
  else
    echo "❌ Could not free port $PORT."
    exit 1
  fi
}

restart() {
  print_header

  echo "🔄 Restarting KrishiKendram frontend..."
  echo

  stop_port || exit 1

  echo
  echo "🚀 Starting fresh Vite server..."
  echo "🌐 http://localhost:$PORT"
  echo

  npm run dev
}

status() {
  print_header

  echo "📊 Frontend Status"
  echo

  if [ -n "$(find_port_pids)" ]; then
    echo "🟢 Vite is running on port $PORT"
    echo
    lsof -i :"$PORT" 2>/dev/null || true
  else
    echo "🔴 Nothing is running on port $PORT"
  fi

  echo
  echo "📦 Node:"
  node --version 2>/dev/null || echo "❌ Node not found"

  echo
  echo "📦 npm:"
  npm --version 2>/dev/null || echo "❌ npm not found"

  echo
  echo "⚡ Vite:"
  if [ -x "./node_modules/.bin/vite" ]; then
    ./node_modules/.bin/vite --version
  else
    echo "❌ Local Vite not installed"
  fi
}

build() {
  print_header

  echo "🏗️  Building frontend..."
  echo

  npm run build
}

doctor() {
  print_header

  echo "🩺 KrishiKendram Frontend Doctor"
  echo

  echo "📁 Project:"
  echo "$PROJECT_DIR"

  echo
  echo "🔹 Node:"
  if command -v node >/dev/null 2>&1; then
    node --version
  else
    echo "❌ Node not found"
  fi

  echo
  echo "🔹 npm:"
  if command -v npm >/dev/null 2>&1; then
    npm --version
  else
    echo "❌ npm not found"
  fi

  echo
  echo "🔹 package.json:"
  if [ -f package.json ]; then
    echo "✅ Found"
  else
    echo "❌ Missing"
  fi

  echo
  echo "🔹 node_modules:"
  if [ -d node_modules ]; then
    echo "✅ Found"
  else
    echo "❌ Missing"
  fi

  echo
  echo "🔹 Vite:"
  if [ -x "./node_modules/.bin/vite" ]; then
    ./node_modules/.bin/vite --version
  else
    echo "❌ Vite not found"
  fi

  echo
  echo "🔹 Port $PORT:"
  if [ -n "$(find_port_pids)" ]; then
    echo "⚠️  Port is occupied"
    lsof -i :"$PORT" 2>/dev/null || true
  else
    echo "✅ Port is free"
  fi

  echo
  echo "🔹 TypeScript:"
  if [ -x "./node_modules/.bin/tsc" ]; then
    ./node_modules/.bin/tsc --version
  else
    echo "❌ TypeScript not found"
  fi

  echo
  echo "🩺 Doctor check complete."
}

clean() {
  print_header

  echo "🧹 Cleaning frontend build/cache..."

  rm -rf dist
  rm -rf .vite

  echo "✅ Clean complete."
}

usage() {
  print_header

  echo "Usage:"
  echo
  echo "  ./kkf restart   Restart frontend and clear port 4000"
  echo "  ./kkf start     Start Vite"
  echo "  ./kkf stop      Stop frontend"
  echo "  ./kkf status    Show frontend status"
  echo "  ./kkf build     Build frontend"
  echo "  ./kkf doctor    Diagnose frontend environment"
  echo "  ./kkf clean     Clean build/cache"
  echo
}

case "${1:-}" in
  start)
    start
    ;;

  stop)
    stop
    ;;

  restart)
    restart
    ;;

  status)
    status
    ;;

  build)
    build
    ;;

  doctor)
    doctor
    ;;

  clean)
    clean
    ;;

  *)
    usage
    exit 1
    ;;
esac