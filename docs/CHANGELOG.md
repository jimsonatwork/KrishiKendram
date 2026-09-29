## 2026-09-29 — Production RC runtime acceptance

- Isolated production Compose smoke completed with project kkrc, without disturbing the development PostgreSQL container/volume.
- Backend and frontend production images built successfully; frontend build: 2,314 modules, 433.92 kB initial JS / 138.14 kB gzip.
- All 20 Prisma migrations applied successfully to the isolated production PostgreSQL database.
- Backend /api/v1/health returned production status: ok; frontend /healthz returned ok.
- PostgreSQL, backend, and frontend containers reached healthy state. Backend runtime user verified as node.
- Restart smoke passed: backend and frontend restarted and both health endpoints returned successfully; all containers healthy afterward.
- Isolated RC stack and volume were fully removed after verification; development PostgreSQL remains separate.

## 2026-09-29 — Final RC reconciliation

- Release acceptance evidence reconciled across the CTO Execution Bible and changelog: lifecycle integrity, authorization, provenance/audit, DTO validation, dependency boundary, database migrations, regression, production builds, and live runtime smoke are all recorded.
- No new domain scope or speculative infrastructure was introduced during RC closure.
- Canonical repository remains the release source of truth; final release checkpoint follows only after clean-tree verification.

## 2026-09-29 — Deployment readiness checklist

- Production deployment must provide real POSTGRES_PASSWORD, JWT_SECRET, and production CORS_ORIGINS; RC smoke secrets were test-only and discarded.
- Apply Prisma migrations with prisma migrate deploy before or as part of the controlled deployment procedure.
- Confirm PostgreSQL health, backend /api/v1/health, frontend /healthz, container health, and restart recovery after deployment.
- Keep the production PostgreSQL volume persistent; do not use destructive volume removal during normal deployment.
- The RC smoke environment was intentionally destroyed after validation; no production data was created or retained by this test.

## 2026-09-29 — Release candidate regression gate

- Frontend production dependency audit is now clean: 0 production vulnerabilities after moving the unused shadcn CLI from runtime dependencies to devDependencies.
- Backend regression re-run after the RC dependency hardening: 36 suites / 346 tests passed.
- Prisma migration status: 20 migrations found; database schema up to date.
- Backend production build passed; frontend production build passed with 2,314 modules and 433.92 kB initial JS / 138.14 kB gzip.
- git diff --check passed and canonical working tree remains clean after checkpoint commit 651d3b3.
- Live production-container startup/health smoke subsequently passed in an isolated non-conflicting environment; no domain scope expansion.

## 2026-09-29 — Lifecycle closure / regression checkpoint

- Relationship lifecycle movement creation now rejects backdated custody/lease/return/transfer movements against the latest resource movement.
- Crop archive/restore now records transactional audit events, matching Farm and FarmAsset lifecycle coverage.
- Full backend regression: 36 suites / 346 tests passed.
- Frontend TypeScript check and production build passed: 2,314 modules; 433.92 kB initial JS / 138.14 kB gzip.
- Prisma schema validation passed; production Compose config and full image build passed; git diff check passed at the release-hardening checkpoint.
- Checkpoint: dd75c78 (relationship movement chronology), 3db301b (crop lifecycle audit).

## 2026-09-29 — Lifecycle integrity hardening

- Hardened FarmAsset split and merge chronology so an effective date cannot precede the latest source movement.
- Merge movement records now preserve an ordered previous-movement chain on the newly created target.
- Added farm/farm-asset archive, delete, and restore audit events inside the same database transaction as the lifecycle mutation.
- Lifecycle-focused regression coverage now includes the new chronology guards.
- Verification: 36 backend suites / 345 tests passed; backend production build passed; Prisma schema validation passed; frontend TypeScript check and production build passed with 2,314 modules and 433.92 kB initial JS / 138.14 kB gzip; git diff check passed.
- Checkpoints: 853802e, 8c17b51.

## 2026-09-29 — Core runtime closure pass

