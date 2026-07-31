#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "🔧 KrishiKendram Farm CRUD Test"

TOKEN=$(./scripts/get-token.sh)

if [ -z "$TOKEN" ]; then
  echo "❌ Token failed"
  exit 1
fi


echo ""
echo "🔎 Getting farm list..."

FARM_ID=$(curl -s "$BASE_URL/farms/my" \
-H "Authorization: Bearer $TOKEN" \
| jq -r '.[0].id')


echo "Farm ID: $FARM_ID"


echo ""
echo "📄 GET FARM"

curl -s "$BASE_URL/farms/$FARM_ID" \
-H "Authorization: Bearer $TOKEN" | jq


echo ""
echo "✏️ UPDATE FARM"

curl -s -X PATCH "$BASE_URL/farms/$FARM_ID" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '
{
"description":"AI managed smart farm",
"location":"Hyderabad Telangana"
}
' | jq


echo ""
echo "📄 VERIFY UPDATE"

curl -s "$BASE_URL/farms/$FARM_ID" \
-H "Authorization: Bearer $TOKEN" | jq


echo ""
echo "✅ CRUD test completed"
