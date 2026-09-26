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

## 2026-09-26 — ResourceLineage Foundation Checkpoint

### Git checkpoint

Pending commit after final documentation and regression verification.

### Completed architectural work

- Added ResourceLineage persistence with generic source and target resource identities.
- Added DERIVED_FROM, SPLIT_FROM, MERGED_FROM, and TRANSFERRED_FROM lineage types.
- Linked lineage to ResourceMovement where a movement caused the continuity event.
- Preserved quantity/unit and effective business time for resource portions.
- Added inbound, outbound, and bidirectional lineage resolution with date-window filtering.
- Kept lineage separate from movement history and technical audit.

### Verification

- Prisma migration applied successfully.
- Prisma migration status: database schema up to date.
- Full backend regression: 28 suites, 289 tests passed.
- Backend TypeScript build: PASS.

### Next target

**RelationshipEvidence foundation for secure document/reference metadata and verification state.**

---

## 2026-09-26 — RelationshipEvidence Foundation Checkpoint

### Git checkpoint

`7d6904b` — Add RelationshipEvidence foundation

### Completed architectural work

- Added ResourceEvidence persistence for controlled reference metadata without embedding document content.
- Added evidence type, reference type/value, document number, issuer, dates, integrity hash, metadata, and actor attribution.
- Linked evidence references to ResourceRelationship and ResourceMovement.
- Added a platform evidence resolver supporting relationship, movement, resource, type, and reference filtering.
- Preserved evidence as a reference layer separate from file/document storage and technical audit.

### Verification

- Prisma migration applied successfully and database schema is in sync.
- Focused RelationshipEvidence tests: 2/2 PASS.
- Full backend regression: 29 suites, 291 tests PASS.
- TypeScript no-emit build check: PASS.
- Backend production build: PASS.

### Next target

**Farm integration foundation: connect temporal relationship, movement, lineage, and evidence context to Farm without removing Farm.ownerId compatibility.**

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


---

## 2026-09-26 — Farm Relationship Integration Foundation

### Git checkpoint

Pending commit after documentation and regression verification.

### Completed architectural work

- Added a centralized ResourceRelationship lifecycle service.
- Farm creation now atomically establishes an OWNER relationship with a
  1000-year practical non-expiry horizon.
- Farm deletion atomically terminates open Farm relationships before deletion.
- FarmAsset creation now atomically establishes an OWNER relationship using
  the Farm's current owner as the compatibility source.
- FarmAsset deletion atomically terminates its open relationship history.
- Farm access now evaluates temporal relationship context before falling back
  to Farm.ownerId for legacy farms with no relationship history.
- Preserved the existing AuthorizationService and fail-closed behavior.

### Verification

- Focused Farm + relationship tests: 40/40 PASS.
- Farm access regression: 9/9 PASS.
- Full backend regression: 30 suites, 293 tests PASS.
- TypeScript no-emit build check: PASS.
- Backend production build: PASS.

### Next target

**Complete Farm lifecycle integration for FarmAsset/FarmRecord/Crop where
relationship, movement, lineage, or evidence context is materially required,
then promote the proven Farm foundation through B → A.**

---

## 2026-09-26 — Farm Child Lifecycle Closure

### Completed

- Crop creation now atomically establishes an OWNER ResourceRelationship.
- Crop archive now atomically terminates its open relationship before soft deletion.
- Farm deletion now closes relationship history for the Farm itself and all
  cascading FarmAsset/Crop children before the database cascade executes.
- Preserved FarmRecord as historical observation data rather than inventing
  ownership semantics for records.

### Verification

- Full backend regression: 30/30 suites, 293/293 tests PASS.
- TypeScript no-emit check: PASS.
- Backend production build: PASS.

### Next target

**Complete relationship-aware Farm child access/history surfaces, then execute
the V0.3 A/B/C promotion validation and recovery checkpoint.**
