#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

curl -s -X POST "$BASE_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
  "identifier":"admin@example.com",
  "password":"Admin@123"
}' | jq -r '.accessToken'
