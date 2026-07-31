#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "🤖 KrishiKendram AI Intake Test"
echo ""

echo "🔐 Getting token..."

TOKEN=$(./scripts/get-token.sh)

if [ -z "$TOKEN" ]; then
  echo "❌ Token failed"
  exit 1
fi

echo "✅ Token received"
echo ""

echo "🔎 Getting latest farm..."

FARM_ID=$(curl -s "$BASE_URL/farms/my" \
-H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

echo "Farm ID: $FARM_ID"
echo ""

echo "🎤 Sending voice intake..."

curl -s -X POST "$BASE_URL/intake" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d "{
  \"farmId\":\"$FARM_ID\",
  \"inputMethod\":\"VOICE\",
  \"content\":\"Planted 2 acres rice today using tractor\"
}" | jq

echo ""

echo "📷 Sending image intake..."

curl -s -X POST "$BASE_URL/intake" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d "{
  \"farmId\":\"$FARM_ID\",
  \"inputMethod\":\"IMAGE\",
  \"content\":\"Fertilizer bill uploaded from image\"
}" | jq

echo ""

echo "📋 Verify farm records..."

curl -s "$BASE_URL/farms/$FARM_ID" \
-H "Authorization: Bearer $TOKEN" | jq '.records'

echo ""

echo "✅ Intake test completed"
