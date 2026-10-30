# KrishiKendram — CTO Execution Bible

> **Fixed execution control document for KrishiKendram.**
>
> PMD defines what KrishiKendram is and where the product/architecture is going.
> This Bible defines the controlled path from the actual current state to a
> fully functional product.
>
> This document is living, evidence-based, and must be updated at every
> meaningful execution milestone.

## 1. Operating Rule

The Execution Bible is the execution authority.

We do not start implementation from memory, assumptions, or an isolated idea.

Before significant work:

PMD → Master Blueprint → Execution Bible → A/B/C → actual repository evidence

After a meaningful milestone:

Implement → Test → Build → Verify → Git checkpoint → update Bible → reassess

If a new concept appears:
- relate it to the existing PMD plan;
- classify it as implement now, planned, deferred, not required, or
  over-engineered;
- do not allow it to silently change the execution order.

## 2. Fixed Status Vocabulary

Use only these execution statuses:

| Status | Meaning |
|---|---|
| COMPLETE | Segment/module acceptance criteria are fully satisfied and evidenced. |
| PARTIAL | Some required layers are working, but completion gate is not satisfied. |
| NOT STARTED | Required work has not meaningfully begun. |
| PLANNED | Intentionally scheduled for later. |
| NOT REQUIRED | Explicitly reviewed and not needed for the current product/architecture. |
| OVER-ENGINEERED | Identified as unnecessary complexity and should not be pursued. |
| BLOCKED | Required work cannot proceed until a documented dependency/decision is resolved. |

A module is **not COMPLETE** merely because its backend, database, or one UI
screen works.

## 3. Module Completion Gate

A module reaches COMPLETE only when the applicable layers are satisfied:

1. Data/model
2. Backend service/business logic
3. Authorization
4. Validation / Field Policy
5. Audit/history/provenance where required
6. API
7. Frontend
8. UX states
9. Error handling
10. Tests
11. Integration
12. Documentation / execution evidence

Not every future module requires every layer immediately, but any exception
must be explicitly recorded in the segment plan.

## 4. A/B/C Control

| Repository | Role | Rule |
|---|---|---|
| A /home/jj/Dev/KrishiKendram | Canonical / final | Verified final state only |
| B /home/jj/Dev/KrishiKendram-Integration | Prefinal / integration | Integration and verification |
| C /home/jj/Dev/KrishiKendram-Development | Active development | Implementation happens here |

Completed module flow:

**C → B → A**

No direct C → A promotion.

## 5. Current Verified Machine Baseline

**Machine:** Jivin_Jinse  
**Desktop Commander:** online  
**WSL:** Ubuntu-26.04

### Repository evidence captured 25 Sep 2026

| Repo | Working tree | HEAD |
|---|---|---|
| A | clean | 3d6aaf8 Finalize permission and development tooling checkpoint |
| B | clean | 3d6aaf8 Finalize permission and development tooling checkpoint |
| C | ?? .cto-backups/ only | 5828828 Align user capabilities with registry |

The .cto-backups/ directory is housekeeping and is not part of the intended
implementation change.

### Current execution position — reconciled 29 Sep 2026

The authorization, relationship, movement, lineage, evidence, transfer, history,
admin workspace, and FarmAsset lifecycle foundations are established and are
not being reopened without a concrete regression.

Verified repository checkpoint: 6ef1bd5 — Add marketplace listing vertical slice.
The repository is clean and the canonical branch is main.

The current execution strategy has been deliberately narrowed: the recent
Livestock and Marketplace slices remain in the product, but breadth expansion is
parked while the core product completion matrix is reconciled. This prevents
new verticals from masking incomplete core workflows.

Latest verified regression gate at this checkpoint (29 Sep 2026):
- Latest API/security hardening checkpoint: 42aa4ef / c23f097 / 55be29c.
- Authenticated backend core regression: Users/Auth 5/5 focused tests passed.
- Farms focused regression: 5 suites / 59 tests passed.
- Crops/Intake focused regression: 3 suites / 26 tests passed.
- Backend full regression: 36 suites / 346 tests passed.
- Backend production build: PASS.
- Prisma schema validation: PASS.
- Frontend TypeScript check and production build: PASS (2314 modules; 433.92 kB JS / 138.14 kB gzip).
- git diff --check: PASS.
- Release-hardening working tree: 3 intentional RC changes (Docker runtime hardening, fail-fast JWT secret configuration, environment-configurable frontend API base); canonical branch main is 20 commits ahead of origin/main before this checkpoint commit.

The Auth session-refresh gap is now closed: the frontend uses the existing refresh-token contract during session initialization and retries /auth/me after successful rotation. Lifecycle chronology is also hardened for FarmAsset split/merge, and farm/farm-asset archive/delete/restore mutations now emit transactional audit events. The next controlled activity remains the core completion audit across Users/Admin, Farms/FarmAsset/FarmRecord/Crop/Intake, lifecycle/history, frontend workflow states, and production readiness. Any
real code gap found by that audit is fixed narrowly; otherwise documentation is
updated to match verified repository evidence.

## 6. Core Completion Matrix — 29 Sep 2026

This matrix reconciles the live repository against the 12-point completion gate.
A PARTIAL status means the implementation is substantial but the full product
acceptance evidence is not yet closed; it does not mean the underlying work is
missing.

| Core area | Status | Verified evidence / remaining closure |
|---|---|---|
| Auth | PARTIAL | Login/register/logout/refresh/me, JWT boundary, DTO validation, auth tests and production build pass; full authenticated runtime/E2E acceptance remains to close. |
| Users | PARTIAL | CRUD/admin APIs, shared Field Policy validation, status/role safeguards, activity/history UI and tests exist; full end-to-end workflow acceptance remains. |
| Admin / Roles / Permissions | PARTIAL | Registry/capability/field-policy services, admin APIs and System workspace UI exist; full runtime integration matrix remains. |
| Farms | PARTIAL | CRUD, archive/restore, ownership/relationship lifecycle, history and transfer paths exist; complete UI/runtime acceptance remains. |
| FarmAsset | PARTIAL | CRUD plus custody, lease, split, merge, transfer, movement, lineage, evidence and history foundations; V0.5.54 route verification passed; complete module gate remains. |
| FarmRecord | PARTIAL | Model/API and authorization foundation plus intake creation path exist; broader lifecycle/UI/runtime acceptance remains. |
| Crop | PARTIAL | CRUD, authorization/validation, intake persistence and duplicate protection exist; broader lifecycle/UI/runtime acceptance remains. |
| Intake | PARTIAL | Authorization occurs before extraction; farm-record and canonical crop persistence paths plus tests exist; multimodal/runtime acceptance remains. |
| Lifecycle / History / Evidence | PARTIAL | Relationship, movement, lineage, evidence, transfer and history foundations are implemented and tested; cross-module runtime acceptance is the remaining closure work. |
| Livestock | PARTIAL | Vertical slice is present and retained; core module completion gate has not yet been claimed. |
| Marketplace | PARTIAL | Listing vertical slice is present and retained; core module completion gate has not yet been claimed. |
| Frontend UX / compatibility | PARTIAL | Production build passes; admin/core pages and lifecycle panels exist; systematic loading/error/empty/mobile/reduced-motion acceptance remains. |
| Production / release | PARTIAL | Backend/frontend builds, Prisma validation, Compose config and full production image build pass; live runtime deployment smoke test remains before final release claim. |

Decision: breadth expansion is parked. The next implementation work must close
these PARTIAL gates from the top of the core stack downward, fixing only concrete
acceptance gaps found by evidence. No new domain expansion is authorized by this
checkpoint merely because its schema or vertical slice exists.

## 6. Historical Work Already Completed

The following authorization/relationship implementation checkpoints are
historical execution evidence, not a new roadmap:

- 9afe495 Establish farm access authorization boundary
- 9928d52 Introduce explicit authorization context boundary
- ad99cbd Add farm access decision contract
- 3f23985 Add resource relationship domain contract
- de21a2f Add relationship resolution contract
- a7340d9 Add resource relationship persistence foundation
- b3cdec7 Implement persistence-backed relationship resolver
- 9d54d60 Wire resource relationship resolver module
- 36cfa81 Add relationship farm-access policy contract
- e2eb644 Integrate relationship policy with farm access
- 3c4ed72 Allow super admins global farm access
- 902cd70 Extract global farm access policy
- 04d7bb3 Define farm relationship access matrix
- c964a46 Establish farm access context contract
- 8008559 Consume farm access context in authorization
- ea65e81 Define permission authorization contract
- f574d06 Define registry capability authorization boundary
- 22caad1 Enforce registry capabilities during permission persistence
- d1e6467 Verify registry capabilities at runtime authorization
- 5828828 Align user capabilities with registry

At 5828828, the full R1.17 regression was verified:
**23/23 suites, 280/280 tests, build PASS, diff PASS.**

## 7. Important Concept Status — Temporal Relationships

The V0.3 relationship architecture is **PARTIAL**: the ResourceRelationship authorization foundation is implemented, while movement, lineage, evidence, and business lifecycle integration remain.

### Implemented foundation

- ResourceRelationship domain contract
- relationship types/statuses
- temporal relationship resolver
- Prisma persistence
- relationship resolver service
- farm-access policy integration
- Super Admin global access remains separate
- authorization consumes relationship-aware farm access context

### Still required for the broader business concept

- sale/transfer lifecycle
- effective-date business transitions
- closing the previous relationship
- transaction/document/proof reference
- loss/transfer responsibility changes
- historical reconstruction of ownership/responsibility

This concept remains part of the plan. It is not to be discarded and is not
to trigger another chain of micro-checkpoints.

## 8. Initial Module Status Baseline

This is the first execution baseline. It is deliberately conservative:
a module is PARTIAL unless the completion gate has been evidenced.

| Product/module | Status | Current evidence / position |
|---|---|---|
| Platform foundation | PARTIAL | Backend/frontend/Docker/Git foundations established; production completion not reached |
| Authentication | PARTIAL | Functional baseline; session/refresh/security hardening remains |
| Users | PARTIAL | Validation, auth, history/API and admin protections exist; full product module gate not complete |
| Super Admin | PARTIAL | Registry-driven administrative CRUD capability foundation exists; full platform control plane not complete |
| Roles & Permissions | PARTIAL | RBAC + PermissionService + capability persistence/runtime integration established; broader admin UX and lifecycle remain |
| Authorization | PARTIAL | Core decision engine and R1 integration verified; broader platform/module completion gate is not yet satisfied |
| Registry / Capability | PARTIAL | Resource/capability foundation and permission integration established; broader lifecycle/metadata/dependencies remain |
| Field Platform | PARTIAL | Field Policy/validation foundation substantially established; broader metadata/provenance remains |
| Farms | PARTIAL | Backend authorization/validation foundation substantially migrated; complete user-facing module gate not evidenced |
| Farm Assets | PARTIAL | Ownership/CRUD authorization foundation migrated; complete module gate not evidenced |
| Farm Records | PARTIAL | Authorization/field-policy foundation established; migration and product completion remain |
| Crops | PARTIAL | Validation/authorization migration and canonical intake persistence established; complete module gate not evidenced |
| Intake / AI Intake | PARTIAL | Authorization-before-extraction and crop persistence flow established; broader multimodal/intelligence workflow remains |
| Audit | PARTIAL | AuditEvent exists and audit services exist; canonical consolidation/redaction/mutation integration remain |
| History | PARTIAL | UserHistory and restore/retention exist; broader entity history remains |
| Provenance | PARTIAL | Architecture and original-input direction established; broad implementation remains |
| Farm Timeline | PLANNED | Product concept defined; not yet a complete operational module |
| Recall | PLANNED | Product/architecture direction defined; implementation intentionally later |
| Security | PARTIAL | Security architecture defined; comprehensive hardening is later work |
| Frontend platform | PARTIAL | React/Vite/theme/component/page foundations exist; platform-wide capability UX remains |
| Domain expansion | PLANNED | Livestock, land, logistics, marketplace, subsidies, SHGs and related domains are future scope |
| Production / deployment | NOT STARTED | Development infrastructure exists; production readiness is not complete |

## 9. Execution Segments

Every module will be broken into meaningful segments, not artificial micro
tasks.

Each segment must record:

| Field | Required |
|---|---|
| Product area | Yes |
| Module | Yes |
| Segment | Yes |
| Status | Yes |
| Planned hours | Yes |
| Actual hours | Yes |
| Extra hours | Yes |
| Remaining hours | Yes |
| Dependency | Yes where applicable |
| Acceptance criteria | Yes |
| Evidence | Yes |
| Git checkpoint | Yes when code changes |
| Notes / deviation | When applicable |

### Time rules

**Extra hours = Actual hours − Planned hours**, when positive.

Extra time must have a reason.

Hours must be based on actual execution records where possible. We do not invent
historical hours to make the dashboard look complete.

The first recovery pass will establish planned estimates for unfinished work.
From that point, actual hours are logged as execution happens.

## 10. Current Recovery Order

The latest PMD v0.3 update establishes this immediate order:

1. **UsersService** — verify the actual current file, continue the canonical Registry field-validation migration, preserve authorization/history/audit/Super Admin safeguards, finish tests, checkpoint.
2. **Registry / Authorization foundation** — verify the current implementation against PMD; no redesign unless a genuine gap is evidenced.
3. **V0.3 relationship capability** — retain the implemented ResourceRelationship foundation and complete the remaining ResourceMovement, ResourceLineage, and RelationshipEvidence capabilities incrementally.
4. **Farm integration** — integrate the relationship/movement/lineage/evidence foundation with Farm first.
5. **Existing module upgrades** — Farm → FarmAsset → FarmRecord → Livestock → Crop as each reaches the appropriate stage.
6. **UI upgrades** — extend existing pages with relationships, movement history, lineage/provenance and authorized history panels.
7. Only after the above recovery is mapped into meaningful segments do we estimate the remaining hours and lock the full execution order.

No new feature implementation should begin before this recovery inventory is accepted.

The recovery pass must finish before ordinary implementation resumes.

## 11. Deviation Control

No silent deviations.

When an unexpected issue appears:

1. Stop the affected execution step.
2. State the evidence.
3. Decide whether it is KEEP, MODIFY, ADD, MERGE, MOVE, or RETIRE.
4. Relate it to the existing PMD architecture.
5. Record the decision here.
6. Update PMD/Blueprint when the product or architecture meaning changes.
7. Return to the planned execution position.

The objective is to prevent process drift and over-engineering.

## 12. Fully Functional KrishiKendram Milestone

The question "When can we see a fully functional KK?" is tracked here.

A meaningful first fully functional product milestone requires at least:

- authentication and session flow
- Super Admin platform control sufficient for real administration
- farmer account and farm ownership flow
- core Farm operations
- Crops
- Farm Assets
- Farm Records
- Intake
- authorization
- validation
- audit/history foundations appropriate to the implemented operations
- usable frontend workflows
- integration tests
- error handling
- build/deployment path

The date is **not estimated yet**.

It will be estimated after the recovery pass establishes the remaining module
segments and actual execution capacity.

This avoids giving a reassuring but fabricated completion date.

## 13. Execution Position

**Current position: Core-stack acceptance closure — Admin/Roles/Permissions registry reconciliation**

UsersService Field Policy migration is complete for the current implementation segment.

Evidence:
- Registry resource-field validation is now used for User create, update, restore-version, bulk-delete status transition, and restore status transition paths.
- Farm creation/deletion and FarmAsset creation/deletion now establish or close temporal relationships atomically.
- Farm access evaluates relationship context before the legacy owner fallback.
- Full backend regression: 30/30 suites, 293/293 tests PASS.
- TypeScript no-emit build check: PASS.
- Backend production build: PASS.

Current checkpoint: V0.5.24 A/B/C Promotion Recovery Checkpoint. Canonical, Integration, and Development have been synchronized to the same promoted commit with explicit recovery tags and preserved Development working state.

Next controlled activity:

**A/B/C promotion and recovery checkpoint is CLOSED. Continue with the next concrete product-domain completion gap from the canonical baseline.**

This closes the current UsersService validation migration and Registry / Authorization verification segments without declaring the entire Users or V0.3 relationship capability COMPLETE.

No unrelated feature branch or architecture expansion should start while this
controlled V0.3 implementation segment is in progress.

### Resume rule

When execution stops, this section must identify the exact next segment.

Example:

> Users → History → restore flow → integration validation

The phrase **"continue"** must always resume from this recorded position unless
a new decision is explicitly made.

### 27 Sep 2026 — V0.4 execution position synchronized

The execution position has advanced beyond the historical V0.3 recovery text in this document.

Current authoritative sequence:

1. **V0.3 lifecycle baseline — COMPLETE:** Farm ownership/child lifecycle, ResourceRelationship, ResourceMovement, ResourceLineage, RelationshipEvidence, transfer workflow, partial FarmAsset transfer, merge/split lineage, and authorization-aware history foundations are implemented and checkpointed.
2. **V0.4 concrete lifecycle adoption — ACTIVE:** FarmAsset custody and lease lifecycles are implemented using the existing relationship/movement/evidence primitives.
3. **History integration — COMPLETE:** the existing History workspace now surfaces farm movement plus asset relationship/movement/lineage/evidence and crop relationship events.
4. **Next controlled activity:** choose the next concrete operational lifecycle only from an explicit product/business contract that fits existing primitives. Do not add a new domain model merely because an enum or relationship type exists.
5. **Deferred verification pass:** full backend regression and runtime lifecycle smoke verification remains a dedicated checking pass, not a reason to block implementation while the user has explicitly asked to continue execution.

Latest repository checkpoint: `15dc34a`.

Latest coherent implementation flow remains:

**Inspect enough → Implement → Focused test → Build → Git checkpoint → Update Blueprint/Changelog/Bible → Reassess.**

No parallel authorization/history system, destructive migration, broad domain migration, or speculative lifecycle is authorized by this execution position.

## 14. Evidence Standard

Preferred evidence, in order:

1. Git commit
2. Passing focused tests
3. Passing build
4. API/integration verification
5. UI/manual workflow verification
6. Relevant source file/path
7. Documented architectural decision

A claim of COMPLETE without supporting evidence is not accepted.

## 15. Change History

### 25 Sep 2026 — Bible established

- Created the CTO Execution Bible as the fixed execution-control document.
- Confirmed A/B/C repositories directly from the development machine.
- Recorded C checkpoint 5828828.
- Closed R1 as historical execution work rather than continuing micro-checkpoints.
- Recorded the temporal relationship concept as PARTIAL rather than lost or
  treated as a new roadmap.
- Established conservative initial module statuses.
- Established recovery-before-new-implementation rule.

### 25 Sep 2026 — UsersService Field Policy migration segment completed

- Completed the remaining current UsersService Registry Field Policy migration.
- Routed User create role validation through the User resource field policy.
- Routed restore-version mutable fields through the canonical User resource field policy.
- Routed deletion/restore status transitions through the canonical User status policy.
- Updated focused tests for the expanded centralized validation path.
- Evidence: 23/23 backend suites and 280/280 tests PASS; TypeScript no-emit build check PASS.
- Kept the Users module overall status separate from this completed validation segment.
- Moved the exact execution position to Registry / Authorization foundation verification.

### 26 Sep 2026 — Registry / Authorization verification closed

- Verified the current Development workspace against the implemented R1.17 authorization/capability chain.
- Focused current regression: 8 suites, 83 tests PASS.
- Backend production build: PASS.
- Pushed the completed UsersService/Execution Bible checkpoint through commit 7dfe070.
- Implemented and pushed the ResourceMovement persistence/resolution foundation through commit 7750fc6.
- Implemented the ResourceLineage persistence/resolution foundation through commit 9b14cd3.
- Implemented the RelationshipEvidence secure reference persistence/resolution foundation, including reference metadata, integrity hash, relationship/movement links, Prisma migration, resolver, and focused tests.
- Full backend regression after evidence integration: 29 suites, 291 tests PASS.
- Backend TypeScript no-emit check and production build: PASS.
- Confirmed the ResourceRelationship persistence/resolution foundation remains PARTIAL as designed.
- Moved the exact execution position to Farm lifecycle integration.

### 26 Sep 2026 — Farm lifecycle integration foundation

- Added centralized temporal relationship lifecycle operations.
- Farm creation now establishes an OWNER relationship atomically.
- Farm deletion closes open relationship history atomically.
- FarmAsset creation/deletion now establishes and closes OWNER relationship history atomically.
- Farm access evaluates temporal relationship context before legacy ownerId fallback.
- Full backend regression after Farm integration: 30/30 suites, 293/293 tests PASS.
- TypeScript no-emit check and backend production build: PASS.
- Moved the exact execution position to remaining Farm lifecycle integration and A/B/C promotion validation.

Future meaningful milestones must append an entry here.

---

## 16. Relationship to Other Project Records

### PMD
Product and architecture truth.

### CTO Master Blueprint
Living architecture/status source aligned with PMD and meaningful milestones.

### CTO Execution Dashboard
Human-readable current project status.

### CTO Execution Bible
Fixed execution control: module/segment order, status, dependencies, time,
evidence, deviations and exact resume position.

### A/B/C
Repository promotion and development control.

These records support one another. None should silently replace another.

### 26 Sep 2026 — Farm child lifecycle closure

- Crop creation now establishes temporal OWNER relationship history atomically.
- Crop archive now terminates temporal relationship history atomically.
- Farm deletion now terminates FarmAsset and Crop relationships before the
  database cascade deletes child resources.
- FarmRecord remains a historical observation record; no artificial ownership
  relationship was introduced.
- Full backend regression: 30/30 suites, 293/293 tests PASS.
- TypeScript no-emit check and production build: PASS.
- Exact next segment: relationship-aware child access/history surfaces,
  followed by A/B/C promotion validation and recovery checkpoint.

### 26 Sep 2026 — Relationship-aware Farm child access/history surfaces

- Added canonical ResourceRelationship history retrieval returning domain
  relationship facts in effective chronological order.
- Added authorization-aware FarmAsset relationship history access under the
  existing FarmAsset READ boundary.
- Added authorization-aware Crop relationship history access under the
  existing Crop READ boundary.
- Preserved FarmRecord as historical observation/provenance data; no
  ownership relationship surface was introduced for records.
- Focused regression: 55/55 tests PASS.
- Full backend regression: 30/30 suites, 294/294 tests PASS.
- Backend production build and git diff --check: PASS.
- Exact execution position: V0.3 A/B/C promotion validation and recovery
  checkpoint.

### 26 Sep 2026 — V0.3 A/B/C promotion validation and recovery checkpoint

- Development, Integration, and Canonical repositories validated against origin/main.
- Full backend regression: 30/30 suites, 294/294 tests PASS.
- Backend production build and git diff --check: PASS.
- Existing Git checkpoints are the recovery mechanism; no additional recovery framework added.
- V0.3 promotion/recovery checkpoint CLOSED.

### 02 Oct 2026 — Module operational dependency gate surfaced

- Super Admin Modules now consumes the canonical registry module-status contract alongside module definitions and resources.
- The UI distinguishes lifecycle state from operational state and surfaces unavailable dependency IDs when the Registry reports a blocked module.
- No frontend dependency evaluation was duplicated;  remains the ModuleLifecycleService source of truth.
- Frontend production build passed: 2,320 modules transformed.

### 01 Oct 2026 — Unified user activity history integration

- Extended the unified History workspace to consume the existing authorization-protected users activity audit stream.
- User profile history, temporal resource relationships, Farm/Crop/Livestock lifecycle facts, movements, lineage, evidence and now actor audit activity are presented through the same timeline surface.
- Reused the existing UsersService/AuditService contract; no duplicate audit or history engine was introduced.
- Frontend production build passed: 2,320 modules transformed.

### 01 Oct 2026 — History / module freshness continuation

