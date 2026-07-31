#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT="$ROOT/reports/latest/analysis"

mkdir -p "$REPORT"

echo "========================================="
echo "Analyzing Project..."
echo "========================================="

# Empty folders
find "$ROOT/src" -type d -empty | sort > "$REPORT/empty-folders.txt"

# Duplicate filenames
find "$ROOT/src" -type f | xargs -n1 basename | sort | uniq -d > "$REPORT/duplicate-files.txt"

# Large source files (>300 lines)
find "$ROOT/src" -name "*.ts" | while read -r file
do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 300 ]; then
        echo "$lines $file"
    fi
done | sort -nr > "$REPORT/large-files.txt"

# TODO/FIXME
grep -RInE "TODO|FIXME" "$ROOT/src" > "$REPORT/todo.txt" || true

echo "Analysis complete."