- Closed the frontend authentication session-refresh gap by using the existing /auth/refresh contract during session initialization and retrying /auth/me after successful token rotation.
- Users/Auth focused regression: 2 suites / 5 tests passed.
- Farms focused regression: 5 suites / 59 tests passed.
- Crops/Intake focused regression: 3 suites / 26 tests passed.
- Full backend regression: 36 suites / 343 tests passed.
- Backend production build and Prisma schema validation passed.
- Frontend TypeScript check and production build passed: 2,314 modules; 433.92 kB initial JavaScript / 138.14 kB gzip.
- git diff --check passed at the prior session-refresh checkpoint; subsequent RC hardening changes are tracked in the current release checkpoint.
- Checkpoint: 92e222c Harden frontend session refresh.

## 2026-09-29 — Core Completion Audit Direction

- Reconciled the Execution Bible current position with the live canonical repository checkpoint 6ef1bd5.
- Recorded an evidence-based core completion matrix across Auth, Users/Admin, Farms, FarmAsset, FarmRecord, Crop, Intake, lifecycle/history, frontend UX/compatibility, and production readiness.
- Kept Livestock and Marketplace vertical slices in place while parking breadth expansion until core completion gates are closed.
- Recorded the verified regression gate: backend 36/36 suites and 346/346 tests, backend build PASS, Prisma validation PASS, frontend build PASS (2314 modules; 433.92 kB / 138.14 kB gzip), Docker backend release image PASS, and diff check PASS.
- No new architecture or speculative domain work introduced.

## 2026-09-29 — Marketplace Listing Vertical Slice

### Git checkpoint
Pending — Marketplace listing vertical slice

### Completed architectural work

- Added MarketplaceListing as a lightweight listing layer over existing Crop, FarmAsset, and Livestock resources; no duplicate inventory model was introduced.
- Added owner-checked draft, publish, update, and archive lifecycle with public published-listing discovery.
- Reused canonical AuthorizationService, Registry capability definitions, and Platform AuditService.
- Added Marketplace module, API routes, frontend API contract, and lazy-loaded Marketplace workspace.
- Prisma migration applied successfully: 20260929015956_add_marketplace_listing.
- Seed reconciliation completed for marketplaceListing OWN permissions.
- Backend: 36 suites / 343 tests passed; Nest production build passed.
- E2E: 21/21 tests passed.
- Frontend production build passed: 2314 modules.
- git diff --check passed.

## 2026-09-29 — Livestock Vertical Slice

### Git checkpoint

Pending — Livestock domain vertical slice

### Completed architectural work

- Added dedicated Livestock persistence with Farm ownership, lifecycle status, soft archive/restore, acquisition metadata, and indexed lookup fields.
- Reused canonical ResourceRelationship ownership history rather than adding a duplicate livestock history subsystem.
- Added Registry resource/module definitions and explicit FARMER OWN capability reconciliation for Livestock CRUD/restore.
- Added JWT-protected Livestock CRUD and relationship-history routes.
- Added a lazy-loaded Farm workspace Livestock page with registration and archive actions, plus canonical API methods.
- Prisma migration applied successfully: 20260929013728_add_livestock.
- Backend: 36 suites / 343 tests passed; Nest production build passed.
- E2E: 19/19 tests passed.
- Frontend production build passed: 2313 modules; Livestock remains lazy-loaded.
- git diff --check passed.

## 2026-09-27 — User Resource Relationship History

- Added an authorization-protected user relationship-history endpoint backed by the canonical ResourceRelationship model.
- Added bounded retrieval and temporal ordering for historical ownership/custody/lease and other resource relationships.
- Surfaced relationship history in the existing Users Activity workspace.
- Added focused service coverage; backend build, frontend production build, and git diff --check passed.

## 2026-09-29 — API validation and error-contract hardening

- Added bounded, class-validated query DTOs for Users activity/history endpoints and platform audit recent-activity retrieval.
- Added validated bulk-user deletion request DTO.
- Converted expected relationship lifecycle/transfer/custody/lease conflicts from generic errors to HTTP 409 Conflict responses.
- Verification: backend 36 suites / 346 tests passed; Prisma schema validation passed; backend Nest build passed; frontend production build passed (2,314 modules); git diff check passed.
- Checkpoints: 42aa4ef, c23f097, 55be29c.

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
- : passed.
- git diff --check: passed.

### Next target

**Final end-to-end lifecycle verification → next concrete domain lifecycle adoption.**

## 2026-09-26 — Transfer Hardening + FarmAsset Merge UI

