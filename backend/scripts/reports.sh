#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

REPORT="$ROOT/reports/latest"
ANALYSIS="$REPORT/analysis"

mkdir -p "$REPORT"
mkdir -p "$ANALYSIS"

echo "Generating reports..."

find "$ROOT" \
\( \
-path "$ROOT/node_modules" \
-o -path "$ROOT/dist" \
-o -path "$ROOT/.git" \
\) -prune -o -print | sort > "$REPORT/project-structure.txt"

find "$ROOT/src" -type f | sort > "$REPORT/project-src.txt"

cp "$ROOT/prisma/schema.prisma" \
"$REPORT/project-prisma.txt"

cat "$ROOT/package.json" \
> "$REPORT/project-package.json"

npm list --depth=0 \
> "$REPORT/project-dependencies.txt"

git status \
> "$REPORT/project-git.txt"

echo "Reports generated."