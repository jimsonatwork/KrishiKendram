#!/bin/bash

set -e

echo "========================================="
echo " KrishiKendram Project Cleanup"
echo "========================================="

echo ""

# -------------------------------------------------------------------
# Remove duplicate root project-structure.txt
# -------------------------------------------------------------------

if [ -f project-structure.txt ]; then
    echo "Removing duplicate project-structure.txt..."
    rm project-structure.txt
fi

# -------------------------------------------------------------------
# Ensure reports exists
# -------------------------------------------------------------------

mkdir -p reports

# -------------------------------------------------------------------
# Ensure .gitkeep exists
# -------------------------------------------------------------------

touch reports/.gitkeep

# -------------------------------------------------------------------
# Update .gitignore
# -------------------------------------------------------------------

if [ -f .gitignore ]; then

grep -qxF "reports/*" .gitignore || echo "reports/*" >> .gitignore
grep -qxF "!reports/.gitkeep" .gitignore || echo "!reports/.gitkeep" >> .gitignore

fi

echo ""
echo "Current reports folder"

find reports | sort

echo ""
echo "Done."

