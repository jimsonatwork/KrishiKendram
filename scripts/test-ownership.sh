#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

PASS=0
FAIL=0

check() {
  local NAME="$1"
  local EXPECTED="$2"
  local ACTUAL="$3"

  if [ "$ACTUAL" = "$EXPECTED" ]; then
    echo "✅ $NAME → $ACTUAL"
    PASS=$((PASS + 1))
  else
    echo "❌ $NAME → expected $EXPECTED, got $ACTUAL"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔐 KrishiKendram Ownership Security Test"
echo "========================================"

echo ""
echo "👤 Creating Farmer A..."

USER_A="security.a.$(date +%s)@example.com"
USER_B="security.b.$(date +%s)@example.com"
PASSWORD="Test@12345"

REGISTER_A=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Security Farmer A\",
    \"email\":\"$USER_A\",
    \"password\":\"$PASSWORD\"
  }")

TOKEN_A=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\":\"$USER_A\",
    \"password\":\"$PASSWORD\"
  }" | jq -r '.accessToken')

if [ -z "$TOKEN_A" ] || [ "$TOKEN_A" = "null" ]; then
  echo "❌ Farmer A authentication failed"
  echo "$REGISTER_A" | jq
  exit 1
fi

echo "✅ Farmer A authenticated"

echo ""
echo "👤 Creating Farmer B..."

REGISTER_B=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Security Farmer B\",
    \"email\":\"$USER_B\",
    \"password\":\"$PASSWORD\"
  }")

TOKEN_B=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\":\"$USER_B\",
    \"password\":\"$PASSWORD\"
  }" | jq -r '.accessToken')

if [ -z "$TOKEN_B" ] || [ "$TOKEN_B" = "null" ]; then
  echo "❌ Farmer B authentication failed"
  echo "$REGISTER_B" | jq
  exit 1
fi

echo "✅ Farmer B authenticated"

echo ""
echo "🌾 Creating Farm A..."

FARM_A=$(curl -s -X POST "$BASE_URL/farms" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Security Farm A",
    "type":"AGRICULTURE_DAIRY",
    "location":"Hyderabad",
    "area":5,
    "unit":"acre"
  }')

FARM_A_ID=$(echo "$FARM_A" | jq -r '.id')

if [ -z "$FARM_A_ID" ] || [ "$FARM_A_ID" = "null" ]; then
  echo "❌ Farm A creation failed"
  echo "$FARM_A" | jq
  exit 1
fi

echo "✅ Farm A: $FARM_A_ID"

echo ""
echo "🌾 Creating Farm B..."

FARM_B=$(curl -s -X POST "$BASE_URL/farms" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Security Farm B",
    "type":"AGRICULTURE_DAIRY",
    "location":"Hyderabad",
    "area":5,
    "unit":"acre"
  }')

FARM_B_ID=$(echo "$FARM_B" | jq -r '.id')

if [ -z "$FARM_B_ID" ] || [ "$FARM_B_ID" = "null" ]; then
  echo "❌ Farm B creation failed"
  echo "$FARM_B" | jq
  exit 1
fi

echo "✅ Farm B: $FARM_B_ID"

echo ""
echo "🚜 Creating asset under Farm B..."

ASSET_B=$(curl -s -X POST "$BASE_URL/farms/$FARM_B_ID/assets" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"TRACTOR",
    "name":"Security Tractor B",
    "quantity":1,
    "unit":"count",
    "metadata":{
      "model":"Security Test"
    }
  }')

ASSET_B_ID=$(echo "$ASSET_B" | jq -r '.id')

if [ -z "$ASSET_B_ID" ] || [ "$ASSET_B_ID" = "null" ]; then
  echo "❌ Asset creation failed"
  echo "$ASSET_B" | jq
  exit 1
fi

echo "✅ Asset B: $ASSET_B_ID"

echo ""
echo "🔒 Testing Farm ownership..."
echo "----------------------------"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/farms/$FARM_B_ID" \
  -H "Authorization: Bearer $TOKEN_A")
check "Farmer A GET Farm B" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE_URL/farms/$FARM_B_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"HACKED FARM"}')
check "Farmer A PATCH Farm B" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/farms/$FARM_B_ID" \
  -H "Authorization: Bearer $TOKEN_A")
check "Farmer A DELETE Farm B" "403" "$STATUS"

echo ""
echo "🔒 Testing Asset ownership..."
echo "-----------------------------"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/farms/$FARM_B_ID/assets" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"TRACTOR",
    "name":"Unauthorized Tractor",
    "quantity":1,
    "unit":"count"
  }')
check "Farmer A ADD asset to Farm B" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE_URL/farms/$FARM_B_ID/assets/$ASSET_B_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"TRACTOR",
    "name":"HACKED TRACTOR",
    "quantity":99,
    "unit":"count"
  }')
check "Farmer A PATCH Asset B" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/farms/$FARM_B_ID/assets/$ASSET_B_ID" \
  -H "Authorization: Bearer $TOKEN_A")
check "Farmer A DELETE Asset B" "403" "$STATUS"

echo ""
echo "🔒 Testing Record ownership..."
echo "------------------------------"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/farms/$FARM_B_ID/records" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "category":"GENERAL",
    "inputMethod":"MANUAL",
    "title":"Unauthorized Record",
    "data":{
      "test":"ownership"
    }
  }')
check "Farmer A ADD record to Farm B" "403" "$STATUS"

echo ""
echo "========================================"
echo "🔐 Ownership Security Result"
echo "========================================"
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "🎉 ALL OWNERSHIP TESTS PASSED"
  exit 0
else
  echo ""
  echo "🚨 OWNERSHIP SECURITY TEST FAILED"
  exit 1
fi
