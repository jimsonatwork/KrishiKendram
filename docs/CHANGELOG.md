# KrishiKendram — CTO Changelog

This is the concise operational history of architectural milestones.

Detailed decisions belong in `ARCHITECTURE-DECISIONS.md`.
Detailed current state belongs in `CTO-MASTER-BLUEPRINT.md`.

---

## 2026-09-23 — CTO Control Baseline

### Git checkpoint

`a061cc3`

### Recent history

- `a061cc3` — Refactor Auth validation through shared helper
- `866aab1` — Refactor Users validation through shared helper
- `e93bebd` — Refactor Crop validation through shared helper
- `d2de8fd` — Refactor Farms validation through shared helper
- `6be7670` — Refactor Crop persistence through CropsService

### Completed architectural work

- Central Field Policy validation/normalization foundation established.
- Users migrated to shared resource-field validation helper.
- Auth registration fields migrated to shared validation helper.
- Farms migrated to shared field validation.
- Crops migrated to shared field validation.
- Canonical crop persistence moved to CropsService.
- Intake authorization occurs before extraction/delegation.
- Authorization persistence foundation established.
- Resource authorization and field authorization established.
- Super Admin administrative protections established.

### Authorization verification

Focused authorization suite:

- 4 test suites passed
- 56 tests passed
- 0 failures

### Architectural correction

Authorization is now considered an established foundation rather than an area
requiring another deep rewrite/audit.

### Next target

**Phase 3 — Registry / Capability Architecture**

Primary direction:

Registry → Resource → Capability → Permission → Role/Grant

### CTO guardrail

Do not spend development time on another broad AuthorizationService audit
unless new evidence demonstrates a concrete defect or missing requirement.

Move forward with implementation.

---

## 2026-09-24 — Permission Persistence Checkpoint

### Git checkpoint

`32b502d` — Move permission persistence into PermissionService

### Completed architectural work

- Registry resource definitions declare CRUD capabilities.
- Permission persistence is owned by PermissionService.
- Role-permission reconciliation is owned by PermissionService.
- AuthorizationModule provides PermissionService.
- Seed capability persistence uses PermissionService.
- Registered resources automatically participate in the administrative
  capability model.
- ADMIN and SUPER_ADMIN receive GLOBAL CRUD permissions derived from declared
  capabilities.
- FARMER receives declared ownership scopes.

### Verification

- Authorization regression suite: 56/56 tests passed.
- PermissionService focused suite: 4/4 tests passed.
- Registry/capability regression coverage passed.
- Production build passed.
- Seed verification: 44 Permission rows.
- Seed verification: 84 RolePermission rows.
- Logical permission duplicates: 0.

### Architectural position

Registry remains the declaration layer.

PermissionService owns permission persistence.

AuthorizationService remains the authorization decision engine.

The next block is stronger Permission → Authorization integration without
rewriting the established authorization core.

### Next target

**Permission → Authorization integration / automatic administrative capability**

---

## 2026-09-26 — ResourceMovement Foundation Checkpoint

### Git checkpoint

7750fc6 — Add ResourceMovement foundation

### Completed architectural work

- Added the ResourceMovement Prisma persistence model and migration.
- Added the PMD movement vocabulary, including partial sale and partial transfer.
- Preserved source/destination user and resource references.
- Preserved effective business time separately from recorded system time.
- Added quantity/unit support for partial portions.
- Added previous-movement linkage for connected business history.
- Preserved transaction and evidence references without coupling them to a future document implementation.
- Added a platform movement resolver with effective-date window support.
- Kept movement history separate from authorization and technical audit.

### Verification

- Prisma migration applied successfully.
- Prisma migration status: database schema up to date.
- Focused regression: 10 suites, 87 tests passed.
- Backend TypeScript build: PASS.

### Next target

**ResourceMovement business creation/lifecycle semantics, followed by ResourceLineage and RelationshipEvidence.**

---
## Versioning Rule

At every coherent architectural milestone:

1. Verify implementation.
2. Run focused tests.
3. Run required build/integration checks.
4. Commit the milestone.
5. Update `CTO-MASTER-BLUEPRINT.md`.
6. Update this changelog.
7. Record any changed architectural decision.

