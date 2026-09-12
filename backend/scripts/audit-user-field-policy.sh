#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="$ROOT/backend"

FIELD_FILE="$BACKEND/src/platform/registry/definitions/fields/user-field-definitions.ts"
RESOURCE_FILE="$BACKEND/src/platform/registry/definitions/resources/user.resource.ts"
USERS_SERVICE="$BACKEND/src/users/users.service.ts"
AUTH_SERVICE="$BACKEND/src/auth/auth.service.ts"
AUTH_CONTROLLER="$BACKEND/src/auth/auth.controller.ts"

cd "$ROOT"

failures=0

section() {
  echo
  echo "========== $1 =========="
}

section "1. USER WRITE PATHS"

grep -RIn \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  -E '(prisma|tx)\.user\.(create|createMany|update|updateMany|upsert)' \
  "$BACKEND/src" || true

echo
echo "Checking service boundary..."

OUTSIDE_WRITES="$(
  grep -RIn \
    --include='*.ts' \
    --exclude='*.spec.ts' \
    -E '(prisma|tx)\.user\.(create|createMany|update|updateMany|upsert)' \
    "$BACKEND/src" |
  grep -vE '/(users/users\.service|auth/auth\.service)\.ts:' || true
)"

if [[ -n "$OUTSIDE_WRITES" ]]; then
  echo "REVIEW REQUIRED: User writes outside UsersService/AuthService:"
  echo "$OUTSIDE_WRITES"
else
  echo "PASS: All User writes are inside UsersService/AuthService."
fi

section "2. CANONICAL USER FIELD DEFINITIONS"

EXPECTED_FIELDS=(
  userPassword
  userName
  userEmail
  userMobile
  userPreferredLanguage
  userProfileCompletion
  userRole
  userStatus
  userPreferredInputMethod
  userVerified
)

for field in "${EXPECTED_FIELDS[@]}"; do
  count="$(
    grep -c "name: '$field'" "$FIELD_FILE" || true
  )"

  if [[ "$count" -eq 1 ]]; then
    echo "PASS: $field"
  elif [[ "$count" -eq 0 ]]; then
    echo "FAIL: Missing $field"
    failures=$((failures + 1))
  else
    echo "FAIL: Duplicate $field ($count definitions)"
    failures=$((failures + 1))
  fi
done

section "3. USER RESOURCE DEFINITIONS"

echo "Resource definition references:"

python3 - "$RESOURCE_FILE" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()

# Capture the actual `fields` object only.
match = re.search(
    r'fields:\s*\{(.*?)\n\s*\},\n\s*\n\s*ownerField:',
    text,
    re.S,
)

if not match:
    print("FAIL: Could not locate user resource fields block.")
    sys.exit(1)

body = match.group(1)

# Resource entries are exactly the four-space-indented keys inside fields.
entries = re.finditer(
    r'(?ms)^\s{4}([A-Za-z][A-Za-z0-9]*):\s*\{\s*'
    r'definition:\s*\'([^\']+)\''
    r'.*?^\s{4}\},',
    body,
)

found = list(entries)

if not found:
    print("FAIL: No user resource fields found.")
    sys.exit(1)

for match in found:
    print(f"  {match.group(1)} -> {match.group(2)}")
PY

echo
echo "Checking referenced definitions..."

python3 - "$RESOURCE_FILE" "$FIELD_FILE" <<'PY'
from pathlib import Path
import re
import sys

resource = Path(sys.argv[1]).read_text()
fields = Path(sys.argv[2]).read_text()

resource_match = re.search(
    r'fields:\s*\{(.*?)\n\s*\},\n\s*\n\s*ownerField:',
    resource,
    re.S,
)

if not resource_match:
    print("FAIL: Could not locate user resource fields.")
    sys.exit(1)

body = resource_match.group(1)

entries = re.finditer(
    r'(?ms)^\s{4}([A-Za-z][A-Za-z0-9]*):\s*\{\s*'
    r'definition:\s*\'([^\']+)\''
    r'.*?^\s{4}\},',
    body,
)

failures = 0

for match in entries:
    resource_field = match.group(1)
    definition = match.group(2)

    count = len(re.findall(
        rf"name:\s*'{re.escape(definition)}'",
        fields,
    ))

    if count == 1:
        print(f"PASS: {resource_field} -> {definition}")
    elif count == 0:
        print(f"FAIL: {resource_field} -> missing {definition}")
        failures += 1
    else:
        print(f"FAIL: {resource_field} -> duplicate {definition}")
        failures += 1

sys.exit(1 if failures else 0)
PY

section "4. PASSWORD POLICY DUPLICATION"

echo "Searching auth/users DTOs and services for hard-coded password rules..."

PASSWORD_RULES="$(
  grep -RIn \
    --include='*.ts' \
    --exclude='*.spec.ts' \
    -E \
    '(@MinLength|@MaxLength|@Length|password.*(minLength|maxLength|minimum|maximum))' \
    "$BACKEND/src/auth" "$BACKEND/src/users" || true
)"

