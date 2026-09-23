#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SEED="backend/prisma/seed.ts"
PERMISSION_SERVICE="backend/src/platform/authorization/permission.service.ts"
PERMISSION_SPEC="backend/src/platform/authorization/permission.service.spec.ts"
AUTH_MODULE="backend/src/platform/authorization/authorization.module.ts"

timestamp="$(date +%Y%m%d-%H%M%S)"

echo "============================================================"
echo "KrishiKendram — Permission Persistence Ownership"
echo "============================================================"
echo "Root: $ROOT"
echo "HEAD: $(git rev-parse --short HEAD)"
echo

fail() {
  echo
  echo "ERROR: $*"
  exit 1
}

backup_file() {
  local file="$1"
  local backup="${file}.bak.${timestamp}"

  cp -a "$file" "$backup"
  echo "BACKUP: $backup"
}

echo "===== GIT BASELINE ====="
git status --short
echo
git log -1 --oneline
echo

echo "===== VERIFY REQUIRED EXISTING FILES ====="

for file in \
  "$SEED" \
  "$PERMISSION_SERVICE" \
  "$PERMISSION_SPEC" \
  "$AUTH_MODULE"
do
  [[ -f "$file" ]] || fail "Required file missing: $file"
  echo "OK   $file"
done

echo

echo "===== VERIFY CLEAN SEED STATE ====="

grep -Fq "PrismaClient" "$SEED" \
  || fail "Expected PrismaClient import not found in clean seed."

grep -Fq "const prisma = new PrismaClient();" "$SEED" \
  || fail "Expected direct PrismaClient construction not found."

grep -Fq "await prisma.permission.findFirst(" "$SEED" \
  || fail "Expected direct Permission persistence not found."

grep -Fq "await prisma.permission.create(" "$SEED" \
  || fail "Expected direct Permission create not found."

grep -Fq "await prisma.rolePermission.findFirst(" "$SEED" \
  || fail "Expected direct RolePermission persistence not found."

grep -Fq "await prisma.rolePermission.create(" "$SEED" \
  || fail "Expected direct RolePermission create not found."

if grep -Fq "PermissionService" "$SEED"; then
  fail "Seed already contains PermissionService; refusing to transform an unexpected state."
fi

if grep -Fq "PrismaService" "$SEED"; then
  fail "Seed already contains PrismaService; refusing to transform an unexpected state."
fi

echo "PASS: seed is in the expected pre-migration state."
echo

echo "===== VERIFY PERMISSION SERVICE ====="

grep -Fq "export class PermissionService" "$PERMISSION_SERVICE" \
  || fail "PermissionService class not found."

grep -Fq "async ensurePermission(" "$PERMISSION_SERVICE" \
  || fail "PermissionService.ensurePermission() not found."

grep -Fq "async reconcileRolePermissions(" "$PERMISSION_SERVICE" \
  || fail "PermissionService.reconcileRolePermissions() not found."

echo "PASS: PermissionService contract verified."
echo

echo "===== VERIFY PERMISSION SERVICE TESTS ====="

grep -Fq "ensurePermission" "$PERMISSION_SPEC" \
  || fail "PermissionService ensurePermission tests not found."

grep -Fq "reconcileRolePermissions" "$PERMISSION_SPEC" \
  || fail "PermissionService reconcileRolePermissions tests not found."

echo "PASS: PermissionService focused tests verified."
echo

echo "===== VERIFY AUTHORIZATION MODULE ====="

grep -Fq "PermissionService" "$AUTH_MODULE" \
  || fail "PermissionService is not wired into AuthorizationModule."

echo "PASS: AuthorizationModule wiring verified."
echo

echo "===== BACK UP SEED ====="

backup_file "$SEED"
echo

echo "===== MIGRATE SEED PERSISTENCE ====="

python3 - "$SEED" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text()

# ------------------------------------------------------------
# 1. Replace PrismaClient/UserRole import with UserRole only.
# ------------------------------------------------------------

old_import = """import {
  PrismaClient,
  UserRole,
} from '@prisma/client';"""

new_import = """import { UserRole } from '@prisma/client';

import { PrismaService } from '../src/prisma/prisma.service';
import { PermissionService } from '../src/platform/authorization/permission.service';"""

if old_import not in text:
    raise SystemExit(
        "ERROR: Expected original multiline PrismaClient/UserRole import was not found."
    )

