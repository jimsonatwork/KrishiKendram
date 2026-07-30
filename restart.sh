#!/bin/bash

# Stop any running NestJS processes
pkill -f "start:dev" 2>/dev/null
pkill -f "nest" 2>/dev/null
pkill -f "node.*dist" 2>/dev/null

# Wait for processes to exit
sleep 2

# Start the NestJS development server
npm run start:dev

#Then make it executable once:
# type this command -> chmod +x restart.sh

#sed -i 's/\r$//' restart.sh

#Make it executable:
#chmod +x restart.sh

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


