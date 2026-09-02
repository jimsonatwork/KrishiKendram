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

echo "🌱 KrishiKendram Crop Ownership Security Test"
echo "=============================================="

USER_A="crop.security.a.$(date +%s)@example.com"
USER_B="crop.security.b.$(date +%s)@example.com"
PASSWORD="Test@12345"

echo ""
echo "👤 Creating Farmer A..."

curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Crop Security Farmer A\",
    \"email\":\"$USER_A\",
    \"password\":\"$PASSWORD\"
  }" > /dev/null

TOKEN_A=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\":\"$USER_A\",
    \"password\":\"$PASSWORD\"
  }" | jq -r '.accessToken')

if [ -z "$TOKEN_A" ] || [ "$TOKEN_A" = "null" ]; then
  echo "❌ Farmer A authentication failed"
  exit 1
fi

echo "✅ Farmer A authenticated"

echo ""
echo "👤 Creating Farmer B..."

curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Crop Security Farmer B\",
    \"email\":\"$USER_B\",
    \"password\":\"$PASSWORD\"
  }" > /dev/null

TOKEN_B=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\":\"$USER_B\",
    \"password\":\"$PASSWORD\"
  }" | jq -r '.accessToken')

if [ -z "$TOKEN_B" ] || [ "$TOKEN_B" = "null" ]; then
  echo "❌ Farmer B authentication failed"
  exit 1
fi

echo "✅ Farmer B authenticated"

echo ""
echo "🌾 Creating Farm A..."

FARM_A=$(curl -s -X POST "$BASE_URL/farms" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Crop Security Farm A",
    "type":"AGRICULTURE_DAIRY",
    "location":"Hyderabad",
    "area":5,
    "unit":"acre"
  }')

FARM_A_ID=$(echo "$FARM_A" | jq -r '.id')

if [ -z "$FARM_A_ID" ] || [ "$FARM_A_ID" = "null" ]; then
  echo "❌ Farm A creation failed"
  exit 1
fi

echo "✅ Farm A: $FARM_A_ID"

echo ""
echo "🌾 Creating Farm B..."

FARM_B=$(curl -s -X POST "$BASE_URL/farms" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Crop Security Farm B",
    "type":"AGRICULTURE_DAIRY",
    "location":"Hyderabad",
    "area":5,
    "unit":"acre"
  }')

FARM_B_ID=$(echo "$FARM_B" | jq -r '.id')

if [ -z "$FARM_B_ID" ] || [ "$FARM_B_ID" = "null" ]; then
  echo "❌ Farm B creation failed"
  exit 1
fi

echo "✅ Farm B: $FARM_B_ID"

echo ""
echo "🌱 Farmer B creating Crop B..."

CROP_B=$(curl -s -X POST "$BASE_URL/crops" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d "{
    \"farmId\":\"$FARM_B_ID\",
    \"name\":\"Security Rice B\",
    \"variety\":\"BPT 5204\",
    \"season\":\"KHARIF\",
    \"status\":\"PLANNED\",
    \"area\":3,
    \"unit\":\"acre\",
    \"notes\":\"Ownership security test\"
  }")

CROP_B_ID=$(echo "$CROP_B" | jq -r '.id')

if [ -z "$CROP_B_ID" ] || [ "$CROP_B_ID" = "null" ]; then
  echo "❌ Crop B creation failed"
  echo "$CROP_B" | jq
  exit 1
fi

echo "✅ Crop B: $CROP_B_ID"

echo ""
echo "🔒 Testing crop ownership..."
echo "----------------------------"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/crops/$CROP_B_ID" \
  -H "Authorization: Bearer $TOKEN_A")
check "Farmer A GET Crop B" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE_URL/crops/$CROP_B_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"HACKED CROP"}')
check "Farmer A PATCH Crop B" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/crops/$CROP_B_ID" \
  -H "Authorization: Bearer $TOKEN_A")
check "Farmer A DELETE Crop B" "403" "$STATUS"

echo ""
echo "🔒 Testing cross-owner crop creation..."
echo "---------------------------------------"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/crops" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d "{
    \"farmId\":\"$FARM_B_ID\",
    \"name\":\"Unauthorized Crop\",
    \"variety\":\"Security Test\",
    \"season\":\"KHARIF\",
    \"status\":\"PLANNED\",
    \"area\":1,
    \"unit\":\"acre\"
  }")
check "Farmer A CREATE crop on Farm B" "404" "$STATUS"

echo ""
echo "🔒 Testing crop listing isolation..."
echo "-------------------------------------"

CROPS_A=$(curl -s \
  "$BASE_URL/crops" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$CROPS_A" | jq -e --arg id "$CROP_B_ID" '.[] | select(.id == $id)' > /dev/null; then
  echo "❌ Farmer A can see Farmer B's Crop"
  FAIL=$((FAIL + 1))
else
  echo "✅ Farmer A cannot see Farmer B's Crop"
  PASS=$((PASS + 1))
fi

echo ""
echo "=============================================="
echo "🌱 Crop Ownership Security Result"
echo "=============================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "🎉 ALL CROP OWNERSHIP TESTS PASSED"
  exit 0
else
  echo ""
  echo "🚨 CROP OWNERSHIP SECURITY TEST FAILED"
  exit 1
fi