text = text.replace(old_import, new_import, 1)

# ------------------------------------------------------------
# 2. Replace direct PrismaClient construction.
# ------------------------------------------------------------

old_construction = "const prisma = new PrismaClient();"

new_construction = """const prisma = new PrismaService();
const permissionService = new PermissionService(prisma);"""

if old_construction not in text:
    raise SystemExit(
        "ERROR: Expected 'const prisma = new PrismaClient();' was not found."
    )

text = text.replace(old_construction, new_construction, 1)

# ------------------------------------------------------------
# 3. Replace ensurePermission() implementation.
#
# Keep action/scope as strings because the seed's registry
# compatibility helpers intentionally expose strings.
# ------------------------------------------------------------

# Replace ensurePermission() by deterministic source boundaries.
start_marker = "async function ensurePermission("
end_marker = "\n\n// Seed reconciliation"

start = text.find(start_marker)
if start == -1:
    raise SystemExit("ERROR: ensurePermission() start marker was not found.")

end = text.find(end_marker, start)
if end == -1:
    raise SystemExit("ERROR: ensurePermission() end marker was not found.")

replacement = (
    "async function ensurePermission(\n"
    "  module: string,\n"
    "  resource: string,\n"
    "  action: string,\n"
    "  scope: string,\n"
    ") {\n"
    "  return permissionService.ensurePermission({\n"
    "    module,\n"
    "    resource,\n"
    "    action,\n"
    "    scope,\n"
    "  });\n"
    "}"
)

text = text[:start] + replacement + text[end:]

# ------------------------------------------------------------
# 4. Replace reconcileRolePermissions() implementation.
# ------------------------------------------------------------

# Replace reconcileRolePermissions() by deterministic source boundaries.
start_marker = "async function reconcileRolePermissions("
end_marker = "\n\nasync function seedResourceCrudCapabilities"

start = text.find(start_marker)
if start == -1:
    raise SystemExit(
        "ERROR: reconcileRolePermissions() start marker was not found."
    )

end = text.find(end_marker, start)
if end == -1:
    raise SystemExit(
        "ERROR: reconcileRolePermissions() end marker was not found."
    )

replacement = (
    "async function reconcileRolePermissions(\n"
    "  permissionId: string,\n"
    "  desiredRoles: UserRole[],\n"
    ") {\n"
    "  await permissionService.reconcileRolePermissions(\n"
    "    permissionId,\n"
    "    desiredRoles,\n"
    "  );\n"
    "}"
)

text = text[:start] + replacement + text[end:]

# ------------------------------------------------------------
# 5. Verify the transformation shape.
# ------------------------------------------------------------

required = [
    "import { PrismaService } from '../src/prisma/prisma.service';",
    "import { PermissionService } from '../src/platform/authorization/permission.service';",
    "const prisma = new PrismaService();",
    "const permissionService = new PermissionService(prisma);",
    "return permissionService.ensurePermission({",
    "await permissionService.reconcileRolePermissions(",
]

for marker in required:
    if marker not in text:
        raise SystemExit(
            f"ERROR: Migration marker missing after transformation: {marker}"
        )

for forbidden in [
    "const prisma = new PrismaClient();",
    "await prisma.permission.findFirst(",
    "await prisma.permission.create(",
    "await prisma.rolePermission.findFirst(",
    "await prisma.rolePermission.create(",
]:
    if forbidden in text:
        raise SystemExit(
            f"ERROR: Direct persistence remains after migration: {forbidden}"
        )

path.write_text(text)
print(f"PASS: migrated {path}")
PY

echo

echo "===== SHOW MIGRATED SEED CORE ====="

sed -n '1,32p' "$SEED"
echo
grep -n -A25 -B5 "async function ensurePermission" "$SEED"
echo
grep -n -A15 -B5 "async function reconcileRolePermissions" "$SEED"
echo

echo "===== TYPECHECK ====="
(
  cd backend
  npx tsc --noEmit
)
echo "PASS: TypeScript."
echo

echo "===== PERMISSION SERVICE TESTS ====="
(
  cd backend
  npx jest \
    src/platform/authorization/permission.service.spec.ts \
    --runInBand
)
echo "PASS: PermissionService tests."
echo