### Completed

- Transfer request creation + audit are now atomic.
- Reject/cancel use atomic pending-state claims and transaction-bound audit.
- Acceptance adds an expiry condition to its atomic state claim.
- FarmAsset merge is exposed as a first-class action in the existing Farm workspace.
- Merge UI is isolated as a small component and delegates lifecycle truth to the backend.

### Verification

- Transfer service: 11/11 tests passed.
- Backend regression: 34/34 suites, 315/315 tests passed.
- Backend production build: passed.
- Frontend production build: passed.
- Runtime ``: passed.
- `git diff --check`: passed.

### Next target

**Final runtime/end-to-end smoke coverage → next concrete domain adoption where semantics are real.**

## 2026-09-26 — FarmRecord Adoption Alignment

- Kept FarmRecord as immutable historical observation data with no ownership, movement, or lineage semantics.
- Aligned Farm UI input-method choices with the canonical backend/Registry enum.
- Stored the UI record description inside the existing JSON `data` payload rather than inventing a new schema field.
- Updated the operational History/Farm views to read that canonical description location.

### Verification

- FarmsService: 38/38 tests passed.
- Frontend TypeScript/Vite production build: passed.
- `git diff --check`: passed.

### Next target

**Final runtime/end-to-end smoke coverage → Registry/permission consistency review → next real domain only.**

## 2026-09-26 — FarmRecord Capability Consistency

- Reduced declared FarmRecord capabilities to READ + CREATE, matching its immutable historical-observation lifecycle.
- Removed unsupported UPDATE/DELETE capability declarations without introducing a schema migration.
- Kept PermissionService as the authoritative runtime filter against current Registry declarations.

### Verification

- Registry + Permission focused tests: 57/57 passed.
- Backend production build: passed.
- Frontend production build: passed.
- `git diff --check`: passed.

### Next target

**Final runtime/end-to-end smoke coverage → close V0.3 lifecycle checkpoint → next real domain capability.**

## 2026-09-26 — V0.3 Farm Lifecycle Hardened

The CTO Master Blueprint now reflects the actual implementation frontier rather than the older transfer-foundation baseline.

- Farm, FarmAsset and Crop relationship/lifecycle integration is established.
- Transfer, partial transfer, split, merge, movement, evidence and history surfaces are integrated.
- FarmRecord remains immutable observation data.
- Registry capability consistency has been tightened.
- Final remaining V0.3 checkpoint: runtime/end-to-end smoke verification and recovery validation.


## 2026-09-27 — V0.3 Final Closeout

### Completed

- Final runtime smoke verification passed against ``.
- Full backend regression remains green at 34/34 suites and 315/315 tests.
- Backend and frontend production builds passed.
- Registry/permission consistency review confirmed resource-specific authorization remains Registry-authoritative.
- FarmRecord capability surface is aligned to its immutable READ/CREATE lifecycle.
- Working tree is clean and `main` is synchronized with `origin/main` at `b8d06f5`.

### Status

**V0.3 CLOSED — verified recovery baseline established.**

### Next target

**V0.4 concrete domain adoption using existing lifecycle primitives; no speculative domain model or parallel ownership/movement/history system.**


## 2026-09-27 — V0.4 FarmAsset Custody

### Completed

- Added FarmAsset custody assignment using the existing temporal `CUSTODIAN` relationship type.
- Added atomic `CUSTODY_CHANGE` movement recording with optional evidence and transaction reference.
- Added Registry `ASSIGN` capability for FarmAsset with OWN/FARM/GLOBAL scopes.
- Generalized resource capability seeding to persist the supported non-CRUD `ASSIGN` capability.
- Exposed authenticated custody assignment through the Farms API without introducing a new Prisma resource model.

### Verification

- Backend regression: 34/34 suites, 316/316 tests passed.
- Registry + Permission focused tests: 61/61 passed.
- Backend production build: passed.
- Frontend production build: passed.
- Database seed: passed.
- `git diff --check`: passed.

### Next target

**Focused custody-service coverage → runtime route verification → next concrete operational lifecycle.**


## 2026-09-27 — Custody Verification Close

