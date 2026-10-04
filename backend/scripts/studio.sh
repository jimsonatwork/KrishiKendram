#!/usr/bin/env bash
set -euo pipefail

# KrishiKendram Prisma Studio launcher.
# Uses the pinned WSL Node runtime so Windows npx/npm cannot hijack Prisma.

if [ ! -x /home/jj/.nvm/versions/node/v24.18.0/bin/node ]; then
  echo "ERROR: pinned WSL Node runtime not found: /home/jj/.nvm/versions/node/v24.18.0/bin/node" >&2
  exit 1
fi

if [ ! -f /home/jj/Dev/KrishiKendram/backend/node_modules/prisma/build/index.js ]; then
  echo "ERROR: local Prisma CLI not found under backend/node_modules." >&2
  exit 1
fi

if curl -fsS --max-time 2 http://127.0.0.1:5555/ >/dev/null 2>&1; then
  echo "Prisma Studio is already running at http://localhost:5555"
  exit 0
fi

cd /home/jj/Dev/KrishiKendram/backend
exec /home/jj/.nvm/versions/node/v24.18.0/bin/node /home/jj/Dev/KrishiKendram/backend/node_modules/prisma/build/index.js studio --schema prisma/schema.prisma --hostname 0.0.0.0 --port 5555
