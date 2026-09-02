#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "📝 KrishiKendram Farm Record Test"


TOKEN=$(./scripts/get-token.sh)


FARM_ID=$(curl -s "$BASE_URL/farms/my" \
-H "Authorization: Bearer $TOKEN" \
| jq -r '.[0].id')


echo "Farm ID: $FARM_ID"


echo ""
echo "🌾 Adding crop activity record..."


curl -s -X POST "$BASE_URL/farms/$FARM_ID/records" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '
{
"category":"PLANTING",
"title":"Paddy planting",
"inputMethod":"VOICE",
"data":{
 "crop":"Rice",
 "area":2,
 "unit":"acre",
 "date":"2026-07-31"
}
}
' | jq



echo ""
echo "💰 Adding expense record..."


curl -s -X POST "$BASE_URL/farms/$FARM_ID/records" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '
{
"category":"EXPENSE",
"title":"Fertilizer purchase",
"inputMethod":"IMAGE",
"data":{
 "item":"Urea",
 "amount":4500,
 "vendor":"ABC Agro"
}
}
' | jq



echo ""
echo "📋 Verify Farm Records"


curl -s "$BASE_URL/farms/$FARM_ID" \
-H "Authorization: Bearer $TOKEN" | jq


echo ""
echo "✅ Record test completed"
