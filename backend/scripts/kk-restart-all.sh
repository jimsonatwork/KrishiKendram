#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_ROOT="/home/jj/Dev/KrishiKendram"
BACKEND_DIR="$PROJECT_ROOT/backend"
NODE_BIN="/home/jj/.nvm/versions/node/v24.18.0/bin/node"
NPM_CLI="/home/jj/.nvm/versions/node/v24.18.0/lib/node_modules/npm/bin/npm-cli.js"
export PATH="/home/jj/.nvm/versions/node/v24.18.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "KrishiKendram — build and supervised restart"
systemctl --user is-active --quiet krishikendram-frontend.service || true
cd "$BACKEND_DIR"
"$NODE_BIN" "$NPM_CLI" run build
systemctl --user daemon-reload
systemctl --user restart krishikendram-backend.service
systemctl --user restart krishikendram-frontend.service

backend_ok=false
frontend_ok=false
for _ in $(seq 1 150); do
  curl -fsS --max-time 3 http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1 && backend_ok=true || backend_ok=false
  curl -fsS --max-time 3 http://127.0.0.1:4000/ >/dev/null 2>&1 && frontend_ok=true || frontend_ok=false
  [[ "$backend_ok" == true && "$frontend_ok" == true ]] && break
  sleep 1
done
if [[ "$backend_ok" != true || "$frontend_ok" != true ]]; then
  echo "ERROR: service health check failed."
  journalctl --user -u krishikendram-backend.service -u krishikendram-frontend.service -n 50 --no-pager || true
  exit 1
fi
echo "READY: API http://localhost:3000/api/v1/health"
echo "READY: UI  http://localhost:4000/"
echo "God Mode credential refreshed on API restart. Read locally (do not paste into chat):"
echo "  $BACKEND_DIR/config/god-mode/rootpathss"
echo "  $BACKEND_DIR/config/god-mode/rootpathss.kkt"
