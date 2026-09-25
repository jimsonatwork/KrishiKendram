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

### Current execution position

R1 authorization/capability integration is treated as CLOSED.

The UsersService Field Policy migration segment has now been completed and verified.
The next controlled activity is the Registry / Authorization foundation verification
defined by PMD v0.3.

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

**Current position: RECOVERY — REGISTRY / AUTHORIZATION VERIFICATION**

UsersService Field Policy migration is complete for the current implementation segment.

Evidence:
- Registry resource-field validation is now used for User create, update, restore-version, bulk-delete status transition, and restore status transition paths.
- Focused UsersService tests: 10/10 PASS.
- Related Users/Registry/Auth tests: 72/72 PASS.
- Full backend regression: 23/23 suites, 280/280 tests PASS.
- TypeScript build configuration check: PASS (tsc -p tsconfig.build.json --noEmit).

Next controlled activity:

**Verify the Registry / Authorization foundation against PMD v0.3; redesign only if a genuine gap is evidenced.**

This closes the current UsersService validation migration segment without declaring the entire Users module COMPLETE.

No new feature branch or architecture expansion should start until that
inventory is accepted.

### Resume rule

When execution stops, this section must identify the exact next segment.

Example:

> Users → History → restore flow → integration validation

The phrase **"continue"** must always resume from this recorded position unless
a new decision is explicitly made.

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
