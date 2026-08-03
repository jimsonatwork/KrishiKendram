#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "🌱 KrishiKendram Crop API Test"

TOKEN=$(./scripts/get-token.sh)

echo "Token received"

FARM_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/farms/my" | \
  jq -r '.[0].id')

echo "Farm ID: $FARM_ID"


echo "Creating crop..."

curl -X POST \
"$BASE_URL/crops" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d "{
  \"farmId\":\"$FARM_ID\",
  \"name\":\"Rice\",
  \"variety\":\"BPT 5204\",
  \"season\":\"KHARIF\",
  \"area\":3,
  \"unit\":\"acre\",
  \"notes\":\"First crop test\"
}" | jq


echo ""
echo "Listing crops..."

curl -s \
-H "Authorization: Bearer $TOKEN" \
"$BASE_URL/crops" | jq
