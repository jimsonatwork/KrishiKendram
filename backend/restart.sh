#!/bin/bash

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "======================================="
echo "   KrishiKendram Developer Toolkit"
echo "======================================="
echo ""

echo "[1/6] Stopping old backend processes..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "node.*dist/main" 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true

echo "[2/6] Starting Docker services..."
docker compose up -d

echo "[3/6] Generating Prisma Client..."
npx prisma generate

echo "[4/6] Generating reports..."
bash scripts/reports.sh

echo "[5/6] Running project analysis..."
bash scripts/analyze.sh

echo "[6/6] Starting NestJS..."
npm run start:dev

#Then make it executable once:
#Make it executable:
#chmod +x restart.sh

# type this command -> chmod +x ./restart.sh

#sed -i 's/\r$//' restart.sh



#Run it with:
#./restart.sh

#D:\Dev\KrishiKendram\backend\
#├── src\
#├── prisma\
#├── node_modules\
#├── package.json
#├── restart.sh   ← Save it here
#└── tsconfig.json

#WSL
#cd /mnt/d/Dev/KrishiKendram/backend
# to open the file nano restart.sh


