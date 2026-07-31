#!/bin/bash

echo "======================================="
echo "KrishiKendram Backend Restart"
echo "======================================="

echo ""
echo "[1/5] Stopping existing NestJS processes..."
pkill -f "nest start" 2>/dev/null
pkill -f "node.*dist" 2>/dev/null
pkill -f "ts-node" 2>/dev/null

sleep 2

echo ""
echo "[2/5] Updating project structure..."
find . \
  -path "./node_modules" -prune -o \
  -path "./dist" -prune -o \
  -path "./.git" -prune -o \
  -print | sort > project-structure.txt

echo "project-structure.txt updated."

echo ""
echo "[3/5] Checking Prisma schema..."
npx prisma generate

echo ""
echo "[4/5] Starting NestJS..."
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


