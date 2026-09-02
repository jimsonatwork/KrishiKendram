#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/tools/kk-lib.sh"

section "KK Doctor"

docker_check
postgres_check
git_summary
empty_file_report
duplicate_report

section "Disk Usage"
du -sh "$ROOT" || true
du -sh "$ROOT/node_modules" || true

section "Prisma"
if [ -f "$ROOT/prisma/schema.prisma" ]; then
  ok "Schema found"
else
  fail "Schema missing"
fi

section "Node"
node -v || true
npm -v || true

ok "Doctor completed."
