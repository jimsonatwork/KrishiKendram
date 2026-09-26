# KrishiKendram — CTO Changelog

This is the concise operational history of architectural milestones.

Detailed decisions belong in `ARCHITECTURE-DECISIONS.md`.
Detailed current state belongs in `CTO-MASTER-BLUEPRINT.md`.

---

## 2026-09-26 — Member Identity & Transfer Request Foundation

### Git checkpoint

269b310 — Add member identity and transfer request workflow

### Completed architectural work

- Added stable `User.memberId` identity using `IN-` plus 10 digits.
- Backfilled existing users with permanent member IDs.
- Added `ResourceTransferRequest` as a first-class transfer workflow.
- Added incoming/outgoing request views and accept/reject/cancel actions.
- Added administrator approval for governed transfer completion.
- Transfer completion reuses temporal ownership relationships and existing
  movement/evidence machinery.
- Farm ownership transfer keeps `Farm.ownerId` synchronized.
- Partial transfer quantity is explicitly blocked until split + transfer can be
  completed atomically.

### Verification

- Prisma migration deploy: passed.
- Prisma client generation: passed.
- Backend TypeScript build: passed.
- Backend regression: 32/32 suites, 302/302 tests passed.
- `git diff --check`: passed.

### Architectural position

A member does not require a farm to own a resource. Ownership, farm placement,
and movement remain separate temporal concepts. Transfer requests govern changes
between those relationships rather than directly editing profiles.

### Next target

**Partial transfer execution → pending-action/notification UX → resource timeline.**

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

---

## 2026-09-26 — Relationship-aware Farm Child Access/History Surfaces

### Completed

- Added canonical ResourceRelationship history retrieval returning domain
  relationship facts in effective chronological order.
- Added authorization-aware FarmAsset relationship history access under the
  existing FarmAsset READ boundary.
- Added authorization-aware Crop relationship history access under the
  existing Crop READ boundary.
- Preserved FarmRecord as historical observation/provenance data.
- No ownership semantics were introduced for FarmRecord.

### Verification

- Focused relationship/Farm/Crop regression: 55/55 PASS.
- Full backend regression: 30 suites, 294 tests PASS.
- Backend production build: PASS.
- git diff --check: PASS.

### Next target

**Execute the V0.3 A/B/C promotion validation and recovery checkpoint.**

## 2026-09-26 — V0.3 A/B/C promotion and recovery checkpoint

- Validated Development, Integration, and Canonical repository checkpoints against origin/main.
- Confirmed 30/30 backend suites and 294/294 tests passing.
- Confirmed backend production build and git diff --check passing.
- Closed the V0.3 A/B/C promotion and recovery checkpoint using the existing Git checkpoint/recovery posture.



## 2026-09-26 — Farm Resource Transfer Lifecycle Checkpoint

### Completed

- Added explicit Farm ownership transfer lifecycle handling.
- Added explicit FarmAsset ownership transfer lifecycle handling.
- Transfer closes the previous OWNER relationship with TRANSFERRED status and effective termination time, then opens the destination OWNER relationship.
- Transfer records a ResourceMovement TRANSFER event with source/destination users and relationship links.
- Optional transaction/document evidence is persisted and linked to both relationship sides and the movement.
- Ordinary create/update/delete operations do not fabricate Movement or Lineage records.
- ResourceLineage remains reserved for genuine continuity events such as split, merge, derivation, or future resource transformations.
- Transfer logic is isolated in FarmResourceLifecycleService rather than expanding FarmsService beyond the project service-size guardrail.

### API surfaces

- `POST /api/v1/farms/:id/transfer`
- `POST /api/v1/farms/:farmId/assets/:assetId/transfer`

### Verification

- Focused regression: 45/45 PASS.
- Full backend regression: 30 suites, 294 tests PASS.
- Backend production build: PASS.
- `git diff --check`: PASS.

### Next target

**Add focused transfer lifecycle tests, then expose authorized movement/evidence history in the existing resource workspace before extending Lineage to a real split/merge workflow.**


## 2026-09-26 — Movement and Evidence History Surface

### Completed

- Added authorization-aware Farm movement history endpoint.
- Added authorization-aware Farm evidence history endpoint.
- Added authorization-aware FarmAsset movement history endpoint.
- Added authorization-aware FarmAsset evidence history endpoint.
- History resolution uses the active temporal OWNER relationship for FarmAsset authorization, with the existing legacy farm owner fallback.
- Added dedicated transfer lifecycle tests covering successful transfer, inactive destination rejection, evidence validation, and temporal-owner authorization.

### API surfaces

- `GET /api/v1/farms/:id/movements/history`
- `GET /api/v1/farms/:id/evidence/history`
- `GET /api/v1/farms/:farmId/assets/:assetId/movements/history`
- `GET /api/v1/farms/:farmId/assets/:assetId/evidence/history`

