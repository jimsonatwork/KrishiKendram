#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/tools/kk-lib.sh"

DISK_CHECK=false

if [ "${1:-}" = "--disk" ]; then
  DISK_CHECK=true
fi

section "KK Doctor"

docker_check
postgres_check
git_summary
empty_file_report
duplicate_report

if [ "$DISK_CHECK" = true ]; then
  section "Disk Usage"

  du -sh "$ROOT" || true

  if [ -d "$ROOT/node_modules" ]; then
    du -sh "$ROOT/node_modules" || true
  fi
else
  section "Disk Usage"
  info "Disk usage check skipped."
  info "Run './kk doctor --disk' to perform the disk scan."
fi

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