echo "===== AUTHORIZATION / REGISTRY REGRESSION TESTS ====="
(
  cd backend
  npx jest \
    src/platform/registry/registry.service.spec.ts \
    src/platform/registry/module-lifecycle.service.spec.ts \
    src/platform/authorization/authorization.service.spec.ts \
    --runInBand
)
echo "PASS: Registry/Authorization regression tests."
echo

echo "===== BUILD ====="
(
  cd backend
  npm run build
)
echo "PASS: Backend build."
echo

echo "===== RUN DATABASE SEED ====="
(
  cd backend
  npx prisma db seed
)
echo "PASS: Database seed."
echo

echo "===== PERMISSION COUNTS ====="

(
  cd backend
  npx tsx <<'TS'
import { PrismaService } from './src/prisma/prisma.service';

async function main() {
  const prisma = new PrismaService();

  await prisma.$connect();

  const permissionCount = await prisma.permission.count();
  const rolePermissionCount = await prisma.rolePermission.count();

  console.log(`Permission count:     ${permissionCount}`);
  console.log(`RolePermission count: ${rolePermissionCount}`);

  if (permissionCount !== 44) {
    throw new Error(
      `Expected 44 permissions after additive seed, found ${permissionCount}.`,
    );
  }

  if (rolePermissionCount !== 84) {
    throw new Error(
      `Expected 84 role-permission assignments after additive seed, found ${rolePermissionCount}.`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
TS
)

echo "PASS: expected permission counts verified."
echo

echo "===== CHECK LOGICAL PERMISSION DUPLICATES ====="

(
  cd backend
  npx tsx <<'TS'
import { PrismaService } from './src/prisma/prisma.service';

async function main() {
  const prisma = new PrismaService();

  await prisma.$connect();

  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      module: true,
      section: true,
      resource: true,
      action: true,
      scope: true,
    },
    orderBy: [
      { module: 'asc' },
      { resource: 'asc' },
      { action: 'asc' },
      { scope: 'asc' },
      { id: 'asc' },
    ],
  });

  const groups = new Map<string, typeof permissions>();

  for (const permission of permissions) {
    const key = [
      permission.module,
      permission.section ?? '<NULL>',
      permission.resource ?? '<NULL>',
      permission.action,
      permission.scope,
    ].join('|');

    const group = groups.get(key) ?? [];
    group.push(permission);
    groups.set(key, group);
  }

  const duplicates = [...groups.entries()].filter(
    ([, rows]) => rows.length > 1,
  );

  if (duplicates.length > 0) {
    console.error('LOGICAL DUPLICATES FOUND:');

    for (const [key, rows] of duplicates) {
      console.error(`  ${key}`);
      for (const row of rows) {
        console.error(`    ${row.id}`);
      }
    }

    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log(`Logical permission duplicates: 0`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
TS
)

echo "PASS: no logical permission duplicates."
echo

echo "===== FINAL SEED PERSISTENCE CHECK ====="

if grep -Fq "await prisma.permission.findFirst(" "$SEED"; then
  fail "Direct Permission lookup still exists in seed."
fi

if grep -Fq "await prisma.permission.create(" "$SEED"; then
  fail "Direct Permission create still exists in seed."
fi

if grep -Fq "await prisma.rolePermission.findFirst(" "$SEED"; then
  fail "Direct RolePermission lookup still exists in seed."
fi

if grep -Fq "await prisma.rolePermission.create(" "$SEED"; then
  fail "Direct RolePermission create still exists in seed."
fi

grep -Fq "permissionService.ensurePermission" "$SEED" \
  || fail "PermissionService.ensurePermission() is not used by seed."

grep -Fq "permissionService.reconcileRolePermissions" "$SEED" \
  || fail "PermissionService.reconcileRolePermissions() is not used by seed."

echo "PASS: seed persistence ownership is now PermissionService."
echo

echo "===== SECURITY / DIFF REVIEW ====="

git diff --check

echo
git status --short
echo

echo "----- Seed diff -----"
git diff -- "$SEED"

echo
echo "----- Authorization module diff -----"
git diff -- "$AUTH_MODULE"

echo
echo "----- PermissionService -----"
sed -n '1,240p' "$PERMISSION_SERVICE"

echo
echo "----- PermissionService tests -----"
sed -n '1,280p' "$PERMISSION_SPEC"

echo
echo "============================================================"
echo "PERMISSION PERSISTENCE BLOCK COMPLETE"
echo "============================================================"
echo
echo "Next action: review the diff above before committing."
