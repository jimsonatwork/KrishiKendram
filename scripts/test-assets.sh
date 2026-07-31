#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "🐄 KrishiKendram Farm Asset Test"

TOKEN=$(./scripts/get-token.sh)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Token failed"
  exit 1
fi

echo "✅ Token received"


echo ""
echo "🔎 Getting latest farm..."

FARM_ID=$(curl -s "$BASE_URL/farms/my" \
-H "Authorization: Bearer $TOKEN" \
| jq -r '.[0].id')


if [ -z "$FARM_ID" ] || [ "$FARM_ID" = "null" ]; then
  echo "❌ No farm found"
  exit 1
fi


echo "Farm ID: $FARM_ID"


echo ""
echo "🐄 Adding cattle asset..."

curl -s -X POST "$BASE_URL/farms/$FARM_ID/assets" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '
{
"type":"CATTLE",
"name":"HF Cow",
"quantity":10,
"unit":"count",
"metadata":{
 "breed":"Holstein Friesian",
 "age":"3 years"
}
}
' | jq


echo ""
echo "🚜 Adding equipment asset..."


curl -s -X POST "$BASE_URL/farms/$FARM_ID/assets" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '
{
"type":"TRACTOR",
"name":"Mahindra 575",
"quantity":1,
"unit":"count",
"metadata":{
 "model":"575 DI",
 "year":2025
}
}
' | jq


echo ""
echo "📋 Verify Farm"


curl -s "$BASE_URL/farms/$FARM_ID" \
-H "Authorization: Bearer $TOKEN" | jq


echo ""
echo "✅ Asset test completed"
