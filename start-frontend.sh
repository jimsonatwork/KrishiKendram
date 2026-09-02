#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/frontend" || exit 1

echo ""
echo "=========================================="
echo "   🚜 KrishiKendram Frontend"
echo "=========================================="
echo ""
echo "🌐 http://localhost:4000"
echo ""

npm run dev
