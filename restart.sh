#!/bin/bash

echo "========================================"
echo "KrishiKendram Backend Restart"
echo "========================================"

echo
echo "[1/5] Processes using port 3000"
lsof -i :3000

echo
echo "[2/5] Killing processes..."

PIDS=$(lsof -ti :3000)

if [ ! -z "$PIDS" ]; then
    echo "Killing PIDs: $PIDS"
    kill -9 $PIDS
fi

pkill -9 -f "nest.js start --watch" 2>/dev/null
pkill -9 -f "@nestjs/cli" 2>/dev/null
pkill -9 -f "node.*dist" 2>/dev/null

sleep 2

echo
echo "[3/5] Verifying port"

if lsof -i :3000 >/dev/null; then
    echo "❌ Port 3000 is still in use"
    lsof -i :3000
    exit 1
else
    echo "✅ Port 3000 is free"
fi

echo
echo "[4/5] Starting backend"

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