- Continued from the verified ownership-integrity and universal freshness baseline rather than opening a new architecture track.
- Super Admin Modules workspace now supports explicit refresh plus the canonical 30-second live-refresh behavior.
- Unified History workspace now supports explicit refresh plus route/focus/visibility and bounded background revalidation through the shared live-refresh hook.
- Unified History now includes authenticated Livestock ResourceRelationship history alongside Farm, FarmAsset and Crop lifecycle history.
- Backend full regression after the changes: 39 suites / 363 tests passed.
- Frontend production build passed: 2,320 modules transformed; no backend model or parallel history engine was introduced.
- Exact resume position: continue the core completion audit and verified lifecycle/history gaps, then move into remaining PARTIAL module gates; do not invent speculative infrastructure.

### 27 Sep 2026 — User Resource Relationship History segment

- Completed the documented User Profile Relationship History segment.
- Added an authorization-protected, bounded user relationship-history read path over the canonical ResourceRelationship table.
- Reused the existing Users Activity workspace for presentation; no parallel history engine was introduced.
- Focused UsersService/controller coverage passed; frontend production build passed; backend TypeScript build passed.
- Module status remains conservative: the Users product module is still PARTIAL overall, while this relationship-history segment is COMPLETE.
- Next controlled activity remains concrete lifecycle/module adoption only where a real contract exists, followed by the deferred full regression/runtime verification pass.


### 27 Sep 2026 — V0.5.1 Backend Platform Contract Foundation

- Inspected the canonical Registry, module definitions, resource definitions,
  field definitions, capability declarations, validation/normalization and
  module lifecycle foundation before changing implementation.
- Confirmed the backend already owns the required contract authority; no new
  validation engine, authorization engine, Prisma model, or UI rules engine
  was justified.
- Exposed explicit read surfaces for registered modules and registered fields
  through the existing Registry controller: GET /registry/modules and
  GET /registry/fields.
- Preserved the existing GET /registry resource catalog and resource lookup.
- Focused Registry/Field/Module regression: 65/65 tests PASS.
- Full backend regression: 36/36 suites, 324/324 tests PASS.
- Backend production build: PASS.
- Git checkpoint: 57bc097 — Expose registry module and field contracts.
- Exact next segment: V0.5.2 frontend canonical contract and centralized
  field-policy adapter consuming the verified backend Registry contract.


### 27 Sep 2026 — V0.5.2 Frontend Canonical Contract Foundation

- Added a lightweight frontend platform contract boundary under frontend/src/lib/platform.
- Added TypeScript contracts mirroring the backend Registry module, resource, field and capability metadata.
- Added a dedicated Registry client for resources, modules and fields.
- Added a centralized field-policy adapter resolving reusable field definitions with resource-specific validation overrides.
- Kept backend validation authoritative; the frontend adapter is UX/contract consumption, not a second business-validation engine.
- Existing business API clients and screens were left untouched.
- Frontend production build: PASS.
- Backend Registry/Field/Module focused coverage remains 65/65 PASS; full backend regression remains 36/36 suites, 324/324 tests PASS from the preceding backend contract checkpoint.
- Live API curl was not repeated because the local backend runtime was not running; no background runtime was left behind.
- Exact next segment: integrate the contract/field-policy adapter into the first Super Admin Resources workspace without duplicating Registry metadata.


## 2026-09-27 — V0.5.3 Resources Workspace Checkpoint

- Built the Super Admin Resources workspace on top of the canonical Registry contracts.
- Kept Registry metadata centralized: no duplicate resource or field definitions were introduced in the UI.
- Reused the existing API transport and authentication token boundary.
- Exposed module grouping, resource contract metadata, capabilities/scopes and resolved field policy in one administrative workspace.
- Specialized domain workflows remain outside this generic workspace.

Verification: frontend TypeScript build PASS; Vite production build PASS; git diff --check PASS.

Next: contract-driven module/dependency administration, then capability/field administration.


## 2026-09-27 — V0.5.4 Module Workspace Checkpoint

Implemented the Super Admin Modules workspace using canonical module/resource Registry data. The UI exposes lifecycle state, dependencies and attached resources while preserving backend ownership of lifecycle rules. No second lifecycle engine or speculative persistence layer was added.

Verification: git diff --check PASS; frontend build initiated with the repository Node toolchain.

Next: capability and field administration.


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


## 2026-09-27 — V0.5.6 Visual Intelligence Layer Checkpoint

- Visual polish is now a cross-application requirement, not a separate redesign phase.
- Existing layouts remain intact; visual effects are additive and centralized.
- Shell-level ambient gradients, subtle texture, depth, entrance motion and hover refinement were added through index.css and stable shell hooks.
- Appearance settings now expose a persistent Visual Effects switch for constrained devices.
- prefers-reduced-motion is respected independently of the user switch.
- Visual effects must never imply that an AI computation, recommendation, authorization decision or backend state exists when it does not.
- Future AI surfaces should use the same visual language while clearly separating real intelligence from presentation.

Verification: TypeScript build PASS; git diff --check PASS. Vite bundling is environment-blocked by the current mixed Windows/WSL Node dependency resolution and missing native Rolldown binding; no lockfile/node_modules repair was performed.

Next: V0.5.6 platform administration integration.


## 2026-09-27 — V0.5.6 Platform Administration Integration Checkpoint

- Connected the Super Admin landing dashboard to the canonical frontend Registry contract boundary.
- Added live Registry-backed counts for modules, resources, declared capabilities and field contracts.
- Added an AI-ready platform context panel that describes the Registry-backed context without fabricating AI analysis or recommendations.
- Existing Resources, Modules and Capabilities workspaces remain the detailed control surfaces; the dashboard is now their platform-level entry point.
- Backend Registry remains authoritative and frontend data remains presentation-only.

Verification: TypeScript build PASS; git diff --check PASS. Vite production bundling remains environment-blocked by the mixed Windows/WSL dependency environment and missing native Rolldown binding documented in the previous checkpoint.


## 2026-09-27 — V0.5.6 Permission Administration Checkpoint

Permission administration is now connected end-to-end as a read-only control surface: Registry declaration → seeded Permission → Authorization decision → protected API → Super Admin Permission Matrix. Mutation controls are intentionally deferred until an existing authoritative backend mutation/audit path is available.

### V0.5.6.1 — Platform administration continuation

- **Roles workspace:** `/app/roles` now exposes persisted role-to-permission coverage from the protected Permission Administration API.
- **Module operational status:** `GET /api/v1/registry/modules/status` exposes the existing ModuleLifecycleService evaluation, including lifecycle state, operational state, and unavailable dependencies.
- **Architecture guardrail:** role presentation does not become a second authorization engine, and module lifecycle presentation does not become a second frontend lifecycle engine.
- **Lifecycle mutation guardrail:** current registry module definitions are in-memory/static contracts; no fake persistence controls were added. Mutation will be introduced only when a canonical persisted lifecycle owner exists.

## 2026-09-27 — V0.5.6.2 Audit administration

- Added protected Super Admin audit visibility at `GET /api/v1/platform/audit/recent`.
- Added the read-only `/app/audit` workspace using the canonical platform AuditService.
- Registered the `platform.audit` resource with READ/GLOBAL capability so authorization remains centralized.
- No second history/audit engine was introduced; this exposes the existing audit stream.

## 2026-09-27 — V0.5.6.3 Registry-Permission Reconciliation

### Verification boundary

A read-only reconciliation endpoint now compares Registry-declared resource capabilities/scopes with persisted resource permissions. It is protected by the existing platform/permission/READ authorization path and delegates to PermissionService; it does not create a second authorization engine or mutate permissions.

### Result

The next execution segment is a platform coverage dashboard built from existing Registry, permission, module-status, and audit contracts. No new persistence model is required.

## 2026-09-27 — V0.5.6.4 Platform Coverage Dashboard

The platform landing surface composes existing Registry, authorization, module lifecycle, and audit contracts into an operational coverage view. No new persistence, authorization engine, lifecycle engine, or audit/history implementation was introduced.

## V0.5.8 — Crop Module Completion Gate — 27 Sep 2026

Crop is closed for the current completion gate. CropsService is the canonical mutation owner; Intake delegates to it; Registry validation and AuthorizationService remain centralized; ownership relationship lifecycle remains canonical; frontend is connected. Verification: 17/17 focused Crop/module tests and frontend production build PASS.

Next: V0.5.9 Intake/FarmRecord completion gate and module-wide history/provenance verification.

## V0.5.9 — Intake/FarmRecord Completion Gate — 27 Sep 2026

Intake/FarmRecord is closed for the current gate. Intake is interpretation-only; authorization precedes extraction; Crop creation delegates to CropsService; FarmRecord creation delegates to FarmsService; FarmRecord remains immutable with READ/CREATE Registry capabilities. Verification: IntakeService 8/8; Crop focused gate 17/17; frontend production build PASS.

Next: V0.5.10 Farm module completion gate.

## 2026-09-27 — V0.5.10 Farm Module Completion Gate

Farm has passed the current completion gate. Farm lifecycle ownership remains canonical; FarmAsset custody/lease/lineage capabilities use the existing relationship, movement, lineage, and evidence primitives; FarmRecord remains immutable historical data; and authorization/Registry remain centralized.

Verification: Farm-focused tests 66/66; full backend regression 36 suites / 325 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS. Two stale Farm specs were updated to the current constructor/DTO contracts; no production implementation change was required.

Exact next segment: **V0.5.11 application-wide runtime lifecycle verification and module coverage reconciliation**, using existing contracts only.

## 2026-09-27 �w^~)�t V0.5.11 Application Runtime Verification

Application-wide runtime verification is now closed for the current segment. A permanent E2E smoke layer covers versioned health, Registry module/lifecycle visibility, protected Farm access, and protected permission administration. The runtime pass also exposed and fixed a real missing JWT guard on PermissionAdminController; the existing JwtAuthGuard is now the sole boundary before its authorization checks. No new persistence model or parallel authorization path was introduced.

Verification: E2E 4/4; backend regression 36 suites / 325 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS.

Exact next segment: **V0.5.12 application-wide module coverage reconciliation and remaining runtime contract hardening**, using existing contracts only.

## 2026-09-27 �w^~)�t V0.5.12 Registry Coverage Reconciliation

Registry coverage is now executable rather than documentary: every resource must reference a registered module, and legacy permission declarations must remain covered by first-class capabilities with valid scopes. First-class capabilities remain canonical during the incremental legacy migration. No new abstraction was introduced.

Verification: backend 36 suites / 327 tests; backend TypeScript PASS; frontend TypeScript PASS; frontend production build PASS.

Exact next segment: **V0.5.13 runtime module/API coverage reconciliation across remaining application surfaces**, using existing contracts only.

## 2026-09-27 — V0.5.13 Runtime Module/API Coverage Reconciliation

Runtime smoke coverage now spans the remaining high-value application boundaries: Auth, Users, Farms, Crops, Intake, Resource Transfer requests, Audit, Registry, Health, and permission administration. Protected endpoints reject unauthenticated access at runtime with 401.

No duplicate contract or new abstraction was introduced. Verification: E2E 10/10; backend 36 suites / 327 tests; backend TypeScript PASS; frontend TypeScript PASS; frontend production build PASS; diff check PASS. The existing frontend bundle-size warning remains a future performance item, not a reason to expand this milestone.

Exact next segment: **V0.5.14 authenticated runtime happy-path verification for the smallest stable read contracts**, using existing fixtures and avoiding mutation-heavy E2E coverage unless a real gap is found.

## 2026-09-27 — V0.5.14 Authenticated Runtime Happy-Path Verification

Authenticated runtime verification is now closed for the smallest stable read contracts.

- E2E now verifies authenticated `/api/v1/auth/me` using an existing active user and the application's canonical JwtService.
- E2E now verifies authenticated `/api/v1/farms/my` using an existing active Farmer with an existing Farm relationship.
- No test user/farm creation, cleanup workflow, mock authorization layer, or parallel authentication path was introduced.
- The existing JWT and AuthorizationService boundaries are exercised directly.

Verification: E2E 12/12; backend 36 suites / 327 tests; backend build PASS; frontend TypeScript PASS; frontend production build PASS.

The existing frontend bundle-size warning remains a future performance item and is not part of this milestone.

Exact next segment: **V0.5.15 authenticated read coverage for the next smallest stable domain surfaces**, only where existing fixtures and authorization contracts already support it; otherwise move to the planned UI/runtime integration pass without adding new infrastructure.

## 2026-09-27 — V0.5.15 Authenticated Read Coverage

Authenticated Crop read coverage is now closed for the current segment.

- E2E verifies protected `/api/v1/crops` with an existing active authorized user and existing Crop data.
- No new fixture framework, persistence model, authorization engine, or mutation-heavy E2E workflow was introduced.

Verification: E2E 13/13.

Exact next segment: **V0.5.16 authenticated read coverage for relationship/transfer and history surfaces where existing fixtures permit it; otherwise begin the planned UI/runtime integration pass.**

## 2026-09-27 — V0.5.16 Authenticated Transfer Read Coverage

Authenticated transfer-request read coverage is now closed for the stable incoming/outgoing collection routes.

- E2E verifies /api/v1/resource-transfers/requests/incoming and /api/v1/resource-transfers/requests/outgoing with an existing active user and a real JWT.
- The test does not create, accept, reject, cancel, or otherwise mutate transfer requests.
- Empty collections remain a valid runtime result; the contract is the authenticated collection boundary.

Verification: E2E 14/14.

Exact next segment: **V0.5.17 authenticated history/relationship read coverage where a clean existing route and authorization contract are available; otherwise move into the planned UI/runtime integration pass.**


## 2026-09-27 — V0.5.17 Authenticated History/Relationship Read Coverage

The authenticated history/relationship read segment is now closed using existing routes, fixtures, and authorization contracts only.

- E2E verifies /api/v1/users/:id/history for an existing active user.
- E2E verifies /api/v1/users/:id/relationships/history for the same existing active user.
- The checks exercise the real JWT and existing authorization/relationship services; no alternate authorization path, fixture framework, or mutation-heavy setup was introduced.
- Empty collections remain valid runtime results; the contract being verified is the authenticated collection boundary.
- Verification: E2E 15/15; full backend regression 36 suites / 327 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS; git diff --check PASS.
- The existing frontend bundle-size warning remains a future performance item and is not expanded into this checkpoint.

### Next target

Proceed to the planned **UI/runtime integration pass** across the completed module contracts, using existing APIs and centralized capability/field-policy presentation without introducing duplicate backend rules or new infrastructure.


## 2026-09-27 — V0.5.19 User History UI/Runtime Integration

### COMPLETE

Canonical UserHistory is now connected to the existing History workspace. The frontend consumes the existing authenticated user-history endpoint and merges its versioned events into the established lifecycle timeline; ResourceRelationship history remains a separate canonical relationship stream.

### Implementation

- Added `UserHistoryEvent` frontend typing matching the backend response shape.
- Added `api.userHistory()` using the existing authenticated API transport.
- HistoryPage now loads user history with farms, crops, transfers and relationship history.
- Version, action, timestamp, changed fields and actor context are presented in the existing timeline.
- User `READ_HISTORY` is currently GLOBAL/admin-only, so the user-history request is fail-soft for non-administrative users; authorized relationship/lifecycle history remains available.
- No duplicate history engine, persistence model, authorization path, or backend rule was added.

### Verification

- Frontend TypeScript: PASS.
- Frontend Vite production build: PASS; 2311 modules transformed.
- Backend TypeScript no-emit: PASS.
- Full backend regression: 36/36 suites, 327/327 tests PASS.
- `git diff --check`: PASS.
- Existing frontend bundle-size warning remains PLANNED for a later performance pass and is not part of this milestone.

### Next execution target

**Cross-module UI/runtime coverage and compatibility pass.** Continue closing real integration gaps only; preserve existing working UI, centralized contracts, and compatibility guardrails. Avoid speculative redesign or new infrastructure.


## 2026-09-27 — V0.5.20 UI Compatibility & Runtime Readiness

### COMPLETE

The cross-module UI/runtime completion pass is closed for the current scope without redesigning stable surfaces.

- Verified responsive mobile navigation, horizontal overflow protection, safe-area handling, reduced-motion support, and visual-effects off support.
- Added accessible labels to mobile navigation open/close controls.
- Reviewed major loading, empty, and error-state patterns; existing coverage is sufficient, so no duplicate retry framework was introduced.
- Runtime API health:  returned status ok.
- Frontend TypeScript and production build PASS; 2311 modules transformed.
- git diff --check PASS; working tree clean after checkpoint.
- Existing ~608 kB frontend bundle warning remains deferred to a dedicated performance pass.

### Next execution target

**Production hardening pass:** verify remaining backend/frontend runtime boundaries, security/authorization regressions, and release checks without speculative infrastructure.


## 2026-09-27 — V0.5.21 Production Hardening

### COMPLETE

The first production-hardening pass is closed with concrete runtime/security improvements only.

- Restricted backend CORS to the configured origin allowlist instead of reflecting arbitrary origins.
- Added configurable `CORS_ORIGINS`; development defaults remain compatible with the frontend on port 4000.
- Added auth-endpoint throttling using the existing NestJS throttler dependency: register 5/minute, login 10/minute, refresh 20/minute.
- Existing JWT expiry and active-user checks remain enforced; no duplicate session/auth system was introduced.
- Backend TypeScript no-emit: PASS.
- Full backend regression: 36/36 suites, 327/327 tests PASS.
- Frontend TypeScript: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Runtime health: PASS.
- CORS runtime check: PASS for configured frontend origin.
- `git diff --check`: PASS.

### Next execution target

**Release-readiness verification:** validate the hardened auth/runtime paths against the live development stack, then close the remaining release checklist items without expanding scope into speculative infrastructure.


## 2026-09-27 — V0.5.22 Runtime Workspace & CORS Closure

### COMPLETE

Release-readiness verification exposed and closed two runtime issues outside ordinary unit coverage.

- The canonical workspace is `/home/jj/Dev/KrishiKendram`; development helper commands were still targeting the retired `KrishiKendram-Development` copy and were redirected to the canonical workspace.
- A live Nest startup check initially exposed stale-module wiring in the retired copy; the canonical workspace already contains the required `RelationshipsModule` import for `CropsService`.
- CORS now uses an explicit origin callback against the configured allowlist rather than relying on array reflection behavior.
- The hardened auth/CORS changes compile and the full backend regression remains 36/36 suites, 327/327 tests PASS.
- The current workspace starts through Nest application initialization successfully with all major routes mapped.

### Next execution target

**Release-readiness sweep:** perform one final canonical-workspace verification of backend health, frontend build, repository cleanliness, and checkpoint state, then move to the next product milestone.


## 2026-09-27 — V0.5.23 Transfer Evidence & Temporal UX Closure

### COMPLETE

- Extended transfer requests with evidence reference metadata and persisted the existing `ResourceEvidence` entity at request creation.
- Reused the same evidence ID through ownership transfer completion and partial farm-asset transfer movement.
- Added History workspace controls for effective time, expiry, evidence type/reference/document/issuer.
- Added focused regression coverage for evidence persistence and reuse.
- Backend TypeScript: PASS; full regression: 36 suites / 328 tests PASS.
- Frontend TypeScript/build: PASS; 2311 modules transformed.
- `git diff --check`: PASS.
- Existing bundle-size warning remains deferred to the dedicated performance pass.

### Next execution target

**Product-domain completion:** continue closing concrete user-facing lifecycle and cross-module gaps using the existing centralized foundations, with no speculative infrastructure expansion.


## 2026-09-28 — V0.5.25 Contextual FarmAsset Transfer Handoff

### COMPLETE

FarmAsset transfer initiation is now reachable directly from the Farm workspace without duplicating the canonical transfer workflow.

- FarmAsset cards now expose a contextual transfer action.
- The action routes to the existing History transfer composer with `farmAsset:<id>` preselected through the URL.
- Existing member lookup, quantity validation, transaction/evidence fields, temporal fields, and transfer approval/acceptance remain canonical.
- No new backend endpoint, authorization rule, persistence model, or parallel transfer workflow was introduced.

### Verification

- Frontend TypeScript: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Existing ~616 kB bundle warning remains deferred to the dedicated performance/code-splitting pass.
- Product-code scope: `HistoryPage.tsx` and `FarmsPage.tsx` only.

### Next execution target

Continue the next concrete product-domain/runtime gap. Prefer additive user-facing integration over new infrastructure, and preserve the centralized relationship, movement, lineage, evidence, transfer, and authorization foundations.


## 2026-09-28 — V0.5.26 Contextual Farm Transfer Handoff

### COMPLETE

Whole-farm transfer initiation now has the same contextual handoff as FarmAsset transfer.

- Farm cards expose a transfer action that routes to the existing History transfer composer with the farm resource preselected.
- The canonical transfer workflow remains the sole implementation for authorization, evidence, temporal fields, acceptance/rejection and administrative approval.
- No backend change or duplicate transfer UI was introduced.

### Verification

- Frontend TypeScript: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Existing ~616 kB bundle warning remains deferred to the dedicated performance/code-splitting pass.

### Next execution target

Continue the next concrete product-domain/runtime gap without reopening completed platform foundations.


## 2026-09-28 — V0.5.27 FarmRecord History Handoff

### COMPLETE

FarmRecord entries now expose direct contextual navigation into the unified History workspace.

- Each record has a compact history action.
- The action searches the existing unified timeline using the record title/category/identifier.
- No new record-history model or endpoint was introduced.
- Existing FarmRecord authorization, audit/history and unified timeline foundations remain canonical.

### Verification

- Frontend TypeScript: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Existing ~616 kB bundle warning remains deferred to the dedicated performance/code-splitting pass.
- `git diff --check`: PASS.

### Next execution target

Continue the next concrete product-domain/runtime gap without reopening completed platform foundations.


## 2026-09-28 — V0.5.28 Relationship-Aware FarmAsset Ownership Enforcement

### COMPLETE

The FarmAsset authorization boundary now resolves the active OWNER relationship before evaluating ownership-scoped actions. This closes a concrete temporal-ownership gap where a transferred asset could still use the parent farm owner as the ownership context for update, delete, or relationship-history access.

- Added one small FarmsService ownership resolver that prefers the active FarmAsset OWNER relationship and falls back to the farm owner only when no active resource relationship exists.
- Applied the resolver to FarmAsset relationship-history, update, and delete authorization paths.
- Preserved the existing FARM-scope access path and centralized AuthorizationService; no new authorization engine or relationship model was introduced.
- Added a regression test proving a transferred FarmAsset uses its current relationship owner for UPDATE authorization.

### Verification

- FarmService focused regression: 39/39 tests PASS.
- Backend build: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Working tree changes are limited to the concrete authorization fix, regression test, and execution records.

### Next execution target

Continue the concrete product-domain/runtime audit, prioritizing real correctness or user-facing integration gaps and avoiding speculative infrastructure.


## 2026-09-28 — V0.5.29 Relationship-Aware FarmAsset Split Authorization

FarmAsset split target creation now authorizes against the active temporal OWNER, matching the source UPDATE authorization. Regression added for a transferred asset; 5/5 FarmResourceLineageService tests pass. Existing architecture reused; no speculative layer added.

### V0.5.30 Checkpoint — Crop Temporal Ownership
- Lifecycle authorization must honor an active temporal OWNER relationship for Crop resources before falling back to the parent farm owner.
- Do not invent Crop transfer APIs where the canonical transfer workflow does not yet support Crop.
- Regression verified with the CropService suite (15/15).

### V0.5.31 Checkpoint — Crop Restore Continuity
- Restore is a lifecycle continuation, not a new ownership decision: preserve the last recorded Crop OWNER when relationship history exists.
- Authorization for RESTORE uses that recovered owner; relationship recreation uses the same owner.
- No new transfer API or ownership abstraction was introduced.

### V0.5.32 Checkpoint — Ownership Transfer Integrity
- Hardened the canonical ownership transfer boundary against invalid temporal ordering and duplicate active OWNER relationships.
- Verified with 6/6 relationship-service tests and a successful Nest backend build.

### V0.5.33 Checkpoint — Farm Temporal Ownership Alignment
- Farm lifecycle transfer now uses the canonical active temporal owner rather than assuming the Farm.ownerId field is authoritative.
- Existing farm owner persistence remains synchronized after transfer; no duplicate transfer workflow introduced.