if [[ -n "$PASSWORD_RULES" ]]; then
  echo "$PASSWORD_RULES"
  echo
  echo "REVIEW: These rules may be transport-level constraints."
  echo "Canonical business password policy remains Registry userPassword."
else
  echo "PASS: No obvious duplicated password policy rules."
fi

section "5. DTO VALIDATION INVENTORY"

for file in \
  "$BACKEND/src/auth/dto/register.dto.ts" \
  "$BACKEND/src/auth/dto/login.dto.ts" \
  "$BACKEND/src/users/dto/create-user.dto.ts" \
  "$BACKEND/src/users/dto/update-user.dto.ts"
do
  if [[ ! -f "$file" ]]; then
    continue
  fi

  echo
  echo "--- ${file#"$ROOT/"} ---"

  grep -nE \
    '@(MinLength|MaxLength|Length|Matches|IsEmail|IsEnum|IsInt|Min|Max|IsBoolean|IsNotEmpty|IsOptional)' \
    "$file" || echo "No matching decorators."
done

section "6. REGISTRY VALIDATION COVERAGE"

echo "-- UsersService --"

grep -n -B2 -A4 \
  -E 'validate(Field|ResourceField)' \
  "$USERS_SERVICE" || true

echo
echo "-- AuthService --"

grep -n -B2 -A4 \
  -E 'validate(Field|ResourceField)' \
  "$AUTH_SERVICE" || true

section "7. SECURITY-SENSITIVE FIELD EXPOSURE"

if grep -nE \
  '^[[:space:]]*(password|passwordHash|refreshTokenHash|userPassword)[[:space:]]*:' \
  "$RESOURCE_FILE"; then
  echo "FAIL: Sensitive field appears in userResource."
  failures=$((failures + 1))
else
  echo "PASS: Password/hash fields are not exposed through userResource."
fi

section "8. CANONICAL PASSWORD VALIDATION"

if grep -q "validateField(" "$AUTH_SERVICE" &&
   grep -q "'userPassword'" "$AUTH_SERVICE"; then
  echo "PASS: AuthService uses Registry userPassword."
else
  echo "FAIL: AuthService missing canonical userPassword validation."
  failures=$((failures + 1))
fi

if grep -q "validateField(" "$USERS_SERVICE" &&
   grep -q "'userPassword'" "$USERS_SERVICE"; then
  echo "PASS: UsersService uses Registry userPassword."
else
  echo "FAIL: UsersService missing canonical userPassword validation."
  failures=$((failures + 1))
fi

section "9. CANONICAL RESOURCE VALIDATION"

for field in \
  role \
  status \
  preferredInputMethod \
  isVerified
do
  if grep -q "validateResourceField(" "$USERS_SERVICE" &&
     grep -q "'$field'" "$USERS_SERVICE"; then
    echo "PASS: $field"
  else
    echo "FAIL: $field missing Registry resource validation."
    failures=$((failures + 1))
  fi
done

section "10. AUTH CONTROLLER USER WRITE BOUNDARY"

if grep -nE \
  '(prisma|tx)\.user\.(create|createMany|update|updateMany|upsert)' \
  "$AUTH_CONTROLLER"; then
  echo
  echo "FAIL: AuthController contains a direct User write."
  echo "Authentication/session User writes must be owned by AuthService."
  failures=$((failures + 1))
else
  echo "PASS: AuthController contains no direct User writes."
  echo "Authentication/session User writes are owned by AuthService."
fi

section "11. DUPLICATE FIELD CHECK"

INTEGER_FIELD_COUNT="$(
  grep -c     "name: 'userProfileCompletionIntegerField'"     "$FIELD_FILE" || true
)"

if [[ "$INTEGER_FIELD_COUNT" -le 1 ]]; then
  echo "PASS: No duplicate integer field block."
else
  echo "FAIL: Duplicate integer field block detected ($INTEGER_FIELD_COUNT definitions)."
  failures=$((failures + 1))
fi

section "12. DIFF CHECK"

if git diff --check; then
  echo "PASS"
else
  echo "FAIL"
  failures=$((failures + 1))
fi

section "13. TYPECHECK"

if (
  cd "$BACKEND"
  npx tsc --noEmit
); then
  echo "PASS"
else
  echo "FAIL"
  failures=$((failures + 1))
fi

section "14. TARGETED TESTS"

if (
  cd "$BACKEND"
  npx jest \
    src/users/users.service.spec.ts \
    src/platform/registry \
    --runInBand
); then
  echo "PASS"
else
  echo "FAIL"
  failures=$((failures + 1))
fi

section "FINAL RESULT"

echo "Application-code failures: $failures"

echo
echo "NOTE:"
echo "Authentication/session User writes are intentionally owned by AuthService."
echo "AuthController is not a User persistence boundary."

if (( failures == 0 )); then
  echo
  echo "============================================================"
  echo " PASS — User field-policy audit completed."
  echo "============================================================"
  exit 0
else
  echo
  echo "============================================================"
  echo " REVIEW REQUIRED — $failures issue(s) detected."
  echo "============================================================"
  exit 1
fi
