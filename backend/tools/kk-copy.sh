#!/usr/bin/env bash

# ============================================================
# KK COPY
# Universal KrishiKendram file-to-clipboard utility.
#
# STANDARD PROCEDURE
#
# Usage:
#   ./tools/kk-copy.sh <file>
#
# Examples:
#   ./tools/kk-copy.sh frontend/src/App.tsx
#   ./tools/kk-copy.sh frontend/src/lib/api.ts
#   ./tools/kk-copy.sh frontend/src/pages/admin/UsersPage.tsx
#   ./tools/kk-copy.sh backend/src/users/users.service.ts
#   ./tools/kk-copy.sh backend/prisma/schema.prisma
#
# The source file is NEVER modified.
#
# Clipboard output contains:
#   1. One empty line before the file
#   2. The complete file contents
#   3. One empty line after the file
#
# This makes pasted source easier to identify and prevents
# accidental confusion between the file contents and surrounding
# ChatGPT conversation text.
# ============================================================

set -euo pipefail

# ------------------------------------------------------------
# Project root
# ------------------------------------------------------------

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ------------------------------------------------------------
# Usage
# ------------------------------------------------------------

show_usage() {
    echo
    echo "KK COPY - Universal KrishiKendram File Clipboard Utility"
    echo
    echo "Usage:"
    echo "  $0 <file>"
    echo
    echo "Examples:"
    echo "  $0 frontend/src/App.tsx"
    echo "  $0 frontend/src/lib/api.ts"
    echo "  $0 backend/src/users/users.service.ts"
    echo "  $0 backend/prisma/schema.prisma"
    echo
}

# ------------------------------------------------------------
# Validate arguments
# ------------------------------------------------------------

if [[ $# -ne 1 ]]; then
    show_usage
    exit 1
fi

INPUT="$1"

# ------------------------------------------------------------
# Resolve file path
#
# Supports:
#   Relative project paths
#   Absolute paths
# ------------------------------------------------------------

if [[ "$INPUT" = /* ]]; then
    FILE="$INPUT"
else
    FILE="$PROJECT_ROOT/$INPUT"
fi

if command -v realpath >/dev/null 2>&1; then
    FILE="$(realpath -m "$FILE")"
fi

# ------------------------------------------------------------
# Validate file exists
# ------------------------------------------------------------

if [[ ! -f "$FILE" ]]; then
    echo
    echo "❌ File not found:"
    echo "   $INPUT"
    echo
    exit 1
fi

# ------------------------------------------------------------
# Validate Windows clipboard
# ------------------------------------------------------------

if ! command -v clip.exe >/dev/null 2>&1; then
    echo
    echo "❌ Windows clipboard 'clip.exe' is not available."
    echo
    echo "Make sure WSL can access Windows executables."
    echo
    exit 1
fi

# ------------------------------------------------------------
# Copy file contents to Windows clipboard.
#
# Exactly:
#   blank line
#   file contents
#   blank line
#
# The original file is never modified.
# ------------------------------------------------------------

if command -v python3 >/dev/null 2>&1; then

    python3 - "$FILE" <<'PY' | clip.exe
import sys

path = sys.argv[1]

with open(path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

# Remove only existing blank lines at the boundaries so that
# the clipboard always has a predictable structure.
content = content.strip("\n")

# One empty line before the file.
sys.stdout.write("\n")

# Complete file contents.
sys.stdout.write(content)

# One empty line after the file.
sys.stdout.write("\n\n")
PY

else

    {
        printf '\n'
        cat "$FILE"
        printf '\n\n'
    } | clip.exe

fi

# ------------------------------------------------------------
# Display useful information
# ------------------------------------------------------------

if [[ "$FILE" == "$PROJECT_ROOT/"* ]]; then
    DISPLAY_FILE="${FILE#$PROJECT_ROOT/}"
else
    DISPLAY_FILE="$FILE"
fi

LINE_COUNT="$(wc -l < "$FILE" | tr -d ' ')"
FILE_SIZE="$(du -h "$FILE" | cut -f1)"

echo
echo "============================================================"
echo "✅ FILE COPIED TO WINDOWS CLIPBOARD"
echo "============================================================"
echo
echo "File : $DISPLAY_FILE"
echo "Lines: $LINE_COUNT"
echo "Size : $FILE_SIZE"
echo
echo "Clipboard format:"
echo "  [empty line]"
echo "  [complete file]"
echo "  [empty line]"
echo
echo "Paste with Ctrl+V."
echo