### V0.5.34 Checkpoint — Farm Lifecycle Temporal Ownership
- Farm authorization paths must resolve the active temporal OWNER before using the legacy `Farm.ownerId` fallback.
- Applied this consistently to Farm READ/UPDATE/DELETE and child creation authorization for FarmAsset/FarmRecord.
- Reused the existing relationship and authorization services; no new ownership abstraction was introduced.
- FarmsService regression: 40/40 passed; backend build passed.

### V0.5.35 Checkpoint — Custody and Lease Temporal Integrity
- Custodian replacement and lease replacement must not backdate before the currently active relationship's `validFrom`.
- Return-custody and lease-end paths already enforce their corresponding start boundaries.
- Keep this rule centralized in `ResourceRelationshipService`; do not add duplicate module-specific temporal validation.
- RelationshipService regression: 8/8 passed; backend build passed.

## V0.5.36 — Lineage Split/Merge Temporal Integrity
- FarmAsset split and merge now enforce source ownership temporal boundaries before creating target relationships, movements, or lineage records.
- Added regressions for backdated split and merge effective dates.
- FarmResourceLineageService tests: 7/7 passed; backend build passed.

## V0.5.37 — Partial Transfer Temporal Integrity
- Partial FarmAsset transfer now rejects effective dates before the active source ownership start.
- TransferRequestService tests: 15/15 passed; backend build passed.

### V0.5.38 Checkpoint — Relationship Creation Bypass Audit
- Audited every production ResourceRelationship write in backend/src.
- OWNER creation remains centralized; no direct module-level relationship creation bypass was found.
- FarmRecord temporal ownership was not introduced because its registry contract intentionally remains farm-owned.

### V0.5.39 Checkpoint — Transfer Movement Temporal Integrity
- Central ownership transfer rejects an effective date earlier than the resource's latest recorded movement.
- Regression coverage added; RelationshipService 9/9 passed and backend build passed.

### V0.5.40 Checkpoint — Lifecycle Closure Integrity Audit
- Verified destructive lifecycle paths close active temporal relationships transactionally.
- Farm deletion closes the farm plus child FarmAsset/Crop relationships; asset deletion and Crop archive close their own relationships.
- No additional closure gap was identified; 4 related suites / 47 tests passed.

### V0.5.41 Checkpoint — Authorization Matrix Final Sweep
- Completed authorization entry-point sweep and secured the audit administration controller with JwtAuthGuard.
- Central authorization regression: 7 suites / 99 tests passed; backend build passed.

### V0.5.42 Checkpoint — API Contract & DTO Validation Sweep
- Confirmed strict global request validation and strengthened required transfer identifiers with @IsNotEmpty.

### V0.5.43 — History / Provenance Completeness Sweep
- Completed a controlled audit of the existing history/provenance foundation rather than introducing another generic history layer.
- AuditEvent/UserHistory cover security and user-version history; ResourceRelationship/Movement/Lineage/Evidence cover resource lifecycle provenance; transfer requests retain workflow state and evidence references.
- No additional implementation was justified by the current PMD scope.

### V0.5.44 — Frontend ↔ Backend Integration Sweep
- Completed the frontend API-to-controller route audit across the current PMD workflows.
- Auth, Farm/Crop CRUD, FarmAsset lifecycle, movement/lineage/evidence history, custody/lease, intake, and transfer-request operations map to real backend routes.
- Production frontend build passed; existing ~616 kB minified bundle warning is unchanged and intentionally deferred to the performance/code-splitting pass.

### V0.5.45 — Frontend Workflow Completion
- Completed the operational UI pass for Farm/Crop/History/Transfer workflows.
- Contextual resource handoff now survives navigation into the transfer form; existing real backend endpoints remain the source of truth.
- Frontend production build passed; the existing bundle-size warning remains deferred to the performance pass.

### V0.5.46 — Cross-module production regression sweep
- 27 suites / 234 tests passed across the core domain/authorization/relationship regression surface.
- Backend and frontend production builds passed.
- No cross-module regression gap requiring a code change was found.

### V0.5.47 — Performance and device-compatibility pass
- Applied low-risk route-level code splitting to preserve functionality while reducing initial payload.
- Preserved the existing visual-effects toggle and prefers-reduced-motion behavior.
- Frontend production build passed with a 440.82 kB initial JS chunk and separate route chunks.

## V0.5.51 — Production Runtime and Dependency Security Hardening

- Fixed the backend production start contract: TypeScript emits dist/src/main.js, and start:prod now targets that real artifact.
- Verified the compiled production backend starts successfully and reaches the Nest application startup banner on the canonical WSL/Node 24 environment.
- Backend regression: 36 suites / 343 tests passed.
- Prisma schema validation passed; the current Prisma migration set contains 20 migrations and the database is up to date.
- Frontend production build passed: 2,311 modules; 441.17 kB initial JavaScript / 140.71 kB gzip.
- Production dependency audit is clean for backend and frontend; backend development-tooling advisories were remediated with patch-level fast-uri/js-yaml updates.
- No application architecture or Prisma dependency-line change was introduced.
- Checkpoint committed as 4d6fb94.

### Next execution target

Continue the remaining release/runtime and product-readiness checks without reopening completed foundations.

## V0.5.52 — Authenticated E2E Runtime Revalidation

- Re-ran the complete authenticated application E2E smoke suite after dependency/runtime hardening.
- Warm runtime result: 15/15 tests passed.
- An initial cold run had 14/15 pass because the existing-user current-user read exceeded the default 5-second test timeout; immediate warm rerun passed without code changes, so no timeout inflation or test weakening was introduced.
- Backend release image revalidated successfully from the backend build context after the Docker runtime hardening change; image `krishikendram-backend-rc:latest` built successfully with non-root runtime and healthcheck.

## V0.5.53 — System Workspace Completion

- Replaced the admin System Coming Soon placeholder with a functional workspace preference surface.
- Reused the existing Zustand theme contract for system/light/dark mode, Krishi/Ocean/Harvest/Midnight colour themes, and visual-effects control.
- Preserved the existing reduced-motion behavior and kept all preferences presentation-only; no backend authority or business-data contract was duplicated.
- Lazy-loaded the System workspace so the new admin UI remains outside the initial frontend bundle.
- Frontend production build passed: 2,312 modules; initial JavaScript 431.04 kB / 137.46 kB gzip.
- git diff --check passed.

## V0.5.54 — FarmAsset Lifecycle Route Verification

- Closed the deferred runtime boundary check for the FarmAsset operational lifecycle already implemented by the canonical FarmsService.
- Added authenticated-boundary E2E coverage for custody assignment, custody return, lease creation, lease end, asset split, and asset merge routes; unauthenticated requests consistently return HTTP 401.
- No new authorization path, persistence model, lifecycle abstraction, or test fixture framework was introduced.
- Verification: authenticated application E2E **17/17 passed**; frontend production build **2,312 modules**, initial JavaScript **431.04 kB / 137.46 kB gzip**; `git diff --check` passed.

### V0.5.55 — Release Candidate Evidence Reconciliation

- Reconciled current release evidence against the canonical repository without changing application architecture.
- Current backend regression evidence: 36 suites / 346 tests passed; frontend production build: 2,314 modules.
- Current Prisma state: 20 migrations present and database schema up to date.
- Production Compose configuration validates with required runtime secrets supplied; full backend/frontend production image build completed successfully.
- Backend release image runs as non-root node and contains the  Docker healthcheck.
- Live production Compose startup was subsequently verified in an isolated project and removed cleanly without disturbing the development PostgreSQL container/volume.
- Working tree was clean after checkpoint commit 2d449af.

### V0.5.56 — Frontend Production Dependency Classification Hardening

- Audited the frontend production dependency graph and identified the sole moderate advisory as undici, pulled by the shadcn CLI package.
- Confirmed shadcn is not imported by application source and is a build/development tool; moved it from runtime dependencies to devDependencies without changing application code.
- Re-ran the production-only dependency audit: **0 vulnerabilities** (0 low, 0 moderate, 0 high, 0 critical).
- Re-ran the frontend production build: **PASS**, 2,314 modules; 433.92 kB initial JavaScript / 138.14 kB gzip.
- git diff --check: PASS.

### V0.5.57 — Production Runtime Acceptance

- Isolated production Compose smoke completed under project kkrc without disturbing the development PostgreSQL container/volume.
- Backend and frontend production images built successfully; frontend production build passed with 2,314 modules and 433.92 kB initial JavaScript / 138.14 kB gzip.
- All 20 Prisma migrations applied successfully to the isolated PostgreSQL database.
- Backend /api/v1/health returned production status: ok; frontend /healthz returned ok.
- PostgreSQL, backend, and frontend reached healthy state. Backend runtime user verified as node.
- Restart smoke passed and both health endpoints remained successful after restart.
- Isolated RC containers, network, and volume were removed after verification.

### V0.5.58 — Final RC Reconciliation

- Release evidence reconciled across lifecycle integrity, relationship/movement controls, authorization, audit/provenance, DTO/API validation, database migrations, dependency hardening, regression, production builds, and live runtime smoke.
- No domain scope expansion or speculative infrastructure was introduced during RC closure.
- Remaining action is release checkpoint/tag preparation only.

### V0.5.59 — Deployment Readiness

- Production deployment requires real POSTGRES_PASSWORD, JWT_SECRET, and production CORS_ORIGINS; RC smoke credentials were test-only and discarded.
- Deployment procedure must apply Prisma migrations with prisma migrate deploy and verify health after startup.
- Production PostgreSQL persistence must be preserved; destructive volume removal is not part of normal deployment.

### 2026-10-02 — Post-RC integration continuation and regression reconciliation

- Revalidated the canonical production stack: PostgreSQL, backend and frontend containers are healthy; API health is `ok`; frontend and Prisma Studio both return HTTP 200.
- Full backend unit/service regression is now **40 suites / 365 tests passed**, including new AuditService redaction coverage.
- Authenticated application E2E is **21/21 passed** after correcting a stale Registry test to use the required Super Admin role. The failure was test expectation drift, not a production authorization regression.
- Frontend production build passed: **2,320 modules**, initial JavaScript **441.20 kB / 139.99 kB gzip**.
- Backend production dependency audit: **0 vulnerabilities**.
- Added explicit AuditService regression coverage proving recursive redaction of password/token/API-key/database-URL/connection-string metadata before audit activity is returned.

### Remaining closure plan

1. Complete the PARTIAL module gates in order: Auth/Users/Admin → Farms/FarmAsset/FarmRecord → Crop/Intake → Livestock → Marketplace → Lifecycle/History/Evidence.
2. For each module, perform the same evidence gate: backend contract + authorization + lifecycle/history + frontend workflow + authenticated runtime smoke + regression.
3. Finish the systematic frontend UX acceptance sweep for loading, empty, error, refresh, mobile and reduced-motion states across every operational screen.
4. Reconcile the remaining production/release checklist against the actual running stack, including migration state, backups/recovery procedure, secrets, CORS and restart behavior.
5. Remove or archive only confirmed generated backup artifacts after verifying they are not part of the recovery plan; do not delete user/project data speculatively.
6. Only after all gates are evidenced, produce the final pending-task register and go-live plan; do not mark a module COMPLETE merely because its backend foundation exists.

### Next execution target

Continue the concrete PARTIAL module gates from the top of the stack, beginning with authenticated Auth/Users/Admin runtime acceptance, while preserving all completed relationship, history, audit, registry and security foundations.

## V0.5.61 — Production operational hardening

- Added NestJS shutdown hooks so production SIGTERM/restart paths release Prisma connections cleanly.
- Hardened the deployment runbook so PostgreSQL starts and becomes healthy before Prisma migrations are applied, and application traffic starts only after migrations complete.
- Added concise PostgreSQL logical backup/recovery guidance and explicit production-volume/secrets safeguards.
- Backend build and full regression remain green: 36 suites / 346 tests passed.
- Next execution target: preserve the clean operational checkpoint and prepare the post-RC go-live deployment when the operator is ready.

### 2026-10-02 — Domain workspace refresh consistency pass

- Audited operational list workspaces for manual refresh plus existing automatic live-refresh behavior.
- Added explicit manual Refresh actions to Farms and Crops while preserving the existing live-refresh hook and loading/error handling.
- Users/Admin, Resources, Modules, Permissions, Roles, Audit, Database, History, Activities, Livestock and Marketplace already expose refresh/live-refresh behavior in the current implementation.
- No domain API, authorization, persistence, or lifecycle semantics were changed by this UX pass.

### 2026-10-02 — Database administration safety hardening

- Re-audited the Super Admin Database Parameters workspace and its Registry endpoints.
- Confirmed normal database values are masked and sensitive reveal is Super Admin-only, Registry-controlled, and audit-recorded.
- Added explicit no-cache response headers to the sensitive database reveal endpoint so browser/proxy caching does not retain raw credentials.
- Reconciled the Registry controller test constructor with the current AuditService dependency.
- Live API/frontend health remained healthy after the code changes; git diff --check passed.

### 2026-10-02 — Auth / Users / Admin runtime acceptance extension

- Extended the authenticated application smoke suite so Registry module/status reads explicitly use an authenticated Super Admin rather than relying on an unauthenticated expectation.
- Added Super Admin runtime coverage for Users collection, platform Permission administration read, and masked Database Parameters read.
- The database assertion verifies the normal administration surface remains non-sensitive (`sensitiveRevealed=false`) and does not expose the configured password.
- `git diff --check` passes after the test-suite extension.
- The Auth / Users / Admin product gate remains PARTIAL: this closes additional API/runtime evidence but does not yet claim the complete UI workflow gate.
- Test execution of the newly edited E2E file is pending restoration/use of a Linux Node runtime on the workstation; the previously recorded authenticated application E2E baseline remains 21/21 passed before this extension.


### 2026-10-03 — Canonical WSL root and operational recovery continuation

- Re-established `/home/jj/Dev/KrishiKendram` under Ubuntu-26.04 as the sole active development root; the stale Windows `D:\Dev\KrishiKendram` tree is not used for current execution.
- Centralized filesystem resources through `backend/config/resource-paths.json`, including backend/frontend, Prisma, configuration, runtime assets, Super Admin image, reports, scripts and documentation.
- Added non-secret environment contract validation (`npm run check:env`) and documented canonical recovery variable names in `.env.example`; real credential values remain excluded from Git.
- Added the canonical `npm run recover:super-admin` operator command and corrected the legacy `bootstrap:super-admin` alias to the same local recovery implementation.
- Verified the Super Admin runtime image is served from the active frontend with HTTP 200 after restart.
- Restarted the active WSL backend/frontend stack and verified API HTTP 200 and UI HTTP 200.
- Backend regression is currently **42 suites / 387 tests passed**; backend production build and `git diff --check` passed.
- Break-glass recovery is recorded as DONE in the enhancement register; the broader Auth/Users/Admin product gate remains PARTIAL pending complete UI workflow acceptance.

## 2026-10-04 — God Mode Control-Plane Expansion

**Status: ACTIVE — PHASES 1–2 IMPLEMENTED / PHASE 3 NEXT**

The next major platform administration pass is governed by `docs/GOD-MODE-ARCHITECTURE.md`. God Mode is the authoritative root control plane for the whole KrishiKendram platform. It must control rather than merely display system truth, runtime, database/connections, Docker/infrastructure, registry/modules/resources, fields/validation, roles/authorization, users/lifecycle, navigation, themes, feature flags, security, approval workflows, credentials, audit/history, snapshots/recovery, route diagnostics, system diagnostics and dependency impact.

Before implementation, the current working state was checkpointed at commit `0b01374` (`Checkpoint God Mode control center before architecture expansion`) so the architecture expansion can be reverted cleanly.

Execution order: central truth reconciliation → canonical God Configuration Registry → God navigation/control surfaces → snapshot/diff/health/audit/recovery → operational controls → delegated Super Admin/Admin/Cluster Head policy. Significant mutations follow **validate → dependency analysis → snapshot → apply → health-check → audit**.

Do not create parallel configuration sources or frontend-only authorization. Canonical root remains `/home/jj/Dev/KrishiKendram`.

### 2026-10-04 Batch Checkpoint — Phases 1–2

- **Batch 1 — Central truth reconciliation:** reconciled the Prisma datamodel with the already-applied database governance foundations: UserType, UserApprovalStatus, ModuleAccessState, core-staff roles, SystemSetting, and UserModuleAccess. This was additive reconciliation only; existing application data and Docker volumes were not reset or deleted.
- **Batch 2 — Persistent God Configuration Registry:** added GodConfiguration and GodConfigurationDependency as the canonical persisted registry foundation. The registry records stable ID, category, value/type, defaults, editability, God-only policy, risk, restart/approval requirements, snapshot/audit policy, lifecycle, version and ownership metadata.
- Added protected God Mode registry APIs for list, detail and governed update; non-editable metadata entries are explicitly rejected rather than silently bypassed.
- Added the first 20 canonical God control categories from the architecture as registry metadata, owned by GOD_MODE_ARCHITECTURE.
- Repaired the database migration state without reset: the failed duplicate 20261004160000_god_mode_authority_tier attempt was marked rolled back after confirming the earlier 20261004110000_god_mode_authority_tier migration already supplied the enum/column. prisma migrate status now reports Database schema is up to date.
- Verification after the batches: Prisma schema validation/generation passed, TypeScript compilation passed, and backend regression is 42 suites / 387 tests passed.


### 2026-10-05 Batch — Snapshot & Recovery Foundation

God Mode Phase 3 now includes a real persisted recovery foundation rather than metadata-only snapshot policy. `GodConfigurationSnapshot` stores pre-change configuration values, version, actor, reason, source/status and timestamps. Protected list and rollback routes are available to the God identity. Rollback creates a new pre-rollback snapshot and advances configuration version, preserving an auditable lineage instead of rewriting history. Verification: Prisma migration status up to date; backend 42/42 suites and 387/387 tests pass; frontend production build passes.


## 2026-10-11 — Canonical AI Control Plane & Central Configuration Layout

**Status: IMPLEMENTATION ACTIVE — canonical registry and module contract split established; verification pending.**

KrishiKendram must operate one AI control plane, not a collection of module-specific AI configuration systems. The canonical entrypoint is `ai/registry/ai-platform-registry.json` (registry ID `KK-AI-REGISTRY-001`). The application filesystem map `backend/config/resource-paths.json` registers the AI root, registry, module contracts, providers, runtimes, policies, evaluations and governance documentation. Paths are resolved through registered canonical references; new hardcoded per-page paths and duplicate registries are prohibited.

The root registry owns shared capabilities, global context and safety rules, conversation/fact lifecycle, provider constraints, God Mode control areas and stable-ID links. Module-specific contracts stay in the centrally governed `ai/modules/` directory and are loaded by the root manifest. Provider/runtime inventories, policy indexes and evaluation indexes stay in their own centrally governed subdirectories and are linked from the same root entrypoint.

Initial module contracts: `KK-USER-001`, `KK-FARM-001`, `KK-CROP-001`, `KK-LIVESTOCK-001`, `KK-MARKETPLACE-001`. Each contract declares module-owned allowed capabilities, context references, allowed/restricted fields, candidate fact targets, confirmation, provenance and audit policies. Shared policy must be declared once and reused, not copied into each module file.

Backend `AiRegistryService` hydrates module contracts from the manifest and rejects missing linked files, wrong registry/module identities, non-canonical contracts, missing initial-module links, or unsafe policy changes. AI remains prohibited from direct canonical database writes. All AI-proposed writes must pass backend authorization, central validation, explicit user confirmation, provenance attribution and audit. Secret values must not be stored in the registry or source control; only secret references are permitted.

Execution sequence: (1) prove build/tests and registry contract loading, (2) expose read-only inventory and health in God Mode, (3) add versioned governed editing through existing God Configuration Registry and snapshot/audit/rollback, (4) implement provider discovery and installation/health checks, (5) implement consented evaluation and cost/scale controls, (6) connect voice-guided drafts to module forms with validate-preview-confirm-apply, and (7) add authenticated cross-device conversation sessions. Never declare a provider production-ready from a manifest entry alone.

Related canonical documents: `docs/KK-AI-PLATFORM-REGISTRY.md`, `docs/KK-AI-CONVERSATION-AND-CONTEXT.md`, `docs/AI-VOICE-PLATFORM-AND-GOVERNANCE.md`, `docs/GOD-MODE-ARCHITECTURE.md`, `docs/CTO-MASTER-BLUEPRINT.md`, and the product master document `Absolutely KK PMD.docx`.


### 2026-10-11 implementation checkpoint — read-only God Mode AI inventory

- Added the authenticated God Mode route `GET /api/v1/admin/god-mode/ai-control-plane`, guarded by JWT and the immutable God identity assertion.
- The route reuses `AiRegistryService` and returns canonical registry metadata, hydrated module contracts, linked provider/runtime/policy/evaluation inventory and safety posture without secret values.
- God Mode now has a read-only AI Control Plane panel for module contracts, provider/runtime entries, central links and safety requirements.
- Registered eight AI governance domains in the existing God Configuration Registry: control plane, module contracts, providers, runtimes, policies, evaluations, cost/scale, and voice/conversation. These remain metadata-only until file-backed governed updates are implemented.
- Verification before the final registry-domain seed: backend build PASS; focused AI registry tests 12/12 PASS; frontend production build PASS after fixing VoiceAgent transcript speaker literal types; API health HTTP 200 and UI HTTP 200. The backend needs one final rebuild/restart to seed the newly added AI domains and verify the live endpoint.


### Final verification — 2026-10-11

- Backend Nest build PASS after AI God Configuration domain registration.
- Focused AI registry suite PASS: 1 suite / 12 tests.
- Frontend production build PASS (TypeScript and Vite).
- Backend service restarted on the built application; health endpoint HTTP 200; frontend HTTP 200.
- Runtime route map includes `/api/admin/god-mode/ai-control-plane`; unauthenticated request to the versioned endpoint returns HTTP 401, confirming the guard is active.
- Direct Prisma verification found all 8 AI governance domains in the existing God Configuration table. They are intentionally non-editable metadata until the file-backed mutation/snapshot/rollback workflow is implemented.


## CTO execution checkpoint — centralized AI platform — 2026-10-11

### Verified
- Focused AI registry tests: 19/19 passed.
- Backend NestJS production build: exit code 0.
- Frontend TypeScript/Vite production build: exit code 0; 2,325 modules transformed.
- The focused suite covers canonical registry loading, God Mode inventory linkage, allowlisted revision tokens, stale-revision protection, invalid config rejection, snapshot save/rollback, path traversal and symlink defenses, module/capability authorization, context-field policy, and blocking canonical database writes through the AI registry layer.

### Scope and caveat
These results establish the focused test suite and compilation only. They do not prove that every route, browser workflow, live AI provider, credential, or production runtime is healthy. Do not report end-to-end health without separate runtime/API checks.

### Next execution order
1. Verify actual AI registry/controller route registration and access guards.
2. Exercise read-only inventory/diagnostic endpoints and confirm the God Mode UI consumes the canonical backend response rather than duplicating registry metadata.
3. Verify revision-aware save and rollback through the authenticated API, including stale revision and unauthorized-role rejection.
4. Route shared provider/runtime/policy selection through the canonical registry and central AI service; keep module contracts centrally stored and linked by registry IDs.
5. Run focused tests, backend/frontend builds, then relevant integration tests and a smoke test.

### Guardrails
- Canonical project root remains `/home/jj/Dev/KrishiKendram`.
- Preserve uncommitted work; do not reset or overwrite user changes.
- Do not delete Docker volumes, reset PostgreSQL, or expose secrets in logs/UI.
- Authorization must happen before AI context assembly. Respect module field allowlists and attribution/audit metadata. AI must not write canonical database records directly; mutations go through validated, authorized application services.

## Verified AI Governance Checkpoint — 2026-10-11

**Status:** Code-level verification passed.

- Conversation service requires central-registry-defined provenance for AI assistant messages and proposed fact candidates.
- Provenance timestamps are validated; message model metadata is checked for consistency.
- Ordinary user messages do not need AI provenance.
- Proposed facts cannot bypass the confirmation gate by being created as confirmed/applied or by disabling confirmation.
- Verification evidence: 4 AI test suites passed (42 tests); NestJS backend build passed; `git diff --check` passed.
- Remaining validation: full backend regression suite and runtime/API integration checks.
- Do not mark production deployment complete based on unit tests or a successful build alone.