### Verification

- Focused regression: 49/49 PASS.
- Backend production build: PASS.
- `git diff --check`: PASS.

### Next target

**Expose these authorized histories in the existing Farm workspace, then add a concrete ResourceLineage split/merge workflow only when a real resource transformation contract is introduced.**

### 2026-09-26 — Farm Movement & Evidence History UI
- Added Farm and FarmAsset movement-history API clients and lazy history panels.
- Added Farm and FarmAsset evidence-history API clients and lazy history panels.
- Existing relationship-history UI remains intact; lifecycle history is requested on demand and remains backend-authorized.
- Movement UI surfaces type, effective/recorded timestamps, source/destination references, quantity/unit, previous movement, transaction/evidence references when returned.
- Evidence UI surfaces reference data, document/issuer/date fields, integrity hash and returned metadata without fabricating values.
- Frontend TypeScript/Vite production build passed.

### 2026-09-26 — ResourceLineage Split Workflow
- Added the first concrete ResourceLineage business workflow: quantified FarmAsset split.
- A split atomically creates the child FarmAsset, creates its OWNER relationship, decrements the source quantity, records a SPLIT movement, and records source→target SPLIT_FROM lineage.
- Added authorization for source UPDATE and destination resource CREATE before mutation.
- Added FarmAsset lineage-history endpoint and lazy lineage-history UI.
- Extracted lineage lifecycle logic into FarmResourceLineageService to keep FarmResourceLifecycleService within the project service-size guardrail.
- Full backend regression: 32 suites / 301 tests passed; backend production build and frontend production build passed.

### 2026-09-26 — FarmAsset merge lineage lifecycle
- Added a transactional FarmAsset merge workflow for two or more quantified assets.
- Merge requires matching asset type/unit and a common active owner.
- Source quantities are closed to zero, source OWNER relationships are terminated, and a new target asset receives the combined quantity.
- Each source produces a MERGE movement and MERGED_FROM lineage edge to the target.
- Added focused merge lifecycle coverage; full backend regression is 32/32 suites and 302/302 tests passing.

### 2026-09-26 — Partial Resource Transfer Engine
- Enabled quantified partial FarmAsset transfer requests instead of rejecting quantity-bearing requests.
- Acceptance is atomic: source quantity decreases, a target asset is created, SPLIT movement and SPLIT_FROM lineage are recorded, and the target ownership is transferred to the destination member.
- Destination members do not need a Farm; the transferred quantity remains attached to the existing Farm as a new FarmAsset.
- Added concurrent-request claiming and validation for quantity/unit/full-quantity boundaries.
- Added 3 focused transfer-service tests covering request creation, the 10-to-5 partial transfer scenario, and full-quantity rejection.
- Verification: 32/32 backend suites, 302/302 tests, production build, and git diff --check pass.

### 2026-09-26 — Transfer actions and authoritative timeline

- Added pending incoming transfer and pending-count APIs.
- Added transfer audit events across request/reject/cancel/complete lifecycle actions.
- Added History workspace Accept/Reject transfer actions.
- Added movement/lineage-backed lifecycle events to the History timeline with authorization-safe skipping.
- Verification: backend 33/33 suites, 305/305 tests; backend build PASS; frontend build PASS.

## 2026-09-26 — Transfer Creation UX

### Completed

- Added authenticated Member ID lookup for active transfer recipients.
- Added History workspace transfer creation using owned Farm/FarmAsset resources.
- Added full Farm transfer and quantified partial FarmAsset transfer selection.
- Added reason capture and request submission through the existing transfer API.

### Verification

- Transfer service: 4/4 tests passed.
- Backend regression: 33/33 suites, 306/306 tests passed.
- Backend production build: passed.
- Frontend TypeScript/Vite production build: passed.
- `git diff --check`: passed.

### Next target

**Final lifecycle hardening → end-to-end verification → next domain adoption pass.**

## 2026-09-26 — Lifecycle Hardening & Runtime Integration

### Completed

- Transfer expiry/effective-time validation hardened.
- Transfer completion audit made transaction-bound.
- Added sent-transfer tracking/cancellation and transaction/document reference capture in History.
- Unified Crop relationship history with the operational timeline.
- Unified Farm/FarmAsset evidence history with movement and lineage timeline events.
- Fixed runtime Nest module wiring for CropsService and Authorization/Registry dependencies.
- Added a CropsModule dependency-graph regression test.

### Verification

- Transfer service: 7/7 tests passed.
- Backend regression: 34/34 suites, 311/311 tests passed.
- Backend production build: passed.
- Frontend production build: passed.
- Nest runtime startup: passed.
- /api/v1/health: passed.
- git diff --check: passed.

### Next target

**Final end-to-end lifecycle verification → next concrete domain lifecycle adoption.**
