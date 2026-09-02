#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"


echo "🌱 KrishiKendram Farm API Test"


echo ""
echo "🔐 Getting authentication token..."

TOKEN=$(./scripts/get-token.sh)


if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Token extraction failed"
  exit 1
fi


echo "✅ Token received"


echo ""
echo "🌾 Creating Farm..."


RESPONSE=$(curl -s -X POST "$BASE_URL/farms" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
"name":"Jinse Agro Farm",
"type":"AGRICULTURE_DAIRY",
"location":"Hyderabad",
"area":5,
"unit":"acre"
}')


echo "$RESPONSE" | jq


echo ""
echo "📋 My Farms"


curl -s "$BASE_URL/farms/my" \
-H "Authorization: Bearer $TOKEN" | jq


echo ""
echo "✅ Farm test completed"