## 2026-10-12 — Canonical A Frontend Lint Repair and Verification

### Scope and source of truth
- Canonical workspace: `/home/jj/Dev/KrishiKendram` (A).
- Verification checkpoint: `8b8e82d10f1df7faf2d09835af3349cd94ee9adf` (`Integrate governed AI platform and voice agent`), with the three source repairs below remaining uncommitted at verification time.
- Integration (B) and Development (C) remain frozen and are not modified by this work.

### Repairs made
- `frontend/src/App.tsx`: documented the intentionally optional sidebar-preference storage failure in the catch block.
- `frontend/src/components/ui/VoiceAgent.tsx`: replaced the transcript-result ternary expression with explicit final/interim transcript branching; documented optional language-preference storage failure.
- `frontend/src/pages/admin/DatabasePage.tsx`: moved the `Field` component to module scope to preserve component identity and satisfy the React Compiler lint rule.

### Verified evidence
- Frontend ESLint: **0 errors, 83 warnings**. Warnings remain open for a deliberate follow-up; they were not suppressed or represented as resolved.
- Frontend production build: PASS.
- Backend production build: PASS.
- Full backend test suite: **48/48 suites and 439/439 tests passed**.
- `git diff --check`: PASS.
- Source patch review showed only the three intended tracked source files modified at this checkpoint.
- Evidence report: `/home/jj/Dev/cto-recovery-snapshots/A-post-lint-verification-20261012-232242.txt`.

### Acceptance boundary and remaining work
- This checkpoint verifies builds, the full backend unit-test suite, lint error removal, and whitespace integrity.
- It does not by itself prove live authenticated UI workflows, voice-agent end-to-end integration, database/runtime acceptance, or complete product/module acceptance.
- Remaining frontend lint warnings require risk-based review, prioritizing effect dependencies/state timing, type safety, and React Compiler memoization diagnostics. Do not apply blanket suppressions or mechanically rewrite effects.
- Preserve existing backup artifacts. Do not reset or migrate the database, alter Docker volumes, or modify B/C as part of this checkpoint.

### Next execution target
Complete the canonical A acceptance matrix against PMD/Bible expectations, record evidence and unresolved gaps in existing governance records, then request explicit acceptance before copying the verified A baseline into B and C.

## 2026-10-13 — AI Conversation Response Integration and Regression Gate

### Scope
Canonical project A only: `/home/jj/Dev/KrishiKendram`. No changes to B or C. No database writes or migrations, Docker changes, Git commits, or remote operations were performed.

### Implemented
- Added an authenticated text-generation status endpoint to the AI conversation controller.
- Added an authenticated conversation response endpoint.
- The response controller verifies that the JWT user owns the conversation before passing content to the generation service.
- Assistant responses are appended to conversation history with provider/model provenance and validation/confirmation requirements.
- Added frontend API methods for provider status and governed responses.
- Connected ordinary Voice Agent questions to the response path; local navigation/help shortcuts remain separate.
- The frontend explicitly explains when a production-ready provider is unavailable rather than fabricating an answer.

### Verification evidence
- Focused controller and text-generation tests: 2 suites, 12 tests passed.
- Full backend regression: 48 suites, 442 tests passed.
- Backend production build: passed.
- Frontend TypeScript/Vite production build: passed.
- Frontend ESLint: 0 errors, 83 warnings.
- `git diff --check`: passed.
- Regression report: `/tmp/kk-a-ai-voice-regression-20261012-235908.txt`.
- Implementation backup: `.cto-backup/ai-voice-response-20261012-235258/`.

### Acceptance limits and outstanding work
- The configured text-generation provider remains disabled/not production-ready. A successful build or mocked unit test does not establish that live AI answers work.
- Authenticated runtime/API and browser end-to-end verification remain outstanding.
- Review internal `ConversationService` methods that operate on a conversation without an actor parameter (`createSession`, `appendMessage`, `addContext`, `addReference`, and related paths). Before exposing any such operation through additional routes or callers, enforce ownership/authorization at the service boundary as appropriate and add cross-user negative tests. The response route currently performs its owner check at the controller boundary before generation.
- Validate that the provider status response shape and disabled-provider UX match the live runtime.
- Frontend lint warnings remain technical debt. Do not suppress warnings wholesale or claim lint-clean status.

### Safety invariants
Authorization must precede AI context/generation; no direct AI database writes; no cloud fallback unless explicitly governed and approved; generated facts/actions require validation and user confirmation; provenance and audit requirements remain in force.

### Acceptance status
Integration code and regression gates: PASS. Live provider readiness and authenticated end-to-end acceptance: NOT YET VERIFIED. AI module completion: NOT CLAIMED.

## 2026-10-13 — AI Conversation Ownership Hardening and Full Regression

### Implemented
- Enforced authenticated-user ownership at the AI conversation service boundary for conversation access, sessions, messages, context, references, fact candidates, and history.
- Kept controller-level ownership checks as defense in depth before response generation and user-message writes.
- Added/updated negative ownership tests, including cross-owner write rejection.
- AI-generated responses remain subject to the centralized text-generation policy; this change does not enable a disabled provider or permit direct AI database writes.

### Verification evidence
- Focused AI conversation controller/service tests: 2 suites, 21 tests passed.
- Full backend regression: 48 suites, 445 tests passed.
- Backend production build: passed.
- Frontend lint: exit code 0, 0 errors, 83 warnings.
- Frontend production build: passed.
- `git diff --check`: passed.

### Boundaries and remaining acceptance work
- This was a code/test/build verification gate, not an authenticated browser end-to-end acceptance test.
- Text generation remains unavailable while the configured provider is disabled/not installed; no cloud fallback is implied.
- Frontend lint warnings remain tracked cleanup, including the VoiceAgent effect warning and warnings in other pages.
- No database migrations, database writes/resets, Docker operations, commits, pushes, or B/C changes were part of this gate.
- Canonical A remains the only active repair target. B and C remain untouched until A is accepted.


## 2026-10-13 — Governed AI Conversation Context Integration

### Implemented and verified
- Connected `AiConversationController.respond` to the canonical `UserAiContextService` after conversation ownership verification.
- `ConversationService.getConversation` now filters by `id` and authenticated `userId` in the initial query before loading messages, contexts, references, candidates, or actions. A non-owner lookup fetches only `id`/`userId` metadata to preserve not-found vs forbidden behavior.
- Kept the shared context-envelope type in `backend/src/ai/contracts/ai-context.ts`; the context service rejects authorization-namespace overrides not mapped to the canonical conversation module/resource.
- Context assembly occurs only when the canonical provider inventory reports a ready provider. If the provider is unavailable, the request follows the existing service-unavailable path without assembling private context.
- The context envelope contains only minimal conversation metadata and the most recent 20 messages (role, content, language, timestamp), projected through the `KK-AI-CONVERSATION-001` module contract. Credentials, tokens, unrestricted user records, candidate facts, and unrelated domain records are not included.
- Extended the text-generation request contract to carry the already-authorized context envelope; the provider remains responsible for using that contract without bypassing registry readiness.
- Added the platform `conversation` resource with READ/OWN scope only. The additive permission seed reconciles that permission to existing user roles; it introduces no GLOBAL conversation-read permission. Context field allowlisting remains owned by the canonical AI module contract.
- Preserved the fail-closed resource and field authorization contract and added positive/negative regression coverage for context authorization, provider-unavailable behavior, and provider request propagation.

### Recovery and verification evidence
- Pre-change source checkpoint: `.cto-backup/ai-context-integration-20261013-101607/` (contains pre-existing uncommitted changes as they stood before this batch, plus a tracked-worktree patch and status/HEAD records).
- Verified database dump before the additive permission update: `/home/jj/Dev/cto-recovery-snapshots/pre-ai-context-permission-20261013-102818/krishikendram-pre-ai-context-permission.dump`; `pg_restore --list` succeeded inside the PostgreSQL container. SHA-256 is recorded in the same directory.
- Permission-change manifest and targeted rollback: `/home/jj/Dev/cto-recovery-snapshots/pre-ai-context-permission-20261013-102818/permission-change-manifest.json` and `rollback-conversation-permission.cjs`. The source rollback script is `rollback-source.sh` in that directory. God Mode credential artifacts were copied to the protected `god-mode-artifacts-before-backend-restart/` subdirectory before the backend restart; their contents were not printed.
- Focused AI regression: 4 suites / 38 tests passed.
- Full backend regression after query-level ownership filtering: 48 suites / 452 tests passed.
- Backend production build: PASS. Frontend TypeScript/Vite production build: PASS (2,325 modules transformed). `git diff --check`: PASS.
- Runtime smoke after backend-only restart: API health HTTP 200; frontend HTTP 200; unauthenticated AI status request HTTP 401 as expected.

### Acceptance boundary
- The text-generation provider remains disabled/not production-ready. No real-model answer or authenticated successful generation was claimed or tested. Provider readiness, credentials, language quality, and full browser end-to-end acceptance remain separate gates.
- The conversation permission was added additively; no Prisma migration, database reset, Docker volume operation, Git commit, push, or B/C repository change was performed.
- AI module completion remains PARTIAL until a real approved provider and authenticated end-to-end context-to-response workflow pass their acceptance tests.

## 2026-10-13 — PMD merge: conversational, multilingual, role-governed Agri-OS

### Decision
Merge the no-learning-curve, voice-first requirement into the canonical plan. Users should describe tasks conversationally in supported Indian languages over multiple turns. KrishiKendram asks for missing details, builds validated drafts across registered modules, and completes work through normal authorized APIs after read-back and explicit confirmation. This enhances, not replaces, centralized registry ownership, field policy, authorization-before-context, provenance/audit and no-direct-AI-database-write rules.

### Architecture
- Shared Voice Agent is the conversational entry point; module contracts remain in central ai/modules files linked from the root AI registry.
- Pipeline: opt-in voice/text -> ASR transcript and language metadata -> intent resolution against active screen and server-authorized capabilities -> multi-turn draft/fact extraction -> central field validation -> visible draft and conflict clarification -> exact preview/read-back -> explicit confirmation -> authenticated module API -> audit/provenance/result/rollback reference.
- Preserve original transcript. Normalization, translation, extraction and inference retain provenance/confidence; never silently replace wording or invent uncertain required values.
- Never silently overwrite saved values. No model SQL, direct Prisma writes, arbitrary code, shell, unrestricted URL access or model-controlled policy changes.
- Role/resource/field policy is enforced server-side. Voice, accent, phrase match or speaker identity is not authorization. High-risk God Mode actions retain normal approvals.
- Report success/failure and remaining work. Raw conversation training remains disabled by default.

### Role alignment finding
Current VoiceAgent supports basic navigation/help, browser speech APIs where available, typed fallback and authenticated conversation storage. Its frontend SUPER_ADMIN branch and hard-coded FARM/ADMIN phrase arrays are only Phase 1 navigation helpers, not a final capability policy. Replace them with a backend-authorized capability manifest and stable registered intent IDs; execute module actions only through allowlisted server handlers.

### Open-source/free supporting inventory
Created ai/supporting-components.json and linked it from ai/registry/ai-platform-registry.json. It records candidates and exact license/integrity gates. Candidates: Ollama plus a small quantized local LLM; whisper.cpp CPU ASR baseline; AI4Bharat IndicConformerASR comparison; AI4Bharat Indic-TTS for Indic speech; IndicTrans2 as optional local translation; browser Web Speech API as capability-dependent fallback. IndicF5 and FFmpeg are deferred pending need/resource/license review. No paid/credit-metered service or implicit cloud fallback is approved.

Host snapshot: Intel i3-5005U, 2 cores/4 threads, about 12 GiB RAM, Intel HD Graphics 5500, about 5.7 GiB WSL-visible memory and about 95.6 GiB free on D:. Prefer CPU-first small components; defer heavyweight NeMo/PyTorch installs until measured need and capacity justify them.

Planned evaluation suites were added for consent/capability, Indic ASR, Indic TTS, local LLM conversation and conversational form completion. They are plans, not completed results. Acceptance requires exact artifact licenses/integrity, latency/RAM measurements, Telugu-first native-speaker benchmarks, multi-turn module form completion, role/ownership denials, prompt-injection resistance, exact-preview confirmation, audit and rollback. Installation/build success alone is not readiness.

### Recovery boundary
This checkpoint changes docs and central JSON inventory only. No runtime/model was installed or downloaded, no database or Docker operation was performed, no data/model directory was deleted, and no commit/push was made. The incomplete unverified Ollama installer from the preceding attempt was removed. Provider remains disabled and ASR remains placeholder pending separately tested implementation and approval.


## 2026-10-13 Cohesion Gate — Central Voice Intent and Cloud Approval

- `ai/registry/ai-platform-registry.json` remains the only AI entrypoint. Voice navigation is defined in `ai/voice/voice-intents.json` and loaded/validated by `AiRegistryService`; the frontend must not maintain a parallel route/phrase policy.
- The authenticated `GET /api/v1/ai/conversations/voice-intents` endpoint filters the central manifest using persisted active-account identity. General intents are discoverable to authenticated users; privileged administrative intents are returned only for the canonical `SYSTEM_GOD` identity (`GodModeService.GOD_EMAIL` + `SUPER_ADMIN` + active status). Voice, phrasing, browser recognition, and client-supplied role never grant authority.
- Intent discovery is navigation only. Every route, resource API, field, write, and God Mode operation must independently enforce server-side authorization. Unknown, restricted, or unregistered intents must not trigger guessed actions.
- `ai/connections/cloud-connection-policy.json` is the central cloud-connection slot linked from the AI root registry and visible through the God Mode AI control-plane inventory. It is intentionally disabled and validation rejects enabling it while the production cloud adapter and approval workflow are absent. No credentials belong in this JSON or in source control; cloud fallback remains disabled.
- Before cloud execution can be activated, implement a registered provider adapter, external secret-store reference, super-admin proposal, canonical God Mode approval, per-disclosure user consent, license/model/dataset review, bounded health and capability evaluation, audit, and rollback. A registry entry is not proof of runtime availability.
- Acceptance gates: backend capability-manifest tests; role/God boundary tests; root-registry link and startup validation; frontend and backend production builds; API smoke test; no AI record mutation without module authorization, central validation, preview, explicit user confirmation, and audit/provenance.


## Conversation-to-module fact-draft pipeline (2026-10-13)

- Central conversations remain owned by `KK-AI-CONVERSATION-001`; a fact candidate may target a different registered module only when that module's canonical AI contract allows extraction and the target entity is listed in `candidateFactTargets`.
- `POST /api/v1/ai/conversations/:conversationId/fact-candidates` creates a draft proposal only. `GET /api/v1/ai/conversations/:conversationId/fact-candidates` lists proposals for the authenticated owner. Both routes remain under the JWT-protected conversation controller.
- Each proposal must cite an existing user-authored message from the same owned conversation. The service does not claim a model performed extraction; provenance explicitly records `providerId=conversation-draft-service`, `modelId/modelVersion=not-applicable`, `mode=DISABLED`, `source=USER_AUTHORED_EVIDENCE`, and `extractionModelUsed=false`.
- Entity eligibility comes from the central AI module contract. Field identity, normalization, and validation come from the existing platform `RegistryService` resource/field definitions and validation policy. The canonical `AuthorizationService.authorizeFields` path must approve resource CREATE (or UPDATE for the authenticated user's own profile) and field WRITE policy before a draft is saved.
- Proposals are created in `VALIDATION_PENDING`, carry `validationResult`, and always require explicit user confirmation. Invalid values remain visible as flagged proposals for correction; they are never applied. Existing-record targeting is rejected except for the authenticated user's own registered User profile fields, which require UPDATE authorization. Other existing-record changes need their dedicated authorized workflow.
- No database schema migration, direct AI domain write, model installation, cloud activation, or credential change is part of this increment. The remaining work is an explicit candidate review/confirmation state machine, audited apply through normal module APIs, and frontend draft-preview integration.


### Cross-registry target alignment (2026-10-13)
The AI module contracts now advertise only fact target model names present in `RESOURCE_DEFINITIONS`: User, Farm/FarmAsset/FarmRecord, Crop, Livestock, and MarketplaceListing. The internal AI conversation module has no farmer-fact targets. Module contracts were versioned to v2, and `ai-module-resource-cohesion.spec.ts` guards against future drift between the central AI registry and platform resource registry. Missing resource/field definitions fail closed rather than being guessed.


### Fact-draft review and explicit confirmation (2026-10-13)
- Draft list responses include a server-computed SHA-256 preview hash binding the candidate identity, module/entity/field target, proposed and previous values, confidence, evidence reference, provenance and validation result. Confirm/reject requests must return this hash; stale or tampered previews are rejected.
- Confirmation re-checks the current AI module contract, registered platform resource/field, user-authored evidence, resource-level CREATE/UPDATE permission and field WRITE policy. A compare-and-set status transition and audit event are committed in one Prisma transaction.
- Rejection uses the same preview binding and atomic status-plus-audit transition. Confirmation records `CONFIRMED` only; `applied=false` remains explicit because normal module API application is not implemented by this endpoint.
- The Voice Agent now has a saved-draft review panel that shows the target, proposed value, original user evidence, validation errors, and confirm/reject controls. It does not fabricate candidates when the approved extraction provider is unavailable.

Fact-draft creation is also atomic with `AI_FACT_DRAFT_CREATED` audit logging. If the audit service is unavailable, the transaction fails and no candidate is saved. Confirmation and rejection each commit their status transition with the corresponding audit event in one transaction.


## Lifecycle shutdown hardening — 2026-10-13

- `backend/scripts/kk-shutdown.sh` now retries Docker Engine preflight up to six times before failing closed, and records the final probe diagnostic. A transient Engine probe failure must not be mistaken for a database failure.
- Graceful Docker Desktop shutdown uses the installed `D:\KrishiKendram\06-Docker\DockerDesktop\DockerCli.exe -Shutdown` command and verifies that Docker Desktop processes exit before requesting WSL shutdown. Do not force-kill Docker backend processes.
- Verified checkpoint: `/mnt/d/KrishiKendram/08-Recovery-Backup/KK-Safe-Shutdown/KK-checkpoint-20261013-235139`.
- Checkpoint includes A/B/C Git snapshots and bundles, manifest, checksums, and a 172,771-byte PostgreSQL custom-format dump. The dump begins with `PGDMP`; all 36 files listed in `SHA256SUMS` matched when independently checked from Windows PowerShell.
- Backend/frontend systemd units were stopped, PostgreSQL was stopped gracefully, and Docker volumes were retained. No Git stage, commit, push, reset, prune, or promotion was performed. The operational script edit remains uncommitted and must follow the normal C → B → A promotion process later.

## 2026-10-14 - Application-visible local AI and crop context path

- Root cause confirmed in the canonical running application: the AI module was bound to UnavailableTextGenerationProvider, while the Qwen local runtime integration existed only in the separate development workspace. The canonical application has now been wired to KK-AI-LLM-OLLAMA-LOCAL.
- Local inference is enabled only as an explicit development evaluation (KK_AI_ALLOW_LOCAL_EVALUATION=true). Provider inventory remains EVALUATION_IN_PROGRESS, productionReady=false, cloud fallback remains disabled, and direct AI database writes remain forbidden. This is not a production-readiness declaration.
- Local runtime smoke check succeeded against qwen3:1.7b (Q4_K_M, recorded digest 8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7); one synthetic English response completed in approximately 2.6 seconds. This does not establish Indic-language quality, factual accuracy, concurrency, or production safety.
- Added the canonical linked intent manifest ai/context/data-context-intents.json. The 'what are my crops' intent resolves to KK-CROP-001; the controller authorizes the AI conversation context first, then uses CropsService.findMyCrops for owner-scoped READ authorization and passes only a capped projection of crop name, variety, sowing date, harvest date, and farm ID. The model receives this authorized context as data, not as instructions.
- The VoiceAgent disclosure now identifies local evaluation mode, disabled cloud fallback, advisory answers, and the fact that generated answers cannot directly write records.
- Acceptance still required: authenticated browser test using a farmer with known crop rows; verify exact returned crop names match that farmer's active records and that another user's crops never appear; verify empty-list behavior; test Hindi/Telugu and remaining registered language phrases; then run full backend regression and frontend build. Do not promote this provider to production-ready without the approved evaluation gates.

## 2026-10-14 — Super AI implementation: task-aware multi-model foundation

- Decision: build one centralized, governed AI gateway with interchangeable task-aware adapters, deterministic-first execution, authorized context projection and module-owned persistence.
- Implemented: task contracts (CONVERSATION, STRUCTURED_EXTRACTION, ADVANCED_REASONING), provider-pool injection, canonical-inventory authorization before routing priority, deterministic task classifier, and VoiceAgent turn-epoch invalidation for stale responses.
- Safety: unregistered providers cannot be selected; this path only admits approved local providers; cloud fallback remains disabled; provider priority never grants permissions; model output cannot write directly to the database.
- Verification evidence after voice-intake/shared-vocabulary changes: AI + intake gate passed 15 suites / 140 tests; backend and frontend production builds both passed on 2026-10-14.
- Explicit limitation: routing foundation does not prove multiple production-approved models are installed or live. Existing local Ollama is evaluation-only in the registry; a short runtime probe timed out. Do not represent the platform as production-ready multi-model AI yet.
- Implemented vertical slice: voice-driven planting requests collect the crop, resolve an authorized farm, preview area and defaulted fields, support corrections/cancellation, and require an explicit spoken confirmation before calling the authorized intake service. The backend returns the created crop ID from the same transaction as the farm history record. Remaining acceptance: authenticated browser verification for one/multiple farms and checking actual persisted crop/history rows.


## 2026-10-14 — Central crop vocabulary and confirmed voice intake

- One canonical vocabulary is maintained at backend/src/ai/registry/crop-terminology.ts and referenced by ai/registry/ai-platform-registry.json. The authenticated voice-intent manifest delivers this same vocabulary to the frontend; no duplicate crop catalogue is maintained in VoiceAgent.
- Supported initial voice flow: detect an explicit planting request, capture a recognized crop and spoken area (number words one through ten), resolve the user's accessible farm, preview the draft and default values, accept crop/area/farm corrections, then save only after explicit confirmation.
- Writes use the existing authorized AI Intake -> CropsService/FarmsService transaction. The service returns a compact createdCrop {id,name} confirmation only when the crop record was actually created. No direct AI database write was added.
- Safety: cancel before confirmation creates no record; a failed/ambiguous response does not auto-retry a mutation, to avoid duplicates; draft state is cleared on account/token changes; pressing Speak is blocked while a confirmed write is processing.
- Verification: AI + intake tests passed 15 suites / 140 tests; backend build and frontend TypeScript/Vite production build passed. Browser end-to-end and database-result verification remain outstanding.

## 2026-10-14 — AI/web toolchain decisions

See docs/AI-TOOLCHAIN-ADOPTION-REVIEW.md for the full candidate matrix and security boundaries. Adopt Playwright + axe-core for development-only browser tests; OpenChamber is the preferred optional multi-model coding workspace, with OpenHands as an alternative. Hermes Agent and OpenMuse are reference patterns for controlled learning and visible long-running work, not trusted policy authorities. OpenCharm is deferred unless a dedicated agent companion becomes a product requirement. DeepCode AI is an optional security integration pending data/privacy/license review. Local model evaluation must not compete with an active farmer workload; no candidate is promoted automatically.

## 2026-10-16 — Voice-first companion and cross-module execution reconciliation

- **Completion truth:** the foundation and operational modules are **not all complete**. The existing Remaining closure plan above remains active. Module gates stay PARTIAL until the authenticated workflow, authorization, lifecycle/history, frontend behavior and runtime acceptance are evidenced together.
- **Voice companion changes in the canonical main worktree:** opening Voice Agent starts listening when browser permission allows; listening resumes between Krishi replies until the farmer presses Stop. The session pauses during spoken replies to avoid recording Krishi's own speech. Browser recognition still depends on browser/device support; production offline Indic ASR/TTS is not complete.
- **Guided planting intake:** the same draft now asks for missing area and sowing date one question at a time; it merges volunteered details from a farm-selection answer instead of discarding them. It accepts common speech-recognition variants `acer/acers`, extracts an explicit crop age such as five weeks ago, and keeps NPK within planting intent rather than reclassifying the whole request as an expense. An explicitly unknown sowing date is preserved as unknown instead of being replaced with today. The draft remains uncommitted until the normal authorized confirmation workflow.
- **Independent livestock module fix:** `LivestockService.findMine()` previously listed only livestock on farms whose `farm.ownerId` matched the user, omitting livestock whose active temporal OWNER relationship had transferred independently of the farm. The list now includes IDs from active OWNER relationships as well as farm-owned livestock, while retaining the existing authorization check.
- **Verification evidence:** backend regression **56 suites / 529 tests PASS**; focused intake + livestock gate **3 suites / 28 tests PASS**; backend production build PASS; frontend production build PASS; targeted VoiceAgent/E2E lint PASS with **0 errors and 4 existing effect-related warnings**; `git diff --check` passed before the final ref-effect cleanup and must be repeated before commit. VoiceAgent E2E cases have passing evidence across broad and focused runs, including missing-field dialogue, correction/cancel, multiple farms, auto-listening, accessibility and no-duplicate-save behavior. A broad two-worker rerun hit browser timeouts under CPU contention, so do not represent that particular run as a clean full-suite pass; the previously failing cases were rerun successfully in isolation.
- **Runtime:** backend service was restarted to load the compiled changes; `/api/v1/health` returned HTTP 200 afterward and frontend port 4000 returned HTTP 200. No database reset, schema migration, Docker volume deletion or model promotion was performed.

### Outstanding module and foundation gates — current reconciliation

- **Auth / Users / Admin / Roles / Permissions / God Mode:** authorization, registry, permission and God Mode recovery foundations exist; authenticated end-to-end runtime acceptance across admin controls and all role boundaries remains open.
- **Farms / FarmAsset / FarmRecord:** custody, lease, transfer, split/merge, lineage and audit foundations exist; the complete farmer-facing create/edit/archive/restore and history/evidence flows still need module-level acceptance and UX coverage.
- **Crops / Intake:** canonical crop services and authorized intake exist; the new voice-guided dialogue is improved, but authenticated database-backed verification of the saved crop's exact area/date and corresponding farm-history record remains due.
- **Livestock:** CRUD, archive/restore, temporal relationships and audit exist; current-owner listing was corrected in this checkpoint, but the complete module acceptance gate remains PARTIAL.
- **Marketplace:** listing create/update/publish/archive and registry validation exist; linked-resource lifecycle coherence and end-to-end seller/buyer acceptance remain due.
- **Lifecycle / History / Evidence / Provenance:** service foundations exist, but cross-module UI and authenticated end-to-end acceptance remain due.
- **AI companion:** multi-field draft creation/application across Farm, Crop, Livestock and Marketplace is not complete end-to-end; only the registered module-owned application paths may apply. Local model/provider remains EVALUATION_IN_PROGRESS, `productionReady=false`, with cloud fallback disabled. The God Mode-approved candidate benchmark is still pending an explicitly authorized maintenance window. IndicConformer/production Indic ASR and live weather are not connected.
- **Frontend / production release:** the systematic loading, empty, error, refresh, mobile, reduced-motion and accessibility sweep across every operational screen remains open. Final release acceptance still needs migrations, backups/recovery, production secrets/CORS, restart behavior and authenticated runtime smoke evidence.

### Parallel execution from this checkpoint

1. Close the voice/crop intake vertical slice with an authenticated database-backed crop + farm-history assertion.
2. Continue the Farms / FarmAsset / FarmRecord acceptance work independently of AI development.
3. Continue Livestock and Marketplace ownership/listing lifecycle consistency and module acceptance.
4. Close Auth / Users / Admin / Permissions / God Mode runtime acceptance and the cross-screen UX sweep.
5. Only then extend governed multi-field AI application through each module's own authorized service/API; keep provider benchmark, Indic ASR/TTS and weather as separate gated tasks.

For each workstream, require service tests, build, authorization/audit checks and a frontend/runtime acceptance result. Do not mark a module COMPLETE because its backend service or route exists. Preserve `.cto-backup/` and the existing untracked handoff/status notes; stage only reviewed source, tests and this tracked execution record.


## 2026-10-16 — Bilingual AI Intake enforcement and module regression

- The frontend contract carries originalContent, originalLanguage, englishTranslation and translationConfirmed; English text is used as its own English representation.
- Backend CreateIntakeDto validates the optional bilingual fields. IntakeService enforces non-English confirmation server-side before calling the extractor and records the bilingual pair, status, input method and timestamp in the existing FarmRecord JSON.
- This is a provenance/persistence increment, not automatic translation. The current UI explicitly requires manual review/entry of the English meaning for non-English transcripts; do not represent it as a completed translation model.
- Verification on 2026-10-16 22:27:40 IST: frontend production build PASS; focused Intake/Livestock/Marketplace tests 3 suites / 32 tests PASS; /api/v1/health HTTP 200; git diff --check PASS. Backend build has no reported errors and is being separately rechecked.
- Remaining closure gates: integrate a replaceable, locally deployable translation provider under the central AI registry; confidence/deviation detection must ask a focused question and block material writes until resolved; run authenticated browser tests and assert actual Crop and FarmRecord rows; finish seller/buyer Marketplace lifecycle and Livestock CRUD/history acceptance before marking either module COMPLETE.


## 2026-10-16 — Livestock archive recovery and Marketplace resource selection

- Livestock UI now supports editing, ownership-history inspection and restore of archived livestock. GET /livestock/archived resolves the latest OWNER relationship including its ended record, so archive/restore does not require hard deletion or discarding provenance.
- Marketplace create-listing UX now derives resource choices from the farmer's owned crop/livestock records and assets attached to their accessible farms; archived assets are excluded. The backend remains authoritative for ownership and registry validation.
- Final focused verification: Intake/Livestock/Marketplace 3 suites / 33 tests PASS; backend build PASS; frontend TypeScript/Vite production build PASS; API health HTTP 200; frontend HTTP 200; git diff --check PASS.
- Remaining: authenticated browser acceptance for archive/restore, ownership history, and seller listing lifecycle; buyer inquiry/transaction workflows are not implemented by these UI changes. Keep module acceptance PARTIAL until all module gates pass.


## 2026-10-17 — Ollama native-store and live-provider verification

The managed local Ollama runtime is version 0.40.3 and is reachable at 127.0.0.1:11434 with cloud disabled. The runtime launcher now defaults to the native WSL model store at /home/jj/.local/share/krishikendram/ollama-models, while preserving the KK_AI_OLLAMA_MODELS_DIR override. The original D: model store remains intact as a recovery copy. The copied store contains all three installed Qwen models, and all three model manifests match the source SHA-256 hashes.

Live provider smoke test passed through OllamaTextGenerationProvider using qwen3:1.7b and its recorded digest. A warm synthetic request returned OK in 1.83 seconds, with 0.011 seconds model load, 1.647 seconds prompt evaluation, and 0.133 seconds generation. A separate cold load still took about 45.93 seconds; cold-start latency remains open. The response remains a proposal requiring canonical validation and user confirmation.

The current active model remains qwen3:1.7b. Qwen3.5 0.8B remains selected for evaluation and Qwen3.5 2B remains a linked installed candidate; neither is production-approved. The read-only preflight found eight benchmark cases and no blockers, but the full benchmark was not run because it intentionally unloads/reloads the model and is gated to a maintenance window. No cloud fallback, production promotion, database mutation, or Docker volume change occurred.

Verification: Ollama model inventory returned all three models; API health at /api/v1/health and UI health at port 4000 returned HTTP 200; focused provider/registry/text-generation tests passed 3 suites and 21 tests; shell syntax and git diff checks passed. Mocked Voice Agent E2E passed 12 of 12 tests; authenticated live-browser acceptance, multilingual translation/confidence handling, and candidate benchmark remain outstanding.


## 2026-10-17 - Local Intake translation implementation (2026-10-17T17:37:28+05:30)
- Added authenticated local Intake translation via the governed TextGenerationService; no cloud fallback and no direct database write.
- Output confidence is explicitly uncalibrated. A 0.85 review threshold, visible-number check, multilingual acre/hectare check, and planting-action preservation check flag likely material drift; detected drift caps confidence at 0.5. Explicit user review and confirmation remain mandatory.
- Focused tests pass: 3 suites / 19 tests; backend and frontend builds pass; mocked translation UI E2E passes 1/1. Route is registered; unauthenticated POST returns 401. Authenticated live-backend browser acceptance remains open.
- Live Telugu smoke demonstrated remaining model-quality limitations: it returned 'I have 2 acres of rice' and omitted the planting action. The action guard caught it. A warm request took about 15 seconds; a later request under startup/model contention took about 87 seconds.
- Model remains evaluation-only. Do not promote based on this smoke. Multilingual quality benchmarks and authenticated browser acceptance remain open.


## 2026-10-17 - Cross-module regression sweep (2026-10-17T17:42:55+05:30)
- Cross-module regression sweep passed: 7 suites / 57 tests across Intake, Livestock, Marketplace, Ollama provider and AI model-link registry. Backend and frontend builds pass; mocked Intake translation UI E2E passes 1/1.
- Local translation still requires human review: a live Telugu smoke omitted the planting action, which the new guard caught. Model remains evaluation-only; language quality, cold latency and authenticated browser acceptance remain open.

## 2026-10-17 — Central Registry, Administration Parity and Inclusive Marketplace Requirements

### Non-negotiable architecture contract
- Every module field, validation rule, category/option set, required-field policy, and configurable workflow must originate from the central Registry or versioned central configuration files. DTO validation may reject malformed transport input early, but must not become a second source of business truth. All create/update/import/AI/image/voice/API paths must pass the same registry validation and authorization policies before persistence.
- Modules must be attachable, enableable, suspendable, upgradeable, and detachable through authorized configuration rather than hard-coded UI switches. Dependency checks, data-retention/export rules, compatibility checks, migration status, audit trail, and recovery/rollback gates are mandatory. Detach must not silently delete module data.
- God Mode is the ultimate governance surface. Super Admin must receive the operational approvals, module lifecycle/configuration, validation-policy, user/profile, marketplace moderation, upgrade and implementation controls needed to operate the platform, except explicitly platform-root-only destructive/security actions. Admin receives a configurable, auditable delegated subset. Capability enforcement is server-side; hiding a button is not authorization.
- Maintain parity by defining capabilities once and presenting role-scoped actions in Admin, Super Admin and God Mode. Every approval records requester, reviewer, decision, reason, timestamps, before/after state, and linked evidence where applicable. Self-approval and separation-of-duties conflicts must be blocked for sensitive actions.

### Inclusive user and seller profiles
- A marketplace seller must be a registered user. A listing may use a generic title/name and need not be linked to a pre-existing crop, livestock or farm asset. When a listing claims to represent a managed farm resource, retain the resource relationship and ownership/authorization checks.
- Expand user profiles for individuals, farmers, producer groups/FPOs, cooperatives, businesses, traders, service providers, buyers and other legitimate participant types. Support optional public display name, organization/business name, profile photo, biography, languages, location at appropriate granularity, contact preferences, seller/buyer roles, verification state and relevant credentials. Optional means optional; do not make digital literacy, email, or a formal business identity a prerequisite for a basic farmer listing. Private contact data must not be exposed by public listing APIs.

### Marketplace requirements
- Registry-controlled categories and field definitions; image-supported listings; optional links to the seller's crop/livestock/asset/farm history; explicit active/published state; owner profile preview; safe listing/order lifecycle; moderation/approval controls for authorized Admin+ roles; and complete audit/history.
- Public browse filters must support category, newest/today, yesterday, day before yesterday, week-wise, and currently active listings. Define date boundaries in the application timezone and return stable newest-first ordering. Avoid treating all time periods as separate hard-coded modules; expose a reusable period filter.
- Photos must be stored through an approved upload/storage path with content-type/size validation and safe access rules; do not persist temporary browser object URLs. Listing images are user-submitted content and must not bypass moderation or privacy policy.
- A seller may optionally expose crop/livestock lifecycle information when authorized. Only share the selected, approved, non-sensitive fields and evidence; do not reveal unrelated farm data, private contact details, or other users' records. Clearly distinguish seller-entered claims from verified records.

### Acceptance gates
1. Registry definitions drive field presence, validation, category options and server validation across all write paths.
2. Admin, Super Admin and God Mode capabilities are parity-reviewed against the central permission/capability matrix, with explicit root-only exceptions.
3. Module lifecycle changes are audited, dependency-aware, reversible where possible, and preserve historical data.
4. Marketplace supports generic user-owned listings and resource-linked listings, category/date/active filters, persisted images, privacy-safe seller profiles and explicit lifecycle sharing.
5. Unit, integration, authorization, migration, build and browser end-to-end tests pass before a requirement is called complete.

## Marketplace Commerce Platform Scope — 2026-10-17

KrishiKendram Marketplace is a multi-sided agriculture commerce workflow, not a simple classified-listing page. It must provide buyer and seller workspaces, listing lifecycle and sold history, per-unit and bulk pricing, offers and price agreement, rich media/social links, orders, fulfilment, payment-provider adapters, seller reputation and privacy-safe traceability.

### Core commerce capabilities
- Seller: create/edit/draft/publish/pause/archive listings; stock and availability; unit, pack and bulk prices; minimum order quantity; offers received; order processing; sold/completed history; sales summaries; repeat customers.
- Buyer: discover/search/filter, compare, save, enquire, request quotes, place quantity orders, make price offers, track order state, message sellers, review completed transactions, and report disputes.
- Negotiation: buyer offer and seller accepted/agreed price are separately persisted. Future counteroffer flow must be a state machine with actor permissions, expiry, immutable history and audit; never silently overwrite the original listing price.
- Rich content: multiple images, video URLs, external social/catalogue/Drive links. Outbound links use HTTPS validation and safe target attributes. Embed only official/publicly embeddable content. Do not bypass Drive permissions or scrape private content.
- Fulfilment: pickup/delivery, shipment tracking adapters, receipts, cancellation/returns/disputes, payment adapters and settlement reconciliation. Payment webhooks require signature verification and idempotency. Do not store payment credentials.
- Agriculture-native: batch/harvest availability, grade/variety/origin evidence, farm-service and equipment rental, RFQ/wholesale, FPO/co-op pooled supply, recurring orders and optional seller-consented crop/livestock lifecycle evidence.
- Inclusion: low-literacy voice/photo/video intake, automatic language detection, local/open-source provider adapters, draft translation, quantity/unit/grade extraction with confidence and explicit seller confirmation. AI must not publish, set prices, accept offers, transact, or expose private records without explicit confirmation.

### Architecture and technology review
- Existing NestJS/Prisma Registry remains the authoritative business model and validation layer. Do not create a second source of truth for crops, livestock, stock or orders.
- Evaluate reusable multi-vendor patterns from MercurJS/Medusa (https://github.com/mercurjs/mercur) for vendor workflows, offers, commissions and payouts; do not adopt a parallel commerce database without a compatibility and migration review.
- Evaluate OpenShip conversational commerce and MCP patterns (https://github.com/openshiporg/marketplace) as a future AI-assisted discovery interface; authenticated KrishiKendram APIs and authorization remain authoritative.
- Implement media through a storage adapter: S3-compatible object storage for durable deployments, local storage for development, generated object keys and metadata in PostgreSQL. Add file-size/type limits and a content-scanning policy before upload is considered production-ready.
- Keep social/video/Drive integrations adapter-based. Public links are supported first; API/OAuth integrations require explicit user consent and provider-specific permission scopes.
- Price suggestions must include source, market/region, timestamp, unit normalization and uncertainty; they are advisory, not automatic price writes.

## 2026-10-17 — Marketplace financial, trust and governance requirements
See `docs/MARKETPLACE-COMMERCE-GOVERNANCE-ROADMAP.md` for the detailed scope and release gates. Marketplace transactions must disclose buyer fees, seller commission, applicable tax lines, delivery/payment costs, gross/net settlement and rounding before confirmation; retain immutable versioned snapshots and use decimal-safe ledger amounts. Tax policy must be jurisdiction/product-aware and reviewed by qualified advisers; do not hardcode legal rates. Add payment adapter security, idempotency, refunds, disputes and reconciliation before live deductions. Add buyer and seller purchase/sales history, mutual verified-transaction reviews/comments, caution indicators, evidence-backed scoped restrictions, appeals and audited blacklist/reinstatement. Admin, Super Admin and God Mode need one Registry-backed feature catalogue with server-enforced capabilities, dependencies, rollout, audit and rollback. Disabling a feature must preserve history and refunds. Technology options must be continually evaluated against cost, license, security, self-hosting, data residency, farmer usability and migration risk.


# Marketplace Commerce, Trust, Payment and Feature-Governance Execution Contract

Updated: 2026-10-17 23:51:39 IST

## Marketplace Commerce, Trust, Financial Controls and Feature Governance — 2026-10-18

Updated: 2026-10-17 23:51:39 IST

## Product objective

Marketplace is a governed agricultural commerce workflow, not merely a listings page. It supports discovery, offers, transparent deal terms, fulfilment, transaction history, reviews, disputes, trust decisions and eventual payment/settlement. Each capability is independently feature-controlled without erasing historical records.

## 1. Listing-to-deal flow

Seller creates a generic or resource-linked listing; Registry validates fields; ownership, authorization and restrictions are checked; seller publishes; buyer browses and requests a quote; quote snapshots quantity, unit price, buyer fee, seller commission, tax status, buyer total, estimated seller net, currency and policy version; buyer submits order; seller accepts/rejects/proposes another price; changed price requires buyer confirmation; parties fulfil; completion updates tracked stock atomically; both parties can submit a verified review; history is retained.

## 2. Fee and tax policy

Buyer platform fee and seller commission are separate, configurable, versioned basis-point policies. Show subtotal, buyer fee, tax, configured shipping/payment costs, discounts, buyer payable total, seller gross, commission, seller net estimate, currency, rounding and quote time/expiry. Never invent statutory rates. Tax must eventually be jurisdiction/product/category/seller-type aware with effective dates, exemptions, invoice/credit-note references and qualified review. Until reviewed configuration exists, mark REVIEW_REQUIRED and keep the quote provisional; collect no money.

## 3. Payment, ledger and settlement

After provider selection, create payment intent against an immutable order quote; verify signed webhooks; use idempotency and replay protection; post balanced immutable ledger entries; track authorization/capture/failure/refund/partial refund/chargeback/payout; reconcile provider statements; calculate settlement after disclosed fees/tax/adjustments; support payout holds and disputes. Never store raw payment credentials or claim money moved without provider and ledger evidence.

## 4. Buyer and seller histories

Buyer view: orders, status timeline, seller, quantity, saved quote, offer/counter-offer, completion, invoices/receipts when available, refunds/disputes and review. Seller view: purchases and sales separately, listing, buyer under privacy rules, gross, commission, tax, net estimate, payment state, refunds, settlement/payout references and export. Historical quote snapshots are immutable; net is only an estimate until payment and reconciliation are live.

## 5. Reports, evidence and dispute workflow

Buyer or seller can report listing/transaction using controlled categories (fraud, misrepresentation, non-delivery, quality, harassment, payment dispute, safety, other), description and bounded evidence links. Transaction reports require participation; derive the counterparty server-side. Flow: OPEN → UNDER_REVIEW → RESOLVED or DISMISSED. Preserve reporter, target, case, evidence references, reviewer, timestamps, rationale and audit. Private evidence never appears on public profiles. Appeals are linked cases and should be independently reviewed where feasible.

## 6. Caution ratings and scoped restrictions

Caution is an evidence-backed risk signal, not a public accusation or automatic guilt. Separate scopes: CAUTION, LISTING_CREATE, ORDER_CREATE, MARKETPLACE_ALL. Every restriction needs reason, case/evidence, actor, start, optional expiry, status and appeal path. Expired restrictions cease to block actions; revocation is audited. Restrict only necessary Marketplace capabilities, preserve history and appeals, and never erase records. AI may flag patterns but cannot autonomously blacklist or permanently ban.

## 7. Verified reviews and comments

Only a participant in a completed order can review the counterparty, once per order. Reviews start PENDING; only PUBLISHED reviews are public. Preserve moderation history. Seller response is bounded and auditable and cannot rewrite the review. Provide abuse/report/appeal paths and show rating context/sample size.

## 8. Admin, Super Admin and God Mode

Admin handles assigned queues and routine cases within delegated permissions. Super Admin controls approved policy, escalations, scoped restrictions, moderation and feature configuration. God Mode has ultimate override and includes every operational approval available to Super Admin. Decisions require server authorization, actor, reason, before/after audit, effective time and safe reversibility. Do not infer God Mode from UI labels.

## 9. Feature switchboard and dependencies

Registry-backed feature catalogue: stable ID, owner, description, default/enabled state, role scope, dependencies, risk, rollout, version, last actor/time, approval and rollback plan. Features include listings, offers, buyer fees, seller commission, tax display, payments, refunds, settlement, reviews, comments, evidence, caution, reports, restrictions, appeals, history export, verification, media links, bulk pricing, delivery, RFQ and AI. Turning a feature off must not erase orders, evidence, invoices, ledger, audit or appeal rights. Drain in-flight payment/refund flows before disabling dependencies.

## 10. Continuous technology evaluation

Review open-source commerce engines, payment/tax adapters, object storage, identity/verification, fraud, agricultural market feeds, messaging, logistics, accessibility and low-bandwidth/offline support. Score licence, self-hosting, cost, data residency, Indian farmer usability, language support, API maturity, lock-in, maintenance, security, observability, recovery and exit strategy. Prototype behind adapters/feature flags; test failure/security; document decision, owner and date. No provider is trusted solely on an AI recommendation.

## 11. Acceptance and safety gates

No live deduction without reviewed fee/tax policy, explicit disclosure/consent, provider integration, signed webhook verification, idempotent ledger, refund/reconciliation tests, incident playbook and legal/accounting review. No permanent blacklist without documented evidence, authorized decision, notice and appeal. Protect private evidence. Test role boundaries, counterparty verification, expiry, concurrent stock, policy versions, webhook replay, partial refunds, appeals, feature dependencies and audit completeness.

## 12. Current implementation boundary

Implemented: versioned fee/commission policy, provisional quote breakdown, immutable quote snapshot, buyer confirmation of seller-changed price, transaction-verified reviews and moderation, trust-case/restriction persistence and endpoints, restriction checks on listing creation/publication and order creation, and buyer/seller history summary API. UI for trust queues/appeals, independent appeal review, feature switchboard integration, Registry resource definitions, media upload, provider payment, ledger, refunds and payouts remain follow-on work; never describe a planned adapter as live.

## End-to-end execution flow

1) Configure/review policy → 2) seller drafts/publishes after Registry, authorization and trust checks → 3) buyer requests versioned quote → 4) buyer places order → 5) seller accepts/rejects/proposes price → 6) buyer confirms changed price → 7) parties fulfil → 8) completion updates stock/order → 9) approved payment adapter captures/reconciles money → 10) histories/settlement show verified facts → 11) parties review/report → 12) authorized moderator investigates and records scoped expiring decision → 13) affected party appeals → 14) audit and metrics feed continuous evaluation.


## Marketplace implementation checkpoint — 2026-10-18 00:09:58 IST

### Implemented in code

H2

### Commerce quote and policy

Buyer fee and seller commission are independent feature-gated quote lines. Quotes use integer minor-unit rounding, versioned policy snapshots, tax review state, buyer total and seller net estimate. A seller-proposed price change requires explicit buyer confirmation before ACCEPTED.

### Trust reports and appeal

Authenticated case intake supports controlled categories, bounded evidence URLs, listing/order association, server-derived transaction counterparty, case status and audit. Appeals are linked to a decided parent case; target users can see a redacted decided-case entry and appeal without exposing the reporter evidence. Appeal decisions are rejected when attempted by the original decision-maker.

### Caution and restrictions

Restrictions have separate CAUTION, LISTING_CREATE, ORDER_CREATE and MARKETPLACE_ALL scopes, case/evidence linkage, actor attribution and expiry. All new restrictions must expire within 1–365 days. Active restrictions are enforced at listing creation/publication and order creation; admins can review and revoke with a reason. Caution records do not automatically block transactions.

### Reviews and history

Only participants in completed orders can submit one review each; reviews start pending moderation. Authorized moderation is audited, and a review recipient can post a bounded, audited response after publication. Buyer purchase and seller sales summaries expose counts and completed quote totals with an explicit note that settlement remains estimated.

### Feature switchboard and payment foundation

Added persistent versioned feature flags, default catalogue, dependency checks, risk tiers, mandatory reason and audit; Admin can change non-critical flags, critical flags require Super Admin/God Mode authority. Listing/order/offer/review/report/history routes and financial quote lines respect flags. Added payment and ledger persistence models plus an intentionally disabled provider adapter contract. No live payment, deduction, refund or payout is active.

### Central Registry

Added Registry field definitions and resources for marketplace feature flags, trust cases and restrictions; trust category and feature-state writes use Registry validation.

### Still open / safety boundary

Provider selection and signed webhook implementation, idempotent posting of balanced ledger entries, payment intent/capture, refunds/chargebacks, reconciliation, seller payout/settlement, jurisdiction-aware reviewed tax configuration, persistent media upload, deeper Registry validation for every trust field, public caution presentation policy, authenticated browser E2E and dedicated appeal/moderation screens beyond the Marketplace panels remain due. Do not collect money until payment/tax/legal/security/reconciliation gates pass.

This checkpoint supersedes earlier statements that the feature switchboard and trust UI were still only planned. The payment adapter contract and ledger schema are foundations only; provider-backed movement of money is not live.


## Marketplace final validation addendum — 2026-10-18 00:23:48 IST

Public feature-state API now drives UI visibility for listings, orders, reviews, reports and history. Public listings suppress sellers with active Marketplace-wide restrictions and expose only the moderated, unexpired caution rating/expiry without exposing evidence. Seller-side restriction checks also protect quote/order endpoints against stale direct requests. Admin cannot change tax settings; tax edits require Super Admin/God Mode and the UI preserves the configured review reference.


## Marketplace wholesale minimum quantity — 2026-10-18

Marketplace listings now support an optional minOrderQuantity in the listing unit. Registry field marketplaceListingMinimumOrderQuantity is the canonical validation source. Both quote and order creation reject requests below the seller threshold server-side; the frontend displays the minimum and validates before submission. Existing listings remain valid because the field is nullable. The additive migration is 20261018113000_marketplace_minimum_order_quantity; never reset the database to apply it.


## Marketplace negotiation loop — 2026-10-18
Marketplace negotiation supports iterative buyer counter-offers after a seller proposes a revised unit price. The authenticated buyer can counter from PRICE_CONFIRMATION_REQUIRED; the order returns to PENDING for the seller's next response. The service re-calculates the quote, persists the current policy version and pricing snapshot, records an audit event with negotiation context, and notifies the seller. Backend feature enforcement is authoritative; the UI only exposes the action when offers are enabled. No payment is initiated.

## Marketplace delivery and receipt workflow — 2026-10-18

Accepted Marketplace orders now support seller-maintained delivery status, carrier, tracking number, HTTPS tracking URL and estimated delivery date. Seller updates are authorized against the order seller, Registry-validated, transition-checked, audited and notify the buyer. Only the buyer may confirm receipt after dispatch/in-transit; if tracking has started, seller completion is blocked until buyer confirmation. The Registry-backed marketplace.delivery feature depends on marketplace.orders. No carrier-rate or label-purchase integration is implied.

## Marketplace media upload and storage — 2026-10-18

Authenticated Marketplace media upload supports JPEG/PNG/WebP/AVIF images up to 15 MiB and MP4/WebM videos up to 100 MiB. Temporary files are stored outside the public path with randomized names; file signatures are checked before moving to UUID-based final paths. Uploads require listing-create authorization, pass restriction and marketplace.media_uploads feature checks, and are audited. Internal uploaded paths are accepted by listing DTO/Registry validation and resolved to the API origin in the UI. Storage defaults to backend/uploads/marketplace and can be relocated with KK_MARKETPLACE_MEDIA_DIR. Git ignores uploaded media. This is a local-disk adapter, not yet a malware-scanned/object-storage/retention-complete production media service.

## Marketplace wholesale price tiers — 2026-10-18

Marketplace listings support up to 12 quantity-based wholesale tiers (minimum quantity and unit price). Central Registry fields validate tier quantities and prices; the service requires strictly increasing unique thresholds. Quote and order creation select the best eligible tier, but buyer offers remain a distinct negotiation price and the order retains its applicable listed/tier unit price. The marketplace.wholesale_pricing feature flag governs server quote behavior and UI visibility. Migration: 20261018120500_marketplace_wholesale_price_tiers.

## 11. Wholesale price tiers (implemented slice - 2026-10-18)
- Sellers can configure up to 12 quantity-based unit-price tiers using the compact minimum-quantity:unit-price format, for example 10:100, 25:90.
- The central Registry validates each minimum quantity and unit price; thresholds must be positive, unique, and strictly increasing after normalization.
- Quote and order creation choose the highest eligible tier for the requested quantity. A buyer's explicit offer remains a negotiation offer and does not silently replace the listed tier price.
- The effective unit price is saved with the order and quote snapshot so transaction history remains stable if the seller edits future listing tiers.
- The Registry-backed marketplace.wholesale_pricing feature switch gates tier configuration and display. Turning it off preserves stored tier data and existing orders.

## 12. Signed payment sandbox (implemented slice - 2026-10-18)
- The separate Registry-backed marketplace.payment_sandbox feature is disabled by default and requires Super Admin/God Mode approval. It does not turn on live provider payments.
- Sandbox intent creation requires KK_MARKETPLACE_PAYMENT_MODE=sandbox, a sandbox webhook secret of at least 32 characters, a buyer-owned accepted order, a saved quote, and an idempotency key. The response explicitly states that no money is collected or transferred.
- Webhooks verify HMAC-SHA256 against the exact raw request bytes using constant-time signature comparison. Events are persisted with a unique provider/event ID key and payload hash; exact replay is idempotent and event-ID reuse with a changed payload is rejected.
- The allowed simulation state path is CREATED -> AUTHORIZED -> CAPTURED or FAILED; terminal states cannot be replayed into a new state. Amount and currency must exactly match the immutable payment intent, and capture is rejected if the order is no longer accepted.
- A simulated capture writes two equal-and-opposite append-only ledger entries (PAYMENT_CLEARING debit and BUYER_FUNDS_HELD credit) with deterministic idempotency keys. This is test accounting only, not movement of funds.
- Live payment-provider linking, refunds/chargebacks, payout/settlement, tax remittance and real collection remain disabled until provider, security, legal/accounting, reconciliation and end-to-end review gates pass.

## 13. Next release gates
1. Implement jurisdiction/product/category-aware tax profiles with effective dates and reviewed policy references; never hardcode tax law or infer jurisdiction from unverified input.
2. Implement sandbox refunds/chargeback state, idempotency, ledger reversals, payout holds and reconciliation; keep real money movement disabled.
3. Complete authenticated browser E2E across listing -> tiered quote -> offer/counter-offer -> accepted order -> sandbox intent -> signed event -> delivery -> completion -> review/dispute.
4. Complete formal caution notice/appeal UX, media retention/scanning and a documented Admin/Super Admin/God Mode capability matrix.
5. Run full regression, backend/frontend production builds, schema/migration checks and runtime health smoke checks.

## Marketplace sandbox payment simulation — 2026-10-18

The Marketplace has a sandbox-only payment intent and webhook flow. Payment intents require an accepted order owned by the buyer, an idempotency key, a saved immutable quote snapshot, and the critical marketplace.payment_sandbox flag. The server also requires KK_MARKETPLACE_PAYMENT_MODE=sandbox and a webhook secret of at least 32 characters; the flag defaults OFF. Webhooks verify HMAC-SHA256 over raw request bytes with timing-safe comparison, reject event-id reuse with changed payloads, match amount/currency, enforce status transitions and write balanced equal-value debit/credit ledger entries for simulated CAPTURED events. Every event is audited. This is accounting simulation only: no real funds move and live payment, refund, payout, reconciliation and tax-remittance paths remain disabled.

## 14. Sandbox refunds and balanced reversals (implemented slice - 2026-10-18)
- Sandbox refunds are a separate feature flag, disabled by default and dependent on sandbox payment simulation. They require an accepted/completed buyer-owned order and an already captured sandbox payment.
- Each refund uses a stable idempotency key, immutable amount/currency/reason, and a unique sandbox refund identifier. Requested plus successful refunds reserve against the captured amount; an over-refund is rejected before persistence.
- Refund outcomes are accepted only through a signed HMAC-SHA256 webhook over exact raw bytes. Event IDs share the unique provider-event replay store and payload hash, so identical events are idempotent and changed-payload re-use is rejected.
- Only REQUESTED -> SUCCEEDED or FAILED is allowed. A successful simulated refund appends two equal entries reversing the original capture (BUYER_FUNDS_HELD debit and PAYMENT_CLEARING credit), with a refund-specific unique key and audit record.
- The UI shows sandbox payment/refund history and lets the buyer request a partial or full simulated refund when the feature is enabled. A signed sandbox outcome is still required to mark it successful. No funds are moved.
- Provider-backed refunds, chargebacks, dispute evidence/deadlines, payout holds, settlement and reconciliation remain disabled. These need a real provider adapter, verified signed events, legal/accounting review and end-to-end reconciliation before any live enablement.



### Marketplace settlement and reconciliation controls (2026-10-18)
- Seller-scoped statements report per-order gross, commission, net estimate, sandbox capture/refund totals, active payout holds and explicit NOT_PAID_OUT status.
- Super Admin/God Mode can create/release payout-hold governance records for orders with captured-payment records, with reason, bounded optional expiry and audit. This does not hold or release funds.
- Super Admin/God Mode can run persisted ledger reconciliation reports covering debit/credit totals by currency, invalid amounts/directions, captured payments missing ledger pairs, successful refunds missing reversal pairs, and exceptions. Runs are audited and never move money.
- Jurisdiction-aware tax profiles remain drafts until qualified-review reference approval by Super Admin/God Mode; matching requires jurisdiction, category and effective date. Historical order quote snapshots remain immutable.
- Release gate remains closed for real payment capture/refund, tax remittance and payout until provider integration, signed/idempotent webhooks, dispute/chargeback handling, reconciliation and qualified legal/accounting review pass authenticated end-to-end tests.


### Marketplace seller profiles, saved listings, messaging and bulk RFQs (2026-10-18)
- Seller profiles support display name, bio, coarse region, contact preference and explicit public-phone consent. Public responses redact phone unless showPhone is true; soft-deleted users are not exposed.
- Favorites are private per user and removed by status transition rather than hard deletion.
- Buyer/seller messages are participant-scoped, tied to a listing or order, length-bounded, and auditable. Listing inquiry routing requires the published seller; seller replies require an existing inquiry. Order messages can only go to the other transaction participant.
- Bulk RFQs support category, quantity/unit, target price, region, needed-by date, seller quotations, validity, buyer accept/reject decisions and cancellation. RFQ award is not an order and cannot move money.
- Central Registry now includes resource/capability definitions and field definitions for seller profiles, favorites, messages, RFQs and RFQ responses; feature flags control favorites, messaging and RFQs without deleting history.
- Additive migration 20261018140000_marketplace_profiles_favorites_messages_rfqs creates the new tables and restrictive foreign keys. Do not reset or delete existing data.
- Remaining release gates: authenticated E2E against migrated DB, complete regression suite, UI feature-toggle smoke, message/profile privacy checks, and live provider/compliance work remains disabled.


### Regression and migration checkpoint — 2026-10-18 13:22 IST
- [x] Prisma deploy applied all three pending Marketplace migrations: reviewed tax profiles, settlement/reconciliation controls, and seller profiles/favorites/messages/RFQs. No database or Docker volume reset.
- [x] Full backend regression passed: 65 suites, 620 tests.
- [x] Backend production build passed after Registry resource exports, seller profile privacy redaction and RFQ/message validation updates.
- [ ] Final frontend production build and Marketplace Playwright journey are running/remaining; then verify live API/UI health and git diff check.
- [ ] Existing DB history has a pre-existing applied migration named 20261004160000_god_mode_authority_tier that is absent from the local migrations directory. Do not erase or rewrite that history; it did not prevent the three additive Marketplace migrations from deploying.


### Final Marketplace verification checkpoint — 2026-10-18 13:30 IST
- [x] Full backend regression: 65 suites / 620 tests passed.
- [x] Backend production build passed.
- [x] Marketplace Playwright journey passed: profile privacy presentation, seller listing, favorites save, private buyer-to-seller message, bulk RFQ submission and settlement transparency.
- [x] E2E caught and fixed a native HTML number-step issue for fractional RFQ quantities; quantity and minimum-order inputs now allow decimal values.
- [x] Corrected additive migrations applied successfully; no database volume reset.
- [ ] Final frontend production build, live service restart/health smoke, diff check and final runtime verification.


### Final completed verification — 2026-10-18 13:36 IST
- [x] Backend production build passed after RFQ quote-expiry enforcement.
- [x] Frontend TypeScript/Vite production build passed after fractional quantity and quote-expiry UI updates. Existing non-blocking main chunk warning remains at approximately 516 KB minified.
- [x] Full backend regression: 65 suites, 621 tests passed.
- [x] Marketplace Playwright journey: 1 passed, covering seller profile/privacy presentation, listing, save/remove favorite, private message, RFQ submission and statement-only settlement.
- [x] Prisma applied tax profile, settlement/reconciliation, and seller profile/favorites/messages/RFQ migrations. No volume reset or data deletion.
- [x] User-level backend/frontend services restarted and active. Runtime smoke: API health, Marketplace categories, public feature flags, commerce policy and UI all HTTP 200. Protected profile/RFQ/settlement endpoints return expected HTTP 401 without a token.
- [x] git diff --check passed; no commit/push performed.
- [ ] Remaining external release gates only: real payment-provider implementation, real refunds/chargebacks/payouts, tax/legal/accounting review, object-storage production hardening and fully authenticated end-to-end testing with real roles.
- [ ] Preserve the pre-existing database history discrepancy: applied migration 20261004160000_god_mode_authority_tier is absent from the local migration directory. Do not rewrite migration history or reset the database.




### Final verification checkpoint — 2026-10-18 14:09 IST
- [x] Full frontend Playwright suite passed: 15 tests, zero failures, including the new core farm journey, multilingual intake translation, Marketplace buyer/seller workflow and Voice Agent workflows. The core journey timeout was raised to 60 seconds because parallel browser load made its 30-second default too tight; the complete rerun passed.
- [x] Full backend regression passed: 65 suites and 621 tests, zero failures.
- [x] Backend Nest build and frontend TypeScript/Vite production build completed successfully. Existing non-blocking frontend main bundle warning remains at 516.45 kB minified.
- [x] Prisma migration status: 48 migrations found; database schema is up to date. Existing note about the applied 20261004160000_god_mode_authority_tier history entry remains preserved; do not reset or rewrite migration history.
- [x] Runtime smoke after builds: API health, Marketplace categories, commerce policy, public feature flags and frontend root returned HTTP 200. Protected Marketplace profile endpoint returned expected HTTP 401 without a token.
- [x] git diff --check passed. Existing implementation changes remain uncommitted; no commit/push and no destructive database or Docker-volume operations.
- [ ] Remaining external/release gates: real payment provider, real refunds/chargebacks/payouts, qualified tax/legal/accounting review, production object-storage hardening, and fully authenticated E2E with real roles. Live money movement and tax remittance remain disabled.
- [ ] Next implementation focus: continue core-module workflows in sequence and prioritize confirmed gaps; do not drift into AI-only work or micro-management.



### Marketplace trust hardening — 2026-10-18 14:12 IST
- [x] Added explicit permanent Marketplace-wide blacklist support to trust-case resolution. An Admin/Super Admin can leave duration blank only for MARKETPLACE_ALL; narrower restrictions and caution ratings require a 1–365 day expiry.
- [x] Marketplace UI now explains permanent versus temporary duration, labels a no-expiry restriction as a permanent blacklist, and exposes reason-required manual revocation.
- [x] Active Marketplace-wide restrictions continue to hide the seller's published listings from public discovery and block Marketplace actions. No account or listing data is hard-deleted.
- [x] MarketplaceService unit suite passed: 55 tests, including new permanent-blacklist and expiry-policy regressions. Dedicated Admin browser journey passed, covering apply, persistent active state and reasoned revocation.
- [x] Backend Nest build passed after service changes; frontend TypeScript/Vite build passed after UI changes; git diff --check passed.
- [ ] Final release gates remain real payment/refund/chargeback/payout provider integration, qualified tax/legal/accounting review, production object-storage hardening, and authenticated E2E with real roles. Live money movement and tax remittance remain disabled.



### Final runtime verification — 2026-10-18 14:23 IST
- [x] Full frontend Playwright suite passed: 16 tests, zero failures, including core farm workflows, multilingual Intake, Marketplace buyer/seller flows, permanent blacklist apply/revoke, and Voice Agent journeys.
- [x] Full backend regression after permanent-blacklist implementation passed: 65 suites and 623 tests, zero failures. The focused MarketplaceService suite passed 55 tests.
- [x] Backend production build passed after the service change. Frontend TypeScript/Vite production build passed after the Marketplace trust UI change; the existing non-blocking 516.45 kB main chunk warning remains.
- [x] Prisma reports 48 migrations and an up-to-date database schema.
- [x] Restarted the supervised backend and frontend services; both are active. Runtime smoke: API health, Marketplace categories, commerce policy, public feature flags and UI returned HTTP 200; protected Marketplace profile returned expected HTTP 401 without a token.
- [x] PMD DOCX package and XML are valid; permanent blacklist governance details are included in the PMD, CTO Bible, Blueprint, Marketplace roadmap and timestamped execution plan.
- [x] git diff --check passed. No commit/push, database reset, Docker volume deletion or hard deletion of user/listing data.
- [ ] Remaining release gates: real payment/refund/chargeback/payout provider, qualified tax/legal/accounting review, production object-storage hardening, and fully authenticated E2E using real roles. Live money movement and tax remittance remain disabled.
- [ ] Continue core modules in sequence and address confirmed workflow gaps rather than diverting back into AI-only work.


## 13. Marketplace parent workspace: Inventory and Finance submodules (2026-10-18)
- Marketplace is the parent commercial workspace. Its visible submodules are Marketplace operations, Inventory, and Finance; Inventory and Finance are no longer independent farmer sidebar destinations.
- Legacy /app/inventory and /app/finance routes redirect to /app/marketplace?workspace=inventory and /app/marketplace?workspace=finance so saved links remain usable.
- The central Registry represents Inventory and Finance with parentId=marketplace. Parent hierarchy is distinct from operational dependencies and is covered by a registry invariant test.
- Sellers can create a listing linked to a farm-owned inventory item. Backend ownership checks, active-item checks and available-stock limits are authoritative; the listing quantity cannot exceed on-hand stock at creation.
- On completion of a stock-linked Marketplace order, the same database transaction decrements the inventory item, writes a STOCK_OUT InventoryTransaction with order reference and before/after quantities, records an audit event, and raises the existing low-stock notification when crossing the reorder threshold. The Marketplace listing quantity is decremented in the same transaction.
- Existing farm-scoped permissions, soft archive, stock movement history and the original inventory data remain in place. Marketplace loads inventory choices best-effort so lack of inventory read permission does not break the public Marketplace page.
- Regression coverage includes linked stock decrement and ledger creation plus rejection of listing quantity above available stock. The full backend regression passed 65 suites and 626 tests; the focused MarketplaceService suite now has 57 tests, and the central Registry suite passed 44 tests including parent integrity. Backend and frontend production builds passed. The dedicated Marketplace browser journey passed, covering permanent blacklist apply/revoke, Inventory/Finance tabs, legacy route redirect, and creating a stock-linked inventory listing; the full browser suite is running for final cross-module regression.
- Finance is presented inside the same Marketplace workspace. Existing buyer/seller order history, itemized provisional quotes, statement-only settlements, payout holds and reconciliation reports remain distinct from the farm income/expense ledger. Do not auto-book an order as cash income or move money until payment capture is verified and the accounting mapping is approved.
- Release gates remain real provider-backed payments, refunds/chargebacks/payouts, qualified tax/legal/accounting review, durable media security, and authenticated end-to-end checks with real roles. Sandbox payment/refund flows must never be represented as real money movement.


## Marketplace finance workspace consolidation — 2026-10-18
- [x] Moved buyer/seller order history, seller settlement statement, ledger reconciliation, payout-hold review/release, jurisdiction-aware tax profiles and Marketplace fee/tax policy controls into the Finance submodule alongside the farm income/expense ledger.
- [x] Marketplace tab remains focused on listing discovery/creation, seller profile, buyer/seller communication, RFQs, orders and trust governance. Finance uses the same existing APIs and records; no parallel ledger or duplicate transaction data was introduced.
- [x] Updated Marketplace journey tests to navigate to Finance for settlement transparency and return to Marketplace for buyer/seller interactions. Dedicated tests verify that the Finance workspace shows settlement, history and tax/policy controls.
- [x] Full backend regression passed 65 suites / 626 tests. Backend production build passed. Frontend production build passed. Full frontend Playwright suite passed 16 tests before Finance workspace consolidation; the two affected Marketplace browser journeys passed after consolidation.
- [x] Permanent Marketplace-wide blacklist, inventory-backed listing, stock-out ledger, low-stock alert, audit trail, Finance navigation and legacy redirects are covered by backend and browser regressions.
- [ ] External production release gates remain real payment/refund/chargeback/payout provider integration, qualified tax/legal/accounting approval, production media/object-storage hardening and authenticated end-to-end verification with real roles. Live money movement remains disabled.


## Order dispute workflow (implemented local workflow)
- Buyers and sellers can open an explicit DISPUTE against an order after the seller has acted on it. A dispute must reference the order; the server verifies the reporter is a participant and derives the counterparty from the order rather than trusting client-supplied identity.
- Disputes use the existing persistent, audited Marketplace trust-case queue, keep evidence links private to authorized reviewers, and support review, resolution/dismissal, and the existing caution/restriction governance where warranted.
- Admin/Super Admin can separately record payout holds only when a captured payment record exists. Holds and reconciliation remain statement/governance records, not actual fund movement.
- UI explicitly states that an internal dispute is not a payment-provider chargeback and does not move funds. Provider-backed chargebacks, evidence deadlines, external arbitration, real settlement/payout, and compliance review remain production gates.


## Reports & Analytics module (implemented backend workflow)
- The Reports screen reads a single authenticated backend overview endpoint instead of independently aggregating six client-side API calls. The API composes existing farm, crop, livestock, inventory, finance, and current-user Marketplace services; it does not write or mutate domain records.
- Farm filtering is checked against the farms returned for the authenticated user. Unknown or foreign farm identifiers are not disclosed. Inclusive from/to date filters are checked by the central Registry, must be real calendar dates, and reject reversed ranges.
- The Registry defines the reports module, farmReport resource, and reusable farm/date filter fields. The API uses existing module service authorization, returns an as-of timestamp, and reports optional-source failures as warnings while preserving other authorized sections. If farm access cannot be verified for a requested farm filter, the report fails closed.
- Farm summaries include crop and livestock counts, inventory counts and reorder-level alerts, and recorded income/expense/net by currency. Currency totals are never added across currencies and no exchange rate is invented. Marketplace counts are limited to the current seller and are not falsely attributed to a farm.
- CSV export includes farm summaries, filtered financial detail, the generation timestamp, filters, and data-scope notes. Reports are read-only and are not bank balances, audited accounts, tax advice, or statutory filings.


