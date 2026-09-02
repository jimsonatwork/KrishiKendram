#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
  "identifier":"admin@example.com",
  "password":"Admin@123"
}' | jq -r '.accessToken')

echo ""
echo "=================================="
echo "TOKEN READY"
echo "=================================="

echo ""
echo "---- USERS ----"
curl -s "$BASE_URL/users" \
-H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "---- UPDATE USER ----"

curl -s -X PATCH "$BASE_URL/users/cms7vzqlj0000tjaitl7i2er6" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "status":"ACTIVE"
}' | jq

echo ""
echo "---- CREATE FARM ----"

curl -s -X POST "$BASE_URL/farms" \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "name":"Demo Farm",
  "location":"Hyderabad",
  "area":5,
  "unit":"acre"
}' | jq

echo ""
echo "---- MY FARMS ----"

curl -s "$BASE_URL/farms/my" \
-H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "=================================="
echo "API TEST COMPLETED"
echo "=================================="