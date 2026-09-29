#!/usr/bin/env bash
set +e

ROOT="/home/jj/Dev/KrishiKendram"
cd "$ROOT" || exit 1

REPORT="/tmp/krishikendram-phase1-diagnostic.txt"
: > "$REPORT"

section() {
  printf '\n\n============================================================\n' | tee -a "$REPORT"
  printf '%s\n' "$1" | tee -a "$REPORT"
  printf '============================================================\n' | tee -a "$REPORT"
}

run_cmd() {
  echo "\$ $*" | tee -a "$REPORT"
  "$@" 2>&1 | tee -a "$REPORT"
  echo "EXIT_CODE=${PIPESTATUS[0]}" | tee -a "$REPORT"
}

echo "KrishiKendram Phase 1 Diagnostic" | tee -a "$REPORT"
echo "Generated: $(date -Is)" | tee -a "$REPORT"
echo "Host: $(hostname)" | tee -a "$REPORT"

section "1. GIT STATUS"
run_cmd git status --short --branch
run_cmd git log -1 --oneline

section "2. TOOLCHAIN"
run_cmd bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null; node --version'
run_cmd bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null; npm --version'
run_cmd docker --version
run_cmd docker compose version

section "3. DOCKER RUNTIME"
run_cmd docker compose ps
echo "--- KrishiKendram containers ---" | tee -a "$REPORT"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' \
  | grep -E 'NAME|krishikendram' \
  | tee -a "$REPORT"

section "4. BACKEND HEALTH"
run_cmd curl -sS --max-time 10 http://localhost:3000/api/v1/health

section "5. FRONTEND HEALTH"
run_cmd curl -sS -I --max-time 10 http://localhost:4000

section "6. DATABASE CONNECTIVITY"
run_cmd docker exec krishikendram-postgres pg_isready -U postgres -d krishikendram

section "7. PRISMA MIGRATION STATUS"
run_cmd docker exec krishikendram-backend-1 npx prisma migrate status

section "8. BACKEND BUILD"
run_cmd bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null; npm --prefix backend run build'

section "9. FRONTEND BUILD"
run_cmd bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null; npm --prefix frontend run build'

section "10. BACKEND TEST SUITE"
run_cmd bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null; npm --prefix backend test -- --runInBand'

section "11. API CONTRACT CHECKS"

echo "--- health ---" | tee -a "$REPORT"
curl -sS --max-time 10 http://localhost:3000/api/v1/health | tee -a "$REPORT"
echo | tee -a "$REPORT"

echo "--- auth/me without credentials ---" | tee -a "$REPORT"
curl -sS -o /tmp/kk-auth-me-body.txt \
  -w 'HTTP_STATUS=%{http_code}\n' \
  --max-time 10 \
  http://localhost:3000/api/v1/auth/me | tee -a "$REPORT"

cat /tmp/kk-auth-me-body.txt | tee -a "$REPORT"

section "12. GIT INTEGRITY"
run_cmd git diff --check
run_cmd git status --short

section "13. ENHANCEMENT REGISTER"
if [ -f docs/CTO-ENHANCEMENT-REGISTER.md ]; then
  echo "Enhancement register: PRESENT" | tee -a "$REPORT"
  echo "Registered items:" | tee -a "$REPORT"
  grep -E '^### E-[0-9]+' docs/CTO-ENHANCEMENT-REGISTER.md | tee -a "$REPORT"
else
  echo "Enhancement register: MISSING" | tee -a "$REPORT"
fi

section "14. FINAL"
echo "Diagnostic completed: $(date -Is)" | tee -a "$REPORT"
echo "Secrets intentionally excluded from this report." | tee -a "$REPORT"

echo
echo "============================================================"
echo "COPYING REPORT TO WINDOWS CLIPBOARD..."
echo "============================================================"

if command -v clip.exe >/dev/null 2>&1; then
  cat "$REPORT" | clip.exe
  echo "SUCCESS: Complete report copied to Windows clipboard."
else
  echo "WARNING: clip.exe not available."
  echo "Report saved at: $REPORT"
fi