## Notifications & Alerts module (in-app event governance)
- Notifications are persisted in-app events scoped to the authenticated user. The API supports bounded listing, type/severity/unread filters, unread count, mark-one-read and mark-all-read. Every list/count/update query includes the authenticated user ID.
- Severity is INFO, SUCCESS, WARNING or CRITICAL. Events include their producing module, a stable per-user deduplication key and a logical expiry timestamp. The default retention window is 180 days; expired alerts are hidden, not hard-deleted.
- A shared transaction-safe writer is used by Inventory low-stock events, Marketplace order/delivery/counter-offer events and Livestock follow-up scheduling. A compound unique key plus createMany(skipDuplicates) prevents duplicate event rows without aborting the originating transaction.
- Registry definitions cover notification fields and list filters. Query limits are bounded to 1–100. Links are restricted to internal /app/ routes; external or unsafe hrefs are suppressed.
- The browser UI exposes severity, event type and unread-only filters, severity styling, refresh, per-item read and mark-all-read. When unread-only is active, read items disappear from the visible list immediately.
- External SMS/email/push delivery is intentionally separate from persisted in-app notifications and remains a plug-in integration. Notifications do not hard-delete history.

### 18 Oct 2026 — User lifecycle restore governance

- PENDING_DELETE is a reversible, auditable lifecycle state; it is not hard deletion.
- Normal user updates must not transition a PENDING_DELETE account to ACTIVE or DELETED. Reactivation must use POST /users/:id/restore, with a transactional status re-check, ACTIVE status, cleared deletion-request flags, user-history entry and AuditEvent actor attribution.
- The admin Users UI exposes Restore only for PENDING_DELETE rows and restricts status editing for those rows, directing operators to the explicit restore action.
- Focused UsersService regression rejects direct reactivation and stale restore attempts. The Playwright lifecycle journey covers user creation, explicit restore and activity/relationship empty states.
- The Users product module remains PARTIAL overall until the full regression, builds, runtime checks and CBA promotion complete.

### 18 Oct 2026 — Authorization registry reconciliation visibility

- The persisted permission matrix remains a read-only operational surface; the backend Authorization service remains the sole decision engine.
- The backend already exposes registry reconciliation and unit tests for declared, missing, covered and stale permission entries. The Permissions UI previously did not call that endpoint, so operators could not see drift from the canonical Registry.
- The Permissions page now loads the persisted matrix and reconciliation independently, displays declared/persisted/covered/missing/stale counts, and lists missing declarations and stale persisted resource permissions. A reconciliation failure is shown separately and does not hide the persisted matrix.
- No role mutation or second authorization engine was introduced. The frontend uses the existing typed API adapter and backend reconciliation result.
- Acceptance evidence: frontend production build and the Super Admin Playwright reconciliation journey pass; full regression and CBA promotion remain required before closure.


## 18 Oct 2026 — Farm lifecycle acceptance hardening

- Farm update and FarmRecord creation now fail closed when the parent farm is archived. The composite transaction-aware FarmRecord writer used by Intake repeats the active-farm predicate inside the transaction, so an archive occurring after outer authorization cannot leave new records attached to an archived farm.
- Farm restore now atomically claims only rows whose deletedAt is still non-null. The service creates the new active OWNER relationship and RESTORE audit record only when exactly one archived row was claimed; stale/concurrent restore requests do not create duplicate relationship or audit history.
- The Farms UI now reloads immediately when switching between active and archived lists. The shared useLiveRefresh hook intentionally remains unchanged; the page handles its filter-state transition explicitly.
- Regression coverage includes archived-farm update denial, direct record denial, transaction-aware Intake record denial, successful restore with relationship/audit, and a failed stale/concurrent restore with no relationship/audit side effects.
- Verification on isolated C worktree: FarmsService 45/45; full backend regression 66 suites / 644 tests; backend Nest build exit 0; frontend production build exit 0; authenticated archive/restore Playwright journey 1/1; full frontend Playwright suite 19/19.
- No schema migration, database reset, hard deletion, payment integration, or change to central Registry/AuthorizationService policy was introduced. Existing migration-history notes remain untouched.

## Farm Assets — archived-parent and temporal integrity gate (2026-10-18)
- Farm Assets are governed child resources: no new asset, update, removal, custody change, lease start/end, ownership transfer, split, or merge may mutate a farm after that parent farm is archived.
- Every composite write re-checks Farm.deletedAt IS NULL inside its database transaction. An archive racing with a write must cause the entire write to fail, including relationship changes, movement/lineage/evidence rows, and audit records.
- Pre-authorization context includes the parent farm's archive state and fails closed before protected resource mutation. Do not expose archived parent state through a different error path that leaks protected asset details.
- Historical movement, evidence, relationship and lineage reads remain governed by normal authorization; archiving a parent does not erase history.
- Split/merge must preserve positive quantities, common units, ownership consistency, temporal ordering, source-quantity compare-and-swap, and atomic movement + lineage + audit creation.
- The shared assertFarmActive transaction guard is the common enforcement point for asset write services. Extend it to any future asset mutation workflow rather than duplicating a partial check.


## Farm Records — direct-write archive race closure (2026-10-18)
- Direct FarmRecord creation and the transaction-aware Intake writer must both re-check Farm.deletedAt IS NULL inside the write transaction.
- The direct endpoint's outer active-farm read and authorization check are not sufficient to close an archive race between authorization and persistence. Use the shared assertFarmActive guard before inserting the record.
- If the parent was archived before the transaction acquired its write path, fail closed with no FarmRecord or CREATE audit row. Registry validation remains centralized and authorization remains ahead of protected payload validation.
- Farm archive is not record deletion. Historical FarmRecords remain stored and readable under the normal authorization policy.

## Crop — active-parent lifecycle integrity (2026-10-18)
- All Crop creation routes, including direct CreateCropDto, direct Intake creation and transaction-aware Intake creation, must use the canonical CropsService boundary and re-check Farm.deletedAt IS NULL inside the transaction that writes the crop, temporal owner relationship and audit record.
- Crop updates must re-check the active parent farm inside the update transaction; a farm archive racing with an update must roll back both Crop and audit mutations.
- Crop restore is not allowed beneath an archived parent farm. Check parent archive state before authorization and again inside the restore transaction.
- Historical crop reads remain available under normal authorization; parent archive must not erase crop, relationship or audit history. Keep Registry normalization and same-day duplicate behavior centralized in CropsService.

## Marketplace chargeback closure — 2026-10-18
The sandbox chargeback lifecycle is intentionally separate from real provider chargebacks. It requires the marketplace.chargebacks_sandbox feature flag (off by default), sandbox runtime mode, and a 32+ character webhook secret. Buyer requests are scoped to their own captured-payment order; seller evidence is scoped to the seller on that order and bounded by a seven-day deadline. Amount reservations include refunds and other chargebacks to prevent duplicate claims. Opening a case records an audited, non-monetary payout hold. Signed HMAC outcome events are raw-body verified and replay protected; a simulated loss creates balanced append-only ledger reversals and both outcomes release the simulated hold. The migration is additive; never reset the database or rewrite migration history. Real provider integration, legal/accounting review, production storage/media hardening and authenticated end-to-end verification remain explicit launch gates; never describe sandbox records as money movement.


## 2026-10-27 — Cross-module Marketplace and Context Capture Architecture

Canonical detailed requirements: `docs/KK-CROSS-MODULE-MARKETPLACE-AND-CONTEXT-ARCHITECTURE.md`. PMD is updated in the same change set. This decision supersedes the older Marketplace workspace note that made Inventory and Finance Marketplace children.

### Non-negotiable product decisions
- KrishiKendram is a multi-domain platform for people and organizations, not only farmers. One account can participate in many modules, organizations and contextual roles; roles never grant unrelated access.
- Marketplace, Inventory and Finance are independent modules. Marketplace is a cross-domain discovery, commerce, services and exchange layer; Inventory owns stock/movements; Finance owns books/accounting mappings. Integration is optional, explicit, authorized and reversible. Disable one module without disabling or erasing the others.
- Suppliers/providers need not be farmers. Example: a fertilizer supplier can publish through Marketplace and optionally use Inventory/Finance without any Farm/Crop record. Customers may be farmers, businesses, institutions or other providers.
- Marketplace offering types include goods, digital products, professional services, rentals, bookings/events, subscriptions/contracts, RFQs/wholesale, public services/tenders, knowledge/training, jobs/expertise, donations/barter/community offers, logistics, testing, repair and storage.
- Marketplace supports internal KK sharing and safe external links/sharing (WhatsApp, email, SMS, QR/native share) plus references to approved social/content URLs. Never promise external-platform publishing/import unless API access and permission exist. Public previews cannot leak member-only data.

### Context-aware commerce
- Every listing type/action declares Registry-backed context and eligibility requirements. A central Context & Eligibility Engine checks existing authorized facts and asks only for missing relevant details.
- Progressive levels: (1) optional gentle prompt, (2) guided completion for context-dependent advice/quote/booking/service, (3) mandatory legal/safety/eligibility checks where applicable. Optional profile enrichment must not block unrelated activity.
- Example: farmer without crop/land details selects fertilizer; KK asks intended crop, region, planting status and other relevant fields before tailored advice, then offers to create/update authoritative Farm/Crops records after confirmation. Do not fabricate answers; support voice/text/photo, “unknown”, defer and resumable drafts when safe. Regulated/high-risk items may require stricter gates.
- Persist confirmed facts in their owning module; link transactions by stable references. Record provenance (user-confirmed, document-verified, partner, AI-extracted, inferred, imported, unknown), confidence, source, timestamp and correction history. AI never silently turns an inference into a verified fact or overwrites canonical data.
- Keep original-language wording/transcript separate from translation/normalization, with language, confidence and correction metadata. Explain why data is requested, where stored, who may access it, purpose and whether optional. Order fulfilment does not automatically authorize research, advertising, manufacturer or government reuse.

### Integration map and governance
- Identity/Organizations ↔ all modules; Marketplace ↔ Inventory (stock reservation/decrement/returns), Finance (quotes/receipts/settlement references), Farms/Crops/Livestock (authorized intended-use context), Education, Health/Veterinary, Government, Logistics/Storage, Labs/Research, Community/NGOs, Notifications/Activity/History, Reports/Analytics, AI Companion, Documents/Media and Search/Discovery.
- Integrations use typed contracts/events, source/target authorization, idempotency, audit correlation and clear failure handling. Events never bypass domain APIs; private records are never indexed or shared by default.
- Admin, Super Admin and God Mode use one Registry-backed policy/feature catalogue with dependencies, rollout, audit and rollback. Server authorization is mandatory. Turning a feature off blocks new use but preserves history and required dispute/refund/audit paths.
- Existing commercial guardrails remain: immutable quote/fee/tax snapshots, decimal-safe money, append-only ledger, payment-provider verification, scoped buyer/seller histories, evidence-based restrictions/appeals and no live money movement until provider/security/legal/accounting/authenticated E2E gates pass.

### Delivery sequence and evidence gate
1. Update PMD, Bible, Blueprint, Marketplace roadmap and execution plan (this checkpoint).
2. Correct Registry module parentage and tests; retain independent routes and legacy redirects; do not reset DB or delete data.
3. Implement Registry context policy + Context & Eligibility Engine, first on Marketplace listing/order flows.
4. Rebuild Marketplace UI around cross-domain listing types, provider storefronts, type-aware discovery/actions, visibility and safe sharing while preserving current commerce/trust functionality.
5. Add optional Inventory/Finance integration contracts, followed by Education, professional services, Government, Logistics, Labs/Research and Community integrations.
6. Run backend/frontend builds, focused tests, full regression and authenticated browser/runtime tests. Only mark verified features complete with evidence; external payment, tax/legal, durable-media and real-role release gates stay explicit.

### Architectural correction required
Current Registry definitions have `parentId: 'marketplace'` for Inventory and Finance and MarketplacePage embeds their screens as tabs. This conflicts with the product decision. Remove those parent IDs and expose each module independently; Marketplace may link to them contextually. Keep legacy URLs working. Update the old 2026-10-18 Marketplace parent workspace note as historical/ superseded rather than silently treating it as current architecture.


## Application refresh and form-state safety (2026-10-27)

- Never refresh or reload the whole website on a polling timer. Background refresh must update data state only; it must not call `window.location.reload()` or remount the active page.
- Live polling is opt-in, off by default, and configurable at 10, 15, or 30 seconds from a compact **Live data** checkbox beside the relevant list/table refresh action.
- Polling must not run on window focus, tab visibility, or page-show events. Those events are not consent to refresh active work.
- Keep list/table data refresh separate from editable form state. A refresh must preserve typed-but-unsaved values, selected filters, search text, pagination, expanded rows, and current edit sessions. Do not rehydrate editable forms from server state after initial load unless the user explicitly reloads/reset the form or a save succeeds.
- Keep manual Refresh available. Core domain list pages must continue to load once on entry and reload when their explicit filters change; opting into live data adds interval refresh only.
- Admin configuration and sensitive views should remain manual-refresh unless a narrowly scoped, table-only live refresh is explicitly needed.
- Regression checks: live data defaults off; 10/15/30 seconds are the only offered intervals; filters and unsaved form values survive an interval; switching tabs does not trigger refresh; no full-page reload is introduced.
### Marketplace seller-profile authorization (2026-10-27)
- Seller-profile writes use the central marketplace/marketplaceSellerProfile/UPDATE authorization capability with OWN scope; the service retains the ownership check and audit trail.
- Registry declarations alone do not grant a role access. backend/prisma/seed.ts explicitly reconciles the seller-profile OWN capability to authenticated account roles, because Marketplace supports buyers and sellers across account types.
- This is additive role-permission reconciliation. It does not grant GLOBAL access or permit users to update another user's profile.
### User Access Matrix (2026-10-27)
- User administration exposes an opt-in User Access Matrix sourced from Registry capability declarations and persisted role/user-specific grants.
- Matrix visibility is a global platform setting controllable by Admin, Super Admin, and SYSTEM_GOD authority. Changes require a reason and are audit logged.
- The matrix lists declared module/resource/action/scope rows even when no grant exists. It distinguishes configured grants from contextual enforcement (ownership, farm relationships, module switches, account state and field policy); it must never imply a displayed grant guarantees every request.
- Turning matrix visibility off hides the UI and the API refuses matrix reads; it does not change authorization grants.

### 27 Oct 2026 — Seller profile visibility policy
- Public seller-profile visibility defaults ON for every user when no explicit platform policy exists.
- Admin/Super Admin/God Mode can set a global default and add ordered override rules. Within each rule, every non-empty selector must match: user IDs AND module IDs AND categories. Later matching rules win, enabling global, selected-user, selected-module, selected-category, and combined targeting.
- Policy is persisted in the central SystemSetting store and every change requires an audit reason. Enforcement occurs in public seller-profile and Marketplace listing responses, not only in the UI.
- Visibility policy never overrides seller consent for public phone display; phone remains redacted unless the seller explicitly enables showPhone. Owner's own profile remains accessible to its owner.

### 2026-10-27 — User-scoped messaging integrations
- Messaging connections are owned by one KK user and may never be shared implicitly across users. Provider tokens are encrypted server-side with AES-256-GCM; the 32-byte key is supplied only through the ignored backend environment variable KK_MESSAGING_ENCRYPTION_KEY, never source control or browser storage.
- Arattai Business is the first implemented provider. Use its official REST API root https://business.arattai.in/api/v1, OAuth Bearer access token, and approved template IDs. Test promotions use POST /promotions/test; real promotions use POST /promotions. Operational messages use POST /transactions and require a separate active TRANSACTIONAL consent record.
- Promotional delivery requires a per-sender, per-recipient active consent record. Store recipient phone encrypted, index with a sender-scoped SHA-256 digest, mask in UI, and support explicit revocation. Never bulk-send or treat an unverified phone as opt-in.
- WhatsApp Business and Telegram are registered as provider slots only; their connection/auth/send adapters must be implemented and verified before claiming support.
- Marketplace browse filters load the published listing collection and filter it in the UI by category and India-local publication day/week. Display the matched count and an explicit no-match state.


### Inventory-owned Marketplace stock integration — 2026-10-27
Marketplace no longer reads/writes InventoryItem or InventoryTransaction tables directly. Inventory exposes a seller-owned listing-source resolver (with Inventory READ authorization) and an internal Marketplace sale operation (with Inventory UPDATE authorization) that owns compare-and-update stock decrement, stock-out ledger, audit, and low-stock notifications. Marketplace invokes the sale operation inside its existing order transaction so stock, listing quantity/status, order state, and audit still commit or roll back together. Real provider payments/payouts remain disabled.


### Registry-backed offering details and canonical source references — 2026-10-27
The public `GET /api/v1/marketplace/offering-types` contract now drives create/edit form fields for all 12 offering types. Field keys, labels, types, enum choices, and requiredness come from `backend/src/platform/registry/definitions/marketplace-offering-definitions.ts`; individual detail fields are registered centrally and server-validated on create/update. Persisted details live in nullable `MarketplaceListing.offeringDetails` JSONB added by migration `20261027160000_marketplace_offering_details`. Buyers see saved details using Registry labels. Source module/entity references are derived from owned resource type/ID and client-supplied mismatches are rejected. The PMD DOCX, CTO Bible, architecture and commerce roadmap are being kept aligned with this implementation; existing listings remain compatible with null details.

## Marketplace context capture — sanitization and participant boundary tests (2026-10-27)
- Agricultural-input orders require the Registry-backed AGRI_INPUT_USAGE policy's crop and region fields before order creation; optional area/stage/purpose fields are accepted only from the policy allow-list, normalized before persistence, and stored with a USER_CONFIRMED checkout provenance snapshot.
- Regression tests now assert that unknown context keys are not persisted, user-entered values are trimmed/normalized, the policy version and capture provenance are snapshotted, and the order creation audit identifies the buyer and created order.
- Order history access is explicitly tested to query only orders where the caller is the buyer or seller, with authorization checked before reading.
- Verification: MarketplaceService suite passed 65/65; full backend regression before these two additional tests passed 69 suites / 673 tests; backend and frontend production builds passed. The two browser cases that timed out during the full run passed in an isolated Marketplace rerun (3/3). See the 2026-10-27 execution plan for exact evidence and remaining manual/authenticated gates.
- Optional consent-aware Farm/Crop linking is now implemented for agricultural-input orders. The buyer must explicitly consent; the backend validates active ownership and Crop/Farm consistency, stores optional foreign keys plus an ORDER_CONTEXT_ONLY consent snapshot on MarketplaceOrder, and never edits Farm/Crop records or creates them as an AI side effect. Automated create/update of authoritative records remains a separate future action.


## Shop & Compare storefront (2026-10-27)

- The new /app/shop route is a separate shopper-first storefront. Keep /app/marketplace intact as the existing seller listing, order, finance/inventory submodule and governance workspace.
- The storefront provides search, category/type filters, price sorting, responsive product cards, product detail view, compare up to four listings, saved listings, a device-persisted cart and multi-item order-request submission through the existing Marketplace order API.
- The storefront now loads batch unique-session counts for the previous hour onto product cards and refreshes an item count when its detail view opens. A cart line can carry an optional per-unit offer. A persistent Marketplace buyer profile records buyer type (farmer, business, commission agent, broker, household, input retailer, service provider, other), purchase purpose, business name, region, scale and crop interests. Cross-module use is OFF by default. The user must explicitly consent and select module targets. The authenticated buyer-profile context endpoint returns context only to a selected module when consent is active; Farms, Crops, Livestock, Inventory and Finance now show a consent-gated context notice when the user selected that module. Revocation clears active module targets while retaining the Marketplace profile; do not share with external parties or mutate authoritative Farm/Crop records as a side effect.
- Anonymous listing-view counts use a browser session key hashed server-side, aggregate unique sessions over the last 60 minutes, and do not store IP addresses or account identity. Treat as approximate visits, not verified human users; apply retention/cleanup as volume grows.
- Cart checkout currently creates existing order requests only. Real provider-backed payment, capture, refund, payout and tax collection remain disabled until provider/webhook, ledger, reconciliation, legal/tax and security review gates pass. The UI must not claim money has moved.


## 2026-10-29 — Shop & Compare storefront release checkpoint

- The shopper storefront remains a separate `/app/shop` template; preserve the existing `/app/marketplace` seller/order and governance workspace.
- Catalog results are grouped chronologically (Today, Yesterday, Day before yesterday, Earlier this week, Older) and retain search, category/type filtering, and price/date sorting.
- Product detail supports bounded product-video previews and seller/document links only for valid HTTP(S) URLs. Last-hour counts are anonymous session aggregates, not identified viewers.
- Frontend production build passed after these UI changes; Shop & Compare Playwright test passed 1/1. The wider focused browser set passed 4/4; targeted backend Marketplace/Inventory/context tests passed 89/89 and Nest build passed.
- Real payment checkout remains disabled. Order requests do not move money. Live payment, tax remittance, refunds/chargebacks, payouts and settlement remain blocked until provider/security/legal/accounting and authenticated real-role acceptance gates pass.

## Canonical module-plan cross-check and Store experience standard — 2026-10-29 23:31:55 IST

This standard is mandatory for new work and for every material change proposed in a chat, issue, roadmap, module plan or code review. The canonical module inventory is ; product intent and acceptance criteria belong in ; execution evidence, blockers, commands and resume position belong in this Bible and the timestamped execution plan. Keep all of them aligned. Do not invent a new module or divert to a deferred module when the request belongs to an existing core domain.

### Required cross-check for every module plan/change
1. Identify affected module(s), shared service(s), Registry contracts, data ownership and downstream consumers from the canonical inventory.
2. Check central Registry field/resource/module definitions, shared field types/enums/defaults/requiredness/normalization/validation, capabilities, dependencies, lifecycle and feature flags before adding new definitions. Reuse or extend the canonical contract; do not duplicate rules in UI or domain-specific ad hoc lists.
3. Check Authorization scope and field access, Admin/Super Admin/God Mode control exposure, server-side enforcement, feature-off behavior and dependency/rollback behavior.
4. Check persistence/migrations, transactional invariants, audit actor attribution, History, Provenance, consent, privacy/retention, notifications and cross-module service/event contracts.
5. Check UI states (loading/empty/error/disabled/denied/mobile/accessibility), API and DB integration, negative/security tests, authenticated role E2E, build/runtime and migration status.
6. Update PMD acceptance requirements, this Bible, module roadmap, relevant domain architecture/governance docs, tests, and timestamped checkpoint when applicable. Update the status only to the level supported by evidence.
7. Preserve existing changes and backups; run CBA review before commit/push. Never bypass migration discrepancies, claim external integration without verified adapter behavior, or treat a build/mock test as end-to-end acceptance.