- Added focused FarmAsset custody service tests for authorization ordering and transaction delegation.
- Full backend regression: 35/35 suites, 318/318 tests passed.
- Runtime health returned HTTP 200.
- Protected custody route returned HTTP 401 without authentication.
- Existing backend/frontend production builds remain green.

**V0.4 custody slice verified and checkpoint-ready.**


## 2026-09-27 — FarmAsset Lease Lifecycle

- Added bounded FarmAsset leasing with `LESSEE` relationship history.
- Added `LEASE` movement recording with evidence support.
- Added lease validity validation through `validUntil`.
- Added protected FarmAsset lease API route using existing `ASSIGN` authorization.
- No new resource model introduced.

Verification: focused tests 42/42 passed; full backend regression 35/35 suites, 318/318 tests passed; backend build passed.


## 2026-09-27 — FarmAsset Lease Termination

### Completed

- Added explicit FarmAsset lease termination using the existing temporal `LESSEE` relationship.
- Lease termination closes the active lessee with `TERMINATED` status, effective end time, optional reason, transaction reference, and evidence.
- Added `LEASE_END` ResourceMovement with previous-movement linkage and relationship reference.
- Reused existing FarmAsset `ASSIGN` authorization; no new permission or resource model introduced.
- Added protected `POST /api/v1/farms/:farmId/assets/:assetId/lease/end` route.

### Verification

- Focused Farms + relationship regression: 42/42 tests passed.
- Full backend regression: 35/35 suites, 318/318 tests passed.
- Backend production build: passed.
- `git diff --check`: passed.

### Next target

Runtime lease/lease-end boundary verification, then the next concrete lifecycle only where existing relationship/movement/lineage primitives provide a clean fit.


## 2026-09-27 — FarmAsset Lifecycle UI Exposure

- Added frontend API clients for lease, lease termination, and custody assignment.
- Added compact FarmAsset lifecycle controls to the existing Farm workspace.
- Lease start/end and custody assignment delegate lifecycle truth to the backend.
- Reused Member ID and reason contracts without introducing parallel frontend lifecycle rules.

### Verification

- Frontend TypeScript/Vite production build: PASS.

### Next target

Authenticated end-to-end lifecycle smoke coverage, then the next concrete backend/frontend lifecycle slice.


## 2026-09-27 — FarmAsset Lease/Custody Focused Coverage

- Added dedicated FarmAsset lease orchestration tests covering bounded validity, canonical relationship delegation, lease termination, and authorization ordering.
- Existing custody focused coverage remains green.

### Verification

- Lease + custody focused suites: 6/6 tests PASS.



## 2026-09-27 — FarmAsset Custody Return Lifecycle

- Added explicit custody return using the existing CUSTODIAN relationship and RETURN movement type.
- Added protected custody-return API and Farm workspace control.
- Reused existing ASSIGN authorization, relationship, movement, evidence, and transaction primitives.

### Verification

- Custody + lease focused coverage: 7/7 tests PASS.



## 2026-09-27 — Unified Resource History Timeline

- Extended the existing History workspace with FarmAsset relationship history.
- Added farm-level ResourceMovement events to the unified timeline.
- Kept movement, lineage, evidence, and relationship data sourced from existing protected APIs.
- No new lifecycle or history persistence layer introduced.

### Verification

- Frontend TypeScript/Vite production build: PASS.
- `git diff --check`: PASS.
- Full regression/runtime verification remains deferred to the planned checking pass.


## 2026-09-27 — FarmAsset Split Workspace Control

- Exposed the existing atomic FarmAsset split lifecycle in the Farm workspace.
- Added the frontend API client for `POST /farms/:farmId/assets/:assetId/split`.
- Added quantity validation so the requested child quantity must remain below the source quantity.
- Reused existing SPLIT movement and SPLIT_FROM lineage behavior; no backend lifecycle rewrite was introduced.

### Verification

- FarmResourceLineageService focused suite: 1/1 suite, 4/4 tests PASS.
- Frontend TypeScript/Vite production build: PASS.
- `git diff --check`: PASS.


## 2026-09-27 — Backend Platform Contract Foundation

- Verified the existing Registry as the canonical backend contract authority
  for modules, resources, fields, validation/normalization and capabilities.
- Added explicit read endpoints for registered modules and registered fields.
- Reused the existing Registry controller/service; no new persistence or
  authorization engine was introduced.

