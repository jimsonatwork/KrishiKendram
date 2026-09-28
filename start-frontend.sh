#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

if command -v npm >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm)"
elif [[ -x "$HOME/.local/node24/bin/npm" ]]; then
  NPM_BIN="$HOME/.local/node24/bin/npm"
else
  echo "Node.js/npm not found. Install Node.js 24 or expose npm on PATH." >&2
  exit 1
fi

cd "$ROOT/frontend"

echo ""
echo "=========================================="
echo "   🚜 KrishiKendram Frontend"
echo "=========================================="
echo ""
echo "🌐 http://localhost:4000"
echo ""

exec "$NPM_BIN" run dev