### Shop and Marketplace — customer trust and external content
- Keep  as a shopper-first storefront and  as the seller/provider and governance workspace. Share contracts and services, not duplicated domain data.
- Registry-driven controls must govern each feature's enabled state, risk level, limits, dependencies, rollout/effective dates, eligible roles, approval requirements and audit/rollback. Admin operates within delegated scope; Super Admin governs policy and approvals; God Mode retains ultimate override and recovery. UI visibility never substitutes for backend authorization. Turning a feature off blocks new use but preserves records, history, refunds/disputes and audit.
- Product content supports either platform upload or an optional external URL/media reference so users can reduce storage use. Accept HTTPS links only, validate URL and allowed embed providers, protect against private-network/unsafe redirects and script injection, render a safe preview or an ordinary external link, and do not scrape login-protected content. Store source URL, provider, submitter, consent/rights declaration, validation state and timestamps. External deletion, changed content and access restrictions must degrade gracefully. Platform-hosted media requires size/type/signature checks, safe storage, access control, retention and future malware scanning/object-storage adapter gates.
- Social product demos and reviews may link/embed from explicitly supported providers, subject to provider terms and safe embed allowlists. External ratings/reviews must be labelled as external and dated/source-attributed; never present them as verified KrishiKendram reviews. Do not download or mirror third-party media without rights/consent. Provide a direct-link fallback for blocked embeds and low-bandwidth users.
- Supplier Q&A is a persistent, listing-linked workflow. Buyers can ask product/specification questions, request samples, or ask about bulk quantity/MOQ, lead time, delivery region and quotation validity. Suppliers answer through authenticated listing ownership. Store question/answer, actor, listing/version context, timestamps, moderation/report state, visibility, optional consented attachments and audit events. Notify participants. Q&A is not an order, quote acceptance or payment; converting a bulk enquiry to RFQ/offer/order requires a typed explicit action. Protect private contact details and moderate spam, unsafe links and abuse.
- Keep a platform record of questions, supplier responses, RFQs, offers, order decisions, disputes and user-consented attachments for audit, customer support and authorized analytics. Do not claim to observe a negotiation, demo view, review, sample delivery or purchase that occurred only on an external site. Optional external contact/link-outs require consent and a clear notice that platform protection/evidence may not cover activity outside the platform. Where supported, allow the parties to attach receipts/evidence or mark externally completed outcomes with provenance, not as automatically verified facts.
- Public trust indicators can include member-since month/year, verified completed purchase count, verified completed sales count, response rate/time, fulfilment/cancellation ratio and transaction-verified review summary when data quality permits. Counts must be calculated from authoritative records and clearly define their window and eligibility; exclude cancelled/test/duplicate orders and do not expose counterparties, private order details, exact spend, personal data or sensitive risk signals. Label self-reported versus verified information and show unavailable data as unavailable, not zero. Provide correction/report/appeal paths.
- Buyer and seller protection includes clear itemized pre-commit quotes, evidence-backed dispute/refund/return workflows, delivery/receipt states, counterfeit/misrepresentation reporting, scoped and appealable restrictions, verified-transaction reviews, privacy controls, audit trails, fair notice and anti-retaliation moderation. Trust scores/risk models are advisory; no opaque score or AI signal may permanently blacklist an account without accountable review.
- Store analytics use privacy-minimizing aggregate sessions and defined windows. A view count is approximate session activity, not a unique verified human or purchase intent. Do not retain raw IP addresses for storefront view counts. Explain which activity is platform-observed versus external.
- Integrate Inventory for stock/reservations/movements, Finance for ledger/quotes/fees/tax/settlement, Users/Organizations for identity/profile and member tenure, Media for uploads/links, Notifications for events, Search for discovery, Authorization for access, Audit/History/Provenance for evidence, and Reports for authorized aggregate metrics. Domain services remain owners of their own data; cross-module writes use authorized service contracts/events, not direct table writes.
- Feature switches and limits must be independently configurable for uploads, external links, social embeds, video previews, Q&A, sample requests, bulk/RFQ, public statistics, verified reviews, comments, favorites, comparison, recommendations, visitor analytics, messaging, delivery, disputes, fee/tax display, payment modes and moderation. Dependencies and safety-critical controls fail closed. Real payments, payouts, tax remittance and external-platform API integrations remain disabled until provider, security, legal/accounting and authenticated end-to-end gates pass.

### Verification boundary
A feature is not complete because it appears in PMD or a plan. Record evidence for Registry/authorization, persistence, service and UI, audit/history, tests, runtime and relevant role workflows. External providers and external user actions must be described as pending or externally observed unless verified through a working authorized integration.

## Store Q&A, external demos and trust controls implementation checkpoint — 2026-10-29 23:41:48 IST

Implemented in the working tree (not yet accepted as complete): persistent listing-linked question/answer records; public product questions; participant-private sample and bulk enquiries; seller-only answering; audit events and notifications; server-enforced per-listing daily question limits, per-buyer daily sample/bulk limits, and Registry-defined configuration defaults; Admin/Super Admin/God Mode feature switching and limit editing; HTTPS-only external link/media input policy; allowlisted YouTube/Vimeo embed previews with safe direct-link fallback; opt-out public profile statistics (member-since month/year, completed purchase/sale counts, published review count and average rating).

Only the additive MarketplaceListingQuestion table migration is required for this slice and has NOT been applied. Feature limits and public-statistics consent are stored in existing SystemSetting records, so this slice does not add columns to existing tables. The pre-existing migration-history discrepancy remains a release blocker. Existing migration-history discrepancy remains a release blocker; do not deploy/resolve/reset/baseline until reconciled. Focused Marketplace service tests pass 75/75; Prisma schema validation passes; backend Nest build completes without TypeScript errors; frontend production build passes with a Vite warning that the main chunk exceeds 500 kB. Authenticated runtime/browser E2E remains pending because the additive Q&A migration is not applied and the pre-existing migration-history discrepancy remains unresolved. Do not commit/push until validation, role tests, migration review and CBA checks pass.

## Verification update — 2026-10-29 23:54:16 IST
- Prisma schema validation: passed.
- Marketplace service tests: 75/75 passed.
- Backend Nest build: completed without TypeScript errors.
- Frontend production build: passed; Vite warns that the main chunk exceeds 500 kB, so code splitting remains a performance improvement.
- Q&A table migration remains unapplied. The known missing migration-history entry still blocks safe migration deployment and authenticated DB-backed E2E. No commit/push performed.

## Store feature-switch and verification update — 2026-10-30 00:06:10 IST

Additional central switches now cover external media/site links, social demo embeds, anonymous visitor analytics, and public trust statistics. Admin/Super Admin/God Mode can turn these switches on/off; the backend blocks external-reference writes and visitor-event collection when those controls are off, and suppresses public statistics when disabled or user-opted-out. The Shop fails closed for external embeds/links until the public feature state is loaded. Local uploads continue to work when external content is disabled.

Latest verification: Marketplace service tests 75/75 pass; Prisma schema validation passes; backend Nest build completes without TypeScript errors; frontend production build passes. Vite reports the existing main bundle exceeds 500 kB. Authenticated DB-backed E2E remains pending because the additive Q&A table migration is not applied and the existing migration-history discrepancy is unresolved. No commit/push.

## Migration-history recovery finding — 2026-10-30 00:11:03 IST

Read-only database inspection confirmed that the successful migration 20261004110000_god_mode_authority_tier exists in DB history and its SHA-256 checksum matches the historical SQL recovered from commit 0e91747. That canonical 11:00 migration file has been restored to the repository. The database also contains a separate 16:00 row for 20261004160000_god_mode_authority_tier with the same checksum, but that row is failed/rolled back because the AuthorityTier enum already existed. The AuthorityTier enum and User.authorityTier column are present in the live schema.

After restoring the canonical 11:00 file, prisma migrate status still reports the failed 16:00 row as missing locally and identifies two pending additive migrations: 20261029221500_marketplace_booking_requests and 20261029233000_marketplace_listing_questions. No migration was applied and no migration metadata was changed. Do not deploy, resolve, reset, baseline, or fabricate an idempotent replacement; the duplicate failed row needs an owner-approved migration-history recovery before database-backed E2E or commit/push.

## Store module verification and media-policy correction — 2026-10-30 04:48:26 IST

A Shop storefront policy gap was found and corrected: product-card and cart thumbnails previously rendered the first external image URL without consulting marketplace.external_content. Both now use the same safeMediaUrl policy as product details. With external content disabled, HTTPS-hosted images, social video embeds and external seller links are suppressed; locally uploaded /uploads/marketplace media remains usable.

Browser acceptance: frontend/e2e/marketplace-shopping.spec.ts now contains three Shop tests: Shop & Compare/cart/buyer profile; non-product listing discovery without generic checkout; and external-content-off with local-upload preservation. All 3/3 pass. Marketplace backend service tests pass 75/75. Frontend production build passes; current output warns that the main JS chunk is 522.68 kB (162.04 kB gzip), so code-splitting is a performance follow-up. Backend Nest build has generated backend/dist artifacts; final exit code is being captured separately and is not yet marked verified here.

Store scope already implemented in the working tree includes Registry-controlled feature toggles/configuration, Admin/Super Admin/God Mode policy access, Inventory and Finance workspace integration through their existing services, user photo/video uploads, external HTTPS links, allowlisted YouTube/Vimeo demos, listing Q&A, private sample/bulk enquiries, notifications/audit, anonymous last-hour visitor counts, opt-in public trust aggregates, scoped trust cases/restrictions, and disabled live payment/tax activation pending required review.

Release blocker remains: the DB contains successful 20261004110000_god_mode_authority_tier and a duplicate failed/rolled-back 20261004160000_god_mode_authority_tier row with the same SQL checksum. The canonical successful migration file is restored. Two additive Store migrations (20261029221500_marketplace_booking_requests and 20261029233000_marketplace_listing_questions) remain pending. No migration was applied and no _prisma_migrations metadata changed. Authenticated DB-backed E2E, final CBA and commit/push remain blocked until the duplicate rolled-back migration record is safely reconciled.

## Final Store build and migration verification — 2026-10-30 04:49:15 IST

- Backend Nest build exit code: 0; generated 758 backend/dist files including Marketplace service/controller outputs.
- Prisma schema validation exit code: 0.
- Frontend production build: passed; Vite warns main bundle 522.68 kB (162.04 kB gzip).
- Marketplace service tests: 75/75 passed. Shop browser tests: 3/3 passed. git diff --check: passed.
- Prisma migrate status exits 0 but explicitly reports history mismatch: successful 11:00 authority-tier migration is present; failed/rolled-back 16:00 duplicate is missing locally; booking and listing-question migrations are pending. No DB migration or migration metadata was changed.
- Authenticated DB-backed E2E and CBA commit/push remain blocked until safe recovery of the duplicate rolled-back migration row.


## Store + Farm Management completion sprint — 2026-10-30 07:55 IST

### Execution scope and non-negotiable contracts

This sprint closes two priorities together: (1) Store / Shop and its provider-side Marketplace integration, and (2) the complete Farm Management domain: Farms, Farm Assets, Farm Records, Crops/Crop Lifecycle, and Livestock/health-production records. Do not replace either domain with a generic CRUD page or duplicate domain data in Marketplace.

**Store ownership boundaries**
- Marketplace owns provider/seller listings, typed offering context, buyer enquiries/Q&A, booking requests, offers/RFQs, orders/requests, trust cases, reviews, moderation, disputes and settlement statements.
- Shop is a separate shopper-first discovery template; it does not replace seller operations.
- Inventory remains the only source of stock quantities, movements, reservations and valuation. Marketplace calls Inventory domain services; it must not decrement stock by direct table writes.
- Finance remains the only source of financial records, fee/tax calculations, settlement and reconciliation. Order intent is not captured money. Buyer/seller fees and jurisdiction-aware tax presentation must be transparent; actual charge, payout, refund, chargeback and tax remittance stay disabled until provider, security, legal/accounting and authenticated acceptance gates pass.
- Listing uploads, externally hosted HTTPS photos/videos and link-outs must be safe, consent-aware and feature-gated. Link-outs must state that off-platform activity is outside KK dispute/protection visibility.
- Listing Q&A public questions are visible to all; sample/bulk enquiries are private to asker and listing seller. Answers and notifications are transactionally audited. Public visitor statistics count anonymous sessions only and must be scoped to published, non-archived listings; never expose draft/rejected listing activity.

**Farm domain ownership boundaries**
- Farms own farm identity, location, area, ownership and archive/restore.
- Farm Assets own equipment/resources and custody, lease, transfer, split/merge and lineage; Marketplace references assets by authorized resource contracts.
- Farm Records are append-only operational history. No edit/delete path; corrections are new attributed records. Direct and composite writes must validate and audit atomically and re-check active parent farm state inside the transaction.
- Crops own crop registration and lifecycle. Allowed observed progression is forward-only while allowing skipped intermediate observations; FAILED is reachable from an active stage; HARVESTED and FAILED are terminal; ARCHIVED is reserved for archive/restore endpoints. Validate season/status through Registry and audit exact before/after transition.
- Livestock owns animal/herd records and its operational HEALTH, VACCINATION, TREATMENT, MILK_PRODUCTION, EGG_PRODUCTION, WEIGHT, BREEDING, FEEDING and OTHER records. Creation defaults (count=1/status=ACTIVE) must never be applied to sparse PATCH updates. Child writes, updates and restores must re-check that the parent farm remains active inside the transaction.

### Cross-module completion checklist

For every workflow: (1) Registry contract owns reusable field type, normalization, allowed values, requiredness and limits; (2) authorization occurs before protected validation/mutation; (3) parent/owner/relationship state is re-checked in the same transaction as writes; (4) domain service owns writes; (5) actor, source, timestamp, before/after state and correction trail are auditable; (6) feature-off preserves historical reads and audit while blocking new use; (7) tests cover positive, negative, race, authorization and archived-parent paths; (8) browser acceptance covers real roles, responsive/mobile, loading/empty/error/disabled states.

### 2026-10-30 verified progress (not a completion declaration)

- Crop lifecycle policy and focused service tests added; 27 tests passed across Crop service and lifecycle policy suites.
- Farm/Livestock hardening: create-only defaults, active-parent transactional checks for livestock create/update/restore, and archived-parent protection for health/production record creation.
- Marketplace public listing visitor count now filters to published, non-archived listings.
- Combined focused Store/Farm regression run: 188 tests passed across 10 suites.
- Backend build and frontend/browser acceptance are still pending fresh exit-code evidence. Store's two additive migrations remain unapplied until the previously documented Prisma history mismatch is reconciled safely. No database reset or destructive migration operation is permitted.
- Do not mark Store or Farm COMPLETE until authenticated database-backed role E2E, migration reconciliation/deploy verification, frontend/browser acceptance, security checks and CBA commit/push evidence are recorded.

## Store + Farm verification checkpoint — 2026-10-30 09:06 IST

- Full backend regression: 71 suites, 710 tests passed. This includes Marketplace social/profile, visitor analytics, settlement/payment-sandbox/tax, Farm, Farm Asset custody/lease/lifecycle/lineage, Crop lifecycle, Livestock and Livestock records.
- Backend Nest build exit 0; frontend TypeScript/Vite production build exit 0; Prisma schema validation passed; git diff --check passed.
- Mocked browser journeys passed: Farm archive/restore 1/1; cross-module Inventory/Finance/Notifications/Reports 1/1; Marketplace buyer/seller workspace 1/1; Shop & Compare 3/3.
- Store and Farm remain IN PROGRESS for release purposes. Prisma status reports three unapplied migrations (Marketplace booking requests, Marketplace listing questions, FarmAsset soft archive) and a database-only rolled-back duplicate authority-tier migration missing locally. No migration, DDL, DML or Prisma migration metadata was changed. Authenticated database-backed role E2E is pending.
- Do not claim production completion or commit/push until migration history is reconciled through a Prisma-supported, audit-preserving procedure with explicit owner approval, the three reviewed migrations are deployed, and authenticated role acceptance passes.

## Database migration reconciliation finding — 2026-10-30 09:08 IST

- Read-only PostgreSQL inspection confirms the successful 20261004110000_god_mode_authority_tier row and the rolled-back 20261004160000_god_mode_authority_tier duplicate have identical SHA-256 checksums. The AuthorityTier schema is already present from the successful migration.
- The live FarmAsset table does not yet contain deletedAt and still has the old FarmAsset_farmId_createdAt_idx index. MarketplaceBookingRequest and MarketplaceListingQuestion tables do not yet exist. This confirms all three pending migrations are required before those workflows can be accepted against the live database.
- Installed Prisma CLI and client are 6.19.3. Prisma ORM v6 documentation describes migrate resolve --applied as marking a failed/manual-completed migration applied without executing its SQL. Candidate reconciliation: restore the missing duplicate migration folder with the exact historical SQL/checksum, then mark that already-schema-applied duplicate as applied. This changes migration metadata only; it must not execute the duplicate SQL.
- After owner approval and a fresh backup/schema check, deploy only the three reviewed pending migrations. No database change has been performed. Do not reset, delete, or manually edit migration-history rows.

### Additional browser acceptance — 2026-10-30 09:10 IST

- Marketplace governance browser tests: 4/4 passed — Admin blacklist apply/revoke, buyer sandbox chargeback, seller HTTPS evidence submission, and explicit consent before linking order context to owned Farm/Crop records.
- Selected mocked browser acceptance now totals 10/10 across Farm archive/restore, cross-module Inventory/Finance/Notifications/Reports, Marketplace buyer/seller workspace, Shop (3), and Marketplace governance (4).
- Runtime health checks: UI HTTP 200 and API health HTTP 200. These are local development health checks, not production monitoring or DB-backed role acceptance.

## Canonical sequential module execution standard — 2026-10-30

The canonical order, work-package boundaries and current execution ledger are maintained in . The operating rule is one active module at a time: complete Registry, authorization, backend, transaction/lifecycle, audit/history/provenance, frontend states, authenticated DB-backed tests, cross-module regression, builds/runtime, documentation and CBA before moving on. Avoid routine permission loops and speculative detours. Preserve user data, DB volumes, migration history and backups. Clean only verified duplicates/generated clutter; archive unique historical checkpoints rather than discarding project history. Update the root timestamped execution checkpoint at least every 20 minutes and report verified evidence, not implied background progress.

The sequence is: close the active Store + Farm release candidate; Platform/Registry/Authorization/Admin; Identity/Auth/Users/Organizations; Audit/History/Provenance; Farm stack; Inventory; Finance; Marketplace/Shop; shared product services; AI Platform; Security/Production Operations; then later Agri/Education breadth. The module-specific completion gate is defined in the canonical plan. Live money movement, irreversible deletion and external sharing remain gated by explicit safety/legal/compliance requirements.

## Store + Farm database-backed acceptance — 2026-10-30 09:34 IST

- Post-migration backend regression: 71 suites / 710 tests passed. Backend Nest build completed successfully; frontend TypeScript/Vite production build exit 0 (existing 522.89 kB main chunk warning remains).
- Full backend DB E2E: 4 suites / 28 tests passed. This includes 25 existing authenticated Farm/Crop/Livestock/Intake/API journeys plus 3 new live-DB workflows: Farm create/archive/restore, FarmAsset create/archive/restore, and Marketplace public Q&A/private sample-request visibility and seller answers.
- The DB E2E harness now creates one Nest application per suite and uses a 30-second integration timeout; the intake atomicity fixture now expresses an explicit planting intent rather than a bare crop mention.
- FarmAsset Registry now declares RESTORE and softDelete semantics. God Mode audited capability policy enables FARM-scoped FARMER restore and GLOBAL ADMIN/SUPER_ADMIN restore. Marketplace listing-question CREATE/OWN is enabled for active participant roles via audited God Mode policy. Test fixture rows are cleaned up after each run.
- Mocked browser acceptance previously passed 10/10 across Farm, cross-module services, Marketplace, Shop and governance. A final repeat is running after the migration deployment.
- Prisma status is up to date at 59 migrations. No database reset or manual migration-history edits were performed. The old rolled-back migration row remains preserved.
- Store + Farm are ready for CBA promotion once the final browser repeat and clean diff review are recorded. Next active work package after promotion: Platform / Registry / Authorization / Admin closure, per the canonical execution plan.

## Final Store + Farm verification — 2026-10-30 09:40 IST

- Post-migration backend unit suite: 71/71 suites, 710/710 tests passed.
- Backend Nest build passed (the sequential build gate advanced to frontend). Frontend TypeScript/Vite production build exit 0; the 522.89 kB main chunk warning is non-fatal and tracked as a later performance task.
- Authenticated live PostgreSQL E2E: 4/4 suites, 28/28 tests passed.
- Final browser acceptance after migration deployment: 10/10 passed across Farm lifecycle, cross-module Inventory/Finance/Notifications/Reports, Marketplace buyer/seller workspace, Shop browse/compare/cart/buyer profile, listing discovery, Admin blacklist, sandbox chargeback buyer/seller evidence, and consented Farm/Crop context linking.
- Prisma: 59 migrations found; schema up to date. Pre-migration full DB dump was verified readable. Historical rolled-back duplicate migration row remains intact; no reset or manual migration-history edits.
- Store + Farm are READY FOR CBA PROMOTION. After promotion, next active module is Platform / Registry / Authorization / Admin. Do not divert to AI or later breadth until this module passes its own gate.

## Shop storefront compact discovery and progressive-scroll standard - 2026-10-30 22:54:05 IST

- Keep /app/shop as the shopper-first storefront and /app/marketplace as the separate seller/provider, operations and governance workspace. Do not replace or disrupt individual listing detail pages or seller workflows.
- Large-catalog density is a product acceptance requirement: responsive grid is 2 columns by default/mobile, 3 at small screens, 6 at large screens, 8 at XL, and 10 at 2XL. The wide-screen 8-10 column target must not be forced onto narrow screens. Cards stay compact with lazy-loaded media, concise title/seller/price/actions, and a grid/list view switch.
- Listings remain grouped by Today, Yesterday, Day before yesterday, This week, Last week and Older. Search/category/type/sort filters reset the visible window.
- Progressive discovery loads the next 24 items when the scroll sentinel approaches the viewport (500px root margin), while retaining a manual "Load 24 more" fallback for accessibility and deterministic navigation. Do not eagerly render an unbounded catalogue in one batch.
- Acceptance must verify computed column counts at 1600px (10), 1280px (8) and mobile 390px (2), plus a 50-listing catalogue loading progressively to all 50 without repeated manual page navigation. Preserve external-content policy: when disabled, external media/embeds/link-outs remain suppressed while approved local uploads continue to render.
- 2026-10-30 verification: frontend production build passed (main bundle 522.86 kB, 162.04 kB gzip; existing >500 kB chunk warning remains non-fatal); Shop Playwright acceptance passed 4/4, including buyer profile/cart, non-product workflow, external-media-off/local-upload behavior, responsive 10/8/2-column rendering and progressive 50-item loading; git diff --check passed.
- Runtime recovery verification: Docker Server 29.8.2 responds; krishikendram-postgres is Up; pg_isready accepts connections; read-only SELECT confirms database krishikendram; API /api/v1/health and UI root return HTTP 200. No database writes, schema changes, migrations, Docker resets or volume operations were performed in this continuation.
- This is a verified Shop UI refinement, not a declaration that the entire Store/Marketplace module is production COMPLETE. Existing Finance/Marketplace working-tree changes and backups remain preserved; no commit or push was performed. Continue the CBA review only after reviewing all intended diffs and the module's remaining release gates.

## Store and Shop final regression and release checkpoint - 2026-10-30 23:07:39 IST

- Full backend Jest regression: 71 suites / 711 tests passed, including Finance authorization and audit coverage.
- Full frontend Playwright regression: 27/27 passed, including Shop buyer/cart/profile, non-product discovery, external-media policy, responsive 10/8/2-column layout, 50-listing progressive loading, Marketplace journeys and core module/voice journeys.
- Focused Finance service regression: 5/5 passed. Backend Nest build passed. Frontend production build passed; main bundle 522.86 kB (162.04 kB gzip), with the existing non-fatal >500 kB chunk warning.
- Shop-specific browser acceptance: 4/4 passed. Prisma migrate status: 59 migrations found; database schema is up to date. The canonical module execution plan records migration reconciliation, authenticated database-backed acceptance (4 suites / 28 tests) and Store/Farm browser acceptance (10/10) as complete.
- Runtime: Docker Server 29.8.2 responds; krishikendram-postgres is Up and accepting connections; API /api/v1/health and frontend root return HTTP 200.
- The old early-00:xx / 04:xx notes describing the duplicate failed migration and pending Store migrations are historical checkpoints, superseded by the later 09:34/09:40 reconciliation and acceptance record. Preserve the old entries as history; do not treat them as current blockers.
- Store/Shop compact catalog requirement: 2/3/6/8/10 responsive columns, lazy media, 24-item progressive loading and manual fallback. The full browser suite verifies actual rendered columns and all 50 sample listings.
- Release safety remains: real payment capture/refund/payout, tax remittance and production external-provider activation are disabled pending qualified provider/security/legal/accounting review. This does not block the verified code-only CBA promotion.
- No database writes or migrations were performed in this continuation. No Docker reset or volume operation. No recovery backup was staged.
- CBA is the remaining promotion step for this working-tree delta. Stage only the nine intended tracked files plus this checkpoint and required canonical documentation; exclude .cto-backup and *.cto-backup-* artifacts.\n