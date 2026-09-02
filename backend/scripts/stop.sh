#!/bin/bash

pkill -f "nest start" 2>/dev/null
pkill -f "node.*dist" 2>/dev/null

echo "KrishiKendram backend stopped"