### Verification

- Registry/Field/Module focused coverage: 65/65 tests PASS.
- Full backend regression: 36/36 suites, 324/324 tests PASS.
- Backend production build: PASS.
- Git checkpoint: 57bc097.

### Next target

V0.5.2 frontend canonical contract and centralized field-policy adapter.


## 2026-09-27 — Frontend Canonical Contract Foundation

- Added a lightweight frontend platform contract layer under frontend/src/lib/platform.
- Added typed Registry contracts for modules, resources, fields and capabilities.
- Added a centralized field-policy resolver/UX validator using backend Registry metadata and resource-specific overrides.
- Added a dedicated Registry API client for resources, modules and fields.
- Existing business API clients and screens remain unchanged.

### Verification

- Frontend TypeScript/Vite production build: PASS.
- Backend contract regression remains 65/65 focused tests PASS.
- Full backend regression remains 36/36 suites, 324/324 tests PASS.
- Live API runtime verification was deferred because the local backend process was not running in the session.

### Next target

Super Admin Resources workspace consuming the canonical contract layer.


## 2026-09-27 — V0.5.3 Super Admin Resources Workspace

- Added frontend/src/pages/admin/ResourcesPage.tsx for canonical Registry inspection.
- Added module-grouped resource navigation and resource contract details.
- Added capability/scope inspection and resolved field-policy inspection.
- Reused the centralized API request transport from frontend/src/lib/api.ts.
- Replaced the /app/resources placeholder with the live Resources workspace.
- No new backend model or authorization engine introduced.

Verification: frontend TypeScript build PASS; Vite production build PASS; git diff --check PASS.


## 2026-09-27 — V0.5.4 Module Workspace

- Added frontend/src/pages/admin/ModulesPage.tsx.
- Added Super Admin Modules navigation and /app/modules route.
- Exposed Registry module lifecycle, dependencies and attached resources.
- Kept module lifecycle ownership in the backend ModuleLifecycleService.

Next checkpoint: V0.5.5 capability and field administration.


## 2026-09-27 — V0.5.5 Capability + Field Administration

### Completed

- Added the Super Admin Capabilities & Fields workspace at /app/capabilities.
- Exposed the canonical Module → Resource → Capability/Scope → Field contract in one workspace.
- Added resolved field-policy inspection using reusable field definitions and permitted resource overrides.
- Tightened the frontend field-policy adapter so FIXED fields and non-declared override characteristics are not treated as mutable UI policy.
- Kept backend Registry, PermissionService and AuthorizationService as the authoritative owners; no second policy engine or speculative persistence layer was introduced.

### Verification

- Frontend TypeScript/Vite production build: PASS (2305 modules transformed).
- git diff --check: PASS.

### Next target

V0.5.6 platform administration integration: connect capability/field visibility to existing permission and module-control surfaces without duplicating backend authority.


## 2026-09-27 — V0.5.6 Visual Intelligence Layer + Performance Control

- Added additive application-wide ambient visual effects without replacing existing UI layouts.
- Added subtle AI-accented visual language, depth, texture and content motion at the shell level.
- Added persistent Visual Effects on/off control under Appearance for lower-capability devices.
- Added reduced-motion support and an effects-off CSS path that removes animation, glow, backdrop and shadow overhead.
- Preserved all existing theme modes and colour themes.
- TypeScript build PASS; git diff --check PASS.
- Vite production bundling is currently blocked by the connected terminal's mixed Windows/WSL Node dependency environment and missing native Rolldown binding; no dependency/lockfile changes were made.


## 2026-09-27 — V0.5.6 Platform Administration Integration

- Connected the Super Admin dashboard to the canonical Registry API.
- Added live counts for modules, resources, declared capabilities and field contracts.
- Added an AI-ready platform context presentation without inventing AI results.
- Preserved detailed Resources, Modules and Capabilities administration workspaces.
- TypeScript build PASS; git diff --check PASS.


## 2026-09-27 — V0.5.6 Permission Administration

- Added Registry-declared permission resource and protected permission administration API.
- Added Super Admin Permission Matrix with role/scope/field visibility and filtering.
- Reused existing PermissionService and AuthorizationService; no duplicate policy engine.
- Frontend TypeScript PASS.
- Backend TypeScript reports two unrelated existing test compilation errors; permission files introduced no reported TypeScript errors.

## 2026-09-27 — V0.5.6.1 Platform administration continuation

- Added a Super Admin Roles workspace at `/app/roles`.
- Roles are derived from the protected Permission Administration API rather than introducing a second role/authorization engine.
- Added `GET /api/v1/registry/modules/status` for canonical module lifecycle/operational status and dependency visibility.
- Reused the existing `ModuleLifecycleService`; no new lifecycle persistence model was introduced.
- Kept lifecycle mutation out of the frontend because current module lifecycle definitions are registry-owned/static contracts; the UI does not pretend to persist transitions it cannot own.

## 2026-09-27 — V0.5.6.2 Audit administration

- Added protected Super Admin audit visibility at `GET /api/v1/platform/audit/recent`.
- Added the read-only `/app/audit` workspace using the canonical platform AuditService.
- Registered the `platform.audit` resource with READ/GLOBAL capability so authorization remains centralized.
- No second history/audit engine was introduced; this exposes the existing audit stream.


## 2026-09-28 — V0.5.28 Relationship-Aware FarmAsset Ownership Enforcement

- FarmAsset update, delete, and relationship-history authorization now resolves the active resource OWNER relationship before applying OWN scope.
- Added a focused regression proving transferred assets use the current relationship owner rather than the parent farm owner.
- Reused the existing AuthorizationService and ResourceRelationship model; no duplicate security or lifecycle abstraction was introduced.
- Farm-focused regression: 39/39 PASS; backend build PASS; frontend production build PASS.
- Existing frontend bundle-size warning remains deferred to the dedicated performance/code-splitting pass.


## 2026-09-28 — V0.5.29 Relationship-Aware FarmAsset Split Authorization

- FarmAsset split CREATE authorization now uses the active resource owner rather than the legacy farm owner.
- Added transferred-asset regression coverage; 5/5 FarmResourceLineageService tests pass.

## 2026-09-28 — V0.5.30 Crop Temporal Ownership Authorization Alignment
- Aligned Crop lifecycle authorization with active temporal OWNER relationships.
- Preserved existing Crop creation and transfer boundaries.
- CropService tests: 15/15 passed.

## 2026-09-28 — V0.5.31 Crop Restore Ownership Continuity
- Preserved the last recorded temporal Crop owner across archive/restore.
- Added focused restore regression coverage.
- CropService tests: 16/16 passed; backend build passed.

## V0.5.32 — Ownership Transfer Temporal Integrity
- Prevented backdated ownership transfers and duplicate active destination OWNER relationships at the shared relationship-service boundary.
- Added focused regression tests; backend build passes.

## V0.5.33 — Farm Temporal Ownership Alignment
- Farm transfer authorization and movement/evidence history now honor the active OWNER relationship.
- Added regression coverage; FarmResourceLifecycleService tests and backend build pass.

## V0.5.34 — Farm Lifecycle Uses Temporal Owner
- Farm READ, UPDATE, DELETE, FarmAsset CREATE, and FarmRecord CREATE authorization now resolve the active temporal OWNER relationship before OWN-scope authorization.
- Added regression coverage for a transferred Farm READ path.
- FarmsService tests: 40/40 passed; backend build passed.

## V0.5.35 — Custody and Lease Temporal Integrity
- Custodian replacement and lease replacement now reject effective dates before the active relationship start.
- Added focused regressions for both temporal boundaries.
- RelationshipService tests: 8/8 passed; backend build passed.

## V0.5.36 — Lineage Split/Merge Temporal Integrity
- Prevented FarmAsset split and merge operations from creating timeline records before the active source ownership start.
- Added focused temporal-boundary regressions.
- FarmResourceLineageService tests: 7/7 passed; backend build passed.

## V0.5.37 — Partial Transfer Temporal Integrity
- Added source ownership temporal validation to partial FarmAsset transfer completion.
- Added regression for backdated partial transfer acceptance.

### V0.5.38
- Audited relationship creation boundaries; no production OWNER relationship bypass found.

### V0.5.39
- Hardened ownership transfer chronology by rejecting transfer effective dates before the latest recorded movement.
- Added RelationshipService regression coverage; 9/9 passed and backend build passed.

### V0.5.40
- Completed lifecycle closure integrity audit across Farm, FarmAsset, and Crop destructive paths.
- Confirmed transactional relationship termination coverage; no additional closure bypass found.

### V0.5.41
- Completed authorization matrix sweep and secured audit administration with JWT authentication.

### V0.5.42
- Hardened transfer request DTO required identifiers against blank values.

### V0.5.43 — History / Provenance Completeness Sweep
- Audited the existing history/provenance foundation across audit events, user versions, resource relationships, movements, lineage, evidence, and transfer workflow records.
- Confirmed the current model already carries actor/time/reason and resource provenance needed by the PMD baseline; no duplicate history subsystem added.

### V0.5.44 — Frontend ↔ Backend Integration Sweep
- Audited frontend API calls against backend controller routes and confirmed the active workflow endpoints are aligned.
- Frontend production build passed (2311 modules; existing ~616 kB chunk warning only).
- No duplicate or fabricated integration layer was introduced.

### V0.5.45 — Frontend Workflow Completion
- Fixed contextual transfer navigation so a selected Farm/FarmAsset is retained when opening History from its Send action.
- Verified workflow states and API route alignment without creating a parallel UI/backend path.

### V0.5.46 — Cross-module production regression sweep
- Core cross-module regression: 27 suites / 234 tests passed. Backend and frontend builds passed.
- No code regression found; performance chunk warning remains a separate planned pass.

### V0.5.47 — Performance and device-compatibility pass
- Added route-level lazy loading for workspace/admin pages.
- Aligned FarmsPage with the existing Motion import.
- Frontend production build passed; initial JS reduced from 616.28 kB to 440.82 kB and the previous chunk warning cleared.


## 2026-09-28 — V0.5.50 Frontend Launcher Hardening

- Hardened the repository frontend launcher to resolve npm from the active PATH or the canonical Node 24 user installation.
- Added fail-fast messaging when Node.js/npm is unavailable.
- Preserved the existing port 4000 development workflow; no application/runtime architecture changed.
- `bash -n` and `git diff --check` passed before commit.

## 2026-09-28 — V0.5.51 Production runtime and dependency security hardening

- Corrected backend start:prod to target the actual dist/src/main.js artifact and verified successful Nest production startup.
- Backend full regression: 36 suites / 343 tests passed; Prisma schema valid; 18 migrations up to date.
- Frontend production build: 2,311 modules transformed; 441.17 kB initial JavaScript / 140.71 kB gzip.
- Production dependency audit is clean; backend dev-tooling high findings were resolved with patch-level fast-uri/js-yaml updates.
- Checkpoint committed as 4d6fb94.

## 2026-09-28 — V0.5.52 Authenticated E2E runtime revalidation

- Warm authenticated E2E smoke passed 15/15 after runtime/dependency hardening.
- One cold-run timeout was cleared on immediate rerun; no code or test-timeout change was made.
- Docker image revalidation was attempted but did not complete within the environment window; prior production image gate remains valid because only dev dependencies changed.

## 2026-09-29 — V0.5.53 System workspace completion

- Replaced the System Coming Soon surface with real appearance, accessibility and visual-performance controls.
- Reused existing theme store and reduced-motion behavior; no new backend architecture.
- Lazy-loaded SystemPage and verified frontend production build.

## 2026-09-29 — V0.5.54 FarmAsset lifecycle route verification

- Closed the deferred runtime boundary verification for FarmAsset custody, lease, split, and merge lifecycle routes.
- Added E2E JWT-boundary checks for custody assignment/return, lease creation/end, asset split, and asset merge.
- Authenticated application E2E: **17/17 passed**.
- Frontend production build: **2,312 modules**, 431.04 kB initial JavaScript / 137.46 kB gzip.
- `git diff --check` passed; no duplicate authorization or lifecycle infrastructure introduced.

### 2026-09-29 — Production operational hardening

- Added NestJS shutdown hooks for clean container SIGTERM/restart handling and Prisma connection release.
- Hardened docs/DEPLOYMENT.md to apply Prisma migrations before application traffic on first deployment and updates.
- Added logical PostgreSQL backup/recovery guidance and production volume/secrets safeguards.
- Backend build and full regression remain green: 36 suites / 346 tests passed.
