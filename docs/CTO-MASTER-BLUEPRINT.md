# KrishiKendram — CTO Master Blueprint

> **Living source of truth for product vision, architecture, scope, roadmap,
> implementation status, development guardrails, and architectural decisions.**
>
> This document must be updated at meaningful Git/versioning milestones and
> immediately when a major architectural decision changes.

---

# 0. Current CTO State

| Item | Current State |
|---|---|
| Repository | `/home/jj/Dev/KrishiKendram` (active WSL repo) |
| Branch | `main` |
| Current checkpoint | V0.5.28 Relationship-Aware FarmAsset Ownership Enforcement |
| Current checkpoint message | V0.5.28 Relationship-Aware FarmAsset Ownership Enforcement |
| Current primary phase | V0.5.28 — Product-domain completion |
| Current platform priority | Concrete lifecycle coverage → authorization correctness → UI/runtime integration → release readiness |
| Working-tree state at blueprint creation | Checked at each meaningful checkpoint |
| Development mode | Incremental, reversible, test-driven |
| Next major target | Continue concrete product-domain/runtime gaps without reopening established foundations |

## Current Status

### Complete / Established

- Phase 0 baseline/checkpoint process.
- NestJS + Prisma + PostgreSQL backend foundation.
- React/Vite frontend foundation.
- Authentication baseline.
- RBAC baseline.
- Registry resource definitions.
- Registry field definitions and validation foundation.
- Central Field Policy validation/normalization foundation.
- Authorization persistence foundation.
- Resource authorization foundation.
- Field-level authorization foundation.
- Farms authorization/validation migration.
- Farm Asset authorization/validation migration.
- Farm Record authorization foundation.
- Crop authorization/validation migration.
- Intake authorization-before-extraction flow.
- Canonical crop persistence through `CropsService.createFromIntake`.
- Users validation through shared Field Policy helper.
- Auth registration validation through shared Field Policy helper.
- Super Admin administrative protections currently implemented.
- Transfer lifecycle workflow now exposes pending administrative approvals through an authorization-checked API and History workspace UI.
- Existing authorization tests currently passing: 56/56.
- Backend full test suite currently passing: 330/330.
- Frontend production TypeScript/Vite build currently passing.

### Current Architectural Position

Authorization core is considered an **established foundation**, not an area
for unnecessary rewrite.

### 2026-09-26 Major Lifecycle Checkpoint

The platform now explicitly treats **member identity, resource identity,
ownership, farm association, and movement as separate concerns**. A person may
exist without a farm and a resource may be owned by a member without requiring
a farm as the ownership container.

Implemented foundation:

- Permanent `User.memberId` identity anchor using `IN-` + 10 digits.
- Existing users backfilled with stable member IDs.
- `ResourceTransferRequest` persisted as a governed workflow object.
- Source owner initiates a transfer request; destination member can accept or
  reject it.
- Source member can cancel a pending request.
- Authorized administrators can approve a pending request.
- Accepted/approved requests execute the existing temporal ownership,
  movement, and evidence lifecycle rather than directly rewriting ownership.
- Farm ownership transfer also updates the canonical `Farm.ownerId` field.
- Quantified partial FarmAsset transfer is implemented atomically through split + transfer lifecycle semantics.

Architectural rule:

> A transfer request is a workflow; the transfer itself is a governed change to
> resource relationships. Ownership is not represented by editing a farm or
> member profile.

### 2026-09-28 V0.5.24 A/B/C Promotion Recovery Checkpoint

The documented A/B/C repository posture has been restored from the canonical checkpoint. Integration and Development remotes were promoted to the exact canonical commit, while their previous states were preserved as recovery tags; Development uncommitted work was preserved in a local stash before promotion.

Validation:
- Canonical, Integration, and Development were verified at the same promoted checkpoint before this documentation checkpoint.
- Integration recovery tag: `pre-v0.5.23-integration-promotion` → `6c6c626`.
- Development recovery tag: `pre-v0.5.23-development-promotion` → `dc7c6fc`.
- Development pre-promotion working tree is preserved in the local promotion-recovery stash.
- No destructive history loss was introduced; promotion used force-with-lease after explicit preservation.

### 2026-09-28 V0.5.23 Relationship Child Access Verification Checkpoint

Relationship-aware Farm access and FarmAsset/Crop child authorization/history surfaces were re-audited against the canonical services, controllers, and access policy. The established FarmAccessService resolves active relationship-backed access before the owner fallback, and FarmAsset/Crop history endpoints remain authorization-protected. No additional authorization abstraction is required.

Validation:
- Focused backend regression: 5 suites / 100 tests passed.
- Canonical Git worktree is clean and synchronized with origin/main before this checkpoint.
- A/B/C promotion was not falsely marked complete: the current Git worktree list exposes only the canonical main worktree, so Integration/Development promotion infrastructure remains a separate process prerequisite.

### 2026-09-28 V0.5.22 Contextual History Navigation Checkpoint

Farm and Crop workspaces now provide direct navigation into the shared History workspace with the selected farm/crop name prefilled as the timeline search query. This keeps lifecycle history centralized while removing a navigation gap between operational detail and the unified audit/history view.

Validation:
- Frontend TypeScript/Vite production build passed.
- git diff --check passed.
- Existing bundle warning remains isolated as a separate performance/code-splitting task; no risky global bundling change was introduced.

### 2026-09-28 Unified Timeline Discovery Checkpoint

The History workspace now provides a single searchable and filterable view across farm, crop, record, and lifecycle events. This is a presentation-layer completion step over the already established movement, lineage, relationship, evidence, and history APIs; no new domain abstraction was introduced.

Validation:

- Frontend TypeScript build passed.
- Frontend production Vite build passed.
- Relationship/lifecycle regression: 13 suites / 52 tests passed.
- `git diff --check` passed.

### 2026-09-28 Transfer Administration Checkpoint

The existing transfer workflow already supported administrator approval in the service layer, but the platform did not expose a safe administrative pending queue to the frontend. This checkpoint closes that integration gap without changing the established ownership/movement/evidence model.

Implemented:

- Authorization-checked administrative pending transfer query.
- Frontend API contract for pending administrative transfers.
- History workspace approval queue for privileged roles.
- Approval action wired to the existing atomic transfer completion lifecycle.
- Focused transfer tests expanded to cover privileged listing and regular-member denial.
- Full backend validation: 36 suites / 330 tests passed.
- Frontend production build passed.

Architectural guardrail: administrative approval remains a workflow action; it does not bypass the canonical relationship, movement, lineage, evidence, audit, or authorization services.

The current execution frontier is V0.4 concrete lifecycle adoption:

```text
Existing platform primitives
        ↓
Concrete business lifecycle
        ↓
Authorization + relationship + movement/evidence/lineage
        ↓
Focused tests + frontend exposure
        ↓
Git checkpoint + execution-record synchronization
        ↓
Next concrete lifecycle
```

The Registry → Capability → Permission → Authorization foundation is established and should not be reopened without evidence of a real gap.

---

# 1. Product Vision

KrishiKendram is intended to become a:

**production-grade, open-source, modular agricultural platform**

It is not intended to remain a simple CRUD application.

The platform should support an expanding agricultural ecosystem including:

- Farmers
- Agricultural experts
- Service agents
- Spare-parts/service providers
- Pesticide/pharma-related participants
- Future agriculture ecosystem roles

The platform must be:

- Secure
- Scalable
- Modular
- Cross-device
- PWA-oriented
- AI-ready
- History-aware
- Transaction-aware
- Authorization-aware
- Extensible without repeated architectural rewrites

---

# 2. AI Direction

The platform should eventually support AI interactions through:

- Text
- Voice
- Photo/image
- Document scanning
- Mixed inputs
- Later video

AI must operate through the same security and authorization boundaries as
normal application functionality.

Target flow:

```text
User
 ↓
Authentication
 ↓
Authorization
 ↓
Permitted Data / Context
 ↓
AI Abstraction Layer
 ↓
AI Provider
 ↓
Audited Result
```

AI must never receive unrestricted historical, farm, personal, business, or
other protected data merely because an internal service can access it.

---

# 3. Product UX Direction

Target experience:

- Compact
- Secure
- Futuristic
- Fast
- Low-friction
- Responsive
- Cross-device
- PWA-like
- Capability-aware

Themes currently envisioned:

- `krishi`
- `ocean`
- `harvest`
- `midnight`

The application should feel like an actual product rather than an exposed
backend CRUD interface.

---

## V0.5 Frontend Policy — Platform-Controlled UI Foundation

The frontend is governed by a central platform policy so backend evolution and
frontend evolution remain contract-driven rather than requiring screens to be
dismantled and refitted.

### Policy Ownership
The platform control plane is the canonical owner of Module, Resource, Field,
Validation/Normalization, Capability/Authorization, UI, Navigation,
Dependency, Segment and Lifecycle/History contracts. The frontend consumes
these contracts and must not become the hidden owner of backend business rules.

### Centralized Field Policy
Every registered field should centrally define stable identity, type,
required/optional state, nullability, limits, allowed values, defaults,
search/sort behavior, label/help text, control hints, visibility/editability,
sensitivity, normalization and dependencies. Backend validation remains the
final authority; frontend validation is an adapter over this canonical
contract, never a second business-validation system.

### Layered UI Policy
Canonical Field Policy flows through Global/Default -> Module -> Screen/
Workspace -> Segment/User-Context -> Runtime Authorization. Overrides may
control visibility, editability, required state, ordering, grouping, control
type, help and contextual restrictions, but never replace authorization.

### Inclusive Segment UI
Different roles, user categories, module audiences and operational contexts
must be supported without duplicating screens. Example: FarmAsset.quantity
can be globally numeric/minimum-zero, required on create, constrained by
available quantity on transfer, and read-only on lease screens.

### Module Attach / Detach
Modules declare identity, enabled state, dependencies, resources, capabilities,
permissions, navigation, UI policies and lifecycle/history participation.
**Detach means disable, not delete:** hide navigation/block new operations
while preserving data, relationships, movements, evidence, lineage and history.
Reactivation must remain possible.

### Super Admin Platform Control
Super Admin must have governed platform-wide inspection of every registered
resource, including parent/child records, relationships, ownership/custody/
lease, movements, evidence, lineage, history, dependencies, authorization,
field policy and module membership. Capability-driven actions may include
View/Create/Edit/Delete/Archive/Restore/History/Dependencies/Relationships/
Transfer/Assign/Lease-Return and controlled temporary restrictions.
AuthorizationService remains the final enforcement point.

### Dependency-Aware Administration
Before change/delete, expose registered parents, children, active/historical
relationships, movements, evidence, lineage and cross-resource references.
Distinguish permitted, permitted-with-warning, lifecycle-first and invariant-
blocked operations. This must be server-enforced, not just a UI dialog.

### Contract-Driven Navigation and Actions
Avoid scattered hardcoded role checks. Navigation, buttons, actions and field
editability consume centralized capability/policy results. Frontend checks
improve UX only; backend authorization remains authoritative.

### Stable Frontend Contract Boundary
Before UI work: inspect domain behavior; confirm Registry resources/fields;
confirm authorization; confirm lifecycle/history; confirm DTO/API contract;
define frontend TypeScript contract; connect centralized field-policy
adapters; reuse generic controls; add specialized UI only for genuine domain
behavior; run focused tests/build/runtime verification; checkpoint and sync
Blueprint/Bible/Changelog. The UI is the final consumer, not the contract owner.

### Generic vs Specialized UI
Shared controls cover common field rendering, validation, capabilities,
history, relationships, dependencies, evidence, movements and standard
states. Specialized controls remain for genuine workflows such as FarmAsset
split, transfer, lease and crop-specific operations.

### V0.5 Guardrails
Extend existing Registry, Authorization, Relationship, Movement, Lineage and
History foundations. Do not add a second authorization/validation engine,
speculative rules engine, duplicate lifecycle model, frontend-only security,
or module deletion-as-disablement. Prefer lightweight contract adapters and
reusable metadata over heavy code generation/configuration.

# 4. Core Architecture Principle

## Centralize ownership, modularize implementation.

Every important platform rule should have one canonical owner.

Examples:

### Validation

```text
Field Policy
    ↓
Canonical validation + normalization
    ↓
Frontend / API / Service / Future Modules
```

Do not create competing validation definitions with subtly different rules.

### Authorization

```text
Authorization
    ↓
Registry / Field Policy validation
    ↓
Normalization
    ↓
Mutation
```

Protected data must not be extracted or mutated before authorization.

---

# 5. Platform Layers

## Layer 1 — Application

Frontend experience:

- React
- Vite
- Tailwind
- shadcn
- Zustand
- React Hook Form
- Responsive/PWA architecture

## Layer 2 — Module

Business modules:

- Users
- Farms
- Crops
- Intake
- Assets
- Farm Records
- Future agricultural modules

## Layer 3 — Platform

Cross-cutting capabilities:

- Authentication
- Authorization
- Registry
- Field Policy
- Metadata
- Provenance
- Audit
- History
- Capability system
- API architecture
- Route architecture

## Layer 4 — Domain

Agriculture/business behavior.

## Layer 5 — Data

- PostgreSQL
- Prisma
- History/version records
- Audit records
- Provenance
- Relationships

## Layer 6 — Infrastructure

- Docker
- Development tooling
- Deployment
- Backups
- Logging
- Integrations

---

# 6. Security Foundation

Security is a permanent architectural requirement.

Protect:

- Passwords
- Access tokens
- Refresh tokens
- Personal data
- Business data
- Farm data
- Files
- Browser storage
- API traffic
- Logs
- Backups
- Third-party integrations

Security must be considered across:

```text
Web
Mobile
Desktop
API
Browser
Network
Logs
Backups
Integrations
```

Security must be designed into the platform rather than retrofitted after
feature development.

---

# 7. Data and History Foundation

The platform must eventually support:

- Immutable audit
- Provenance
- Original input preservation
- Correction
- Reversal
- Versioning
- Soft deletion
- Permanent deletion
- Retention
- Recovery
- Authorization-aware recall
- Temporal reconstruction
- Farm Timeline
- Creator attribution
- Updater attribution
- Deleter attribution
- Source attribution

Sources should distinguish:

- HUMAN
- SYSTEM
- AI
- IMPORT
- API

AI context must pass through authorization.

---

# 8. Field Platform

The Field Platform is the canonical owner of field-level behavior.

## Field Policy

Should support:

- Type
- Required/optional
- Length
- Format
- Enum
- Normalization
- Sanitization
- Security rules
- Contextual restrictions

## Field Metadata

Target metadata includes:

- Display label
- Description
- Category
- UI hints
- Sensitivity
- Searchable
- Sortable
- Filterable
- AI-readable
- AI-writable

## Field Provenance

Eventually track:

- Original input
- Normalized value
- Source
- Actor
- Timestamp
- Transformation
- Correction/version history

---

# 9. Authorization Architecture

Current persisted authorization models:

- `Permission`
- `RolePermission`
- `AccessGrant`
- `FieldPermission`

Current authorization flow:

```text
AuthorizationService.authorize()
             ↓
      resource decision
             ↓
      exact permissionId
             ↓
FieldPolicyEvaluationService
             ↓
       field decision
```

## Current implemented scopes

- GLOBAL
- OWN
- FARM

## Declared but not yet implemented

- ASSIGNED
- ORGANIZATION
- SHARED
- PUBLIC

Unsupported scopes must fail closed until their actual relationship semantics
and data model exist.

## Current authorization status

The core AuthorizationService remains the established authorization decision
engine.

The current capability/persistence milestone is complete:

- Registry resource definitions declare CRUD capabilities.
- PermissionService owns Permission persistence.
- PermissionService owns RolePermission reconciliation.
- AuthorizationModule provides PermissionService.
- Seed capability persistence uses PermissionService rather than direct
  Prisma persistence.
- ADMIN and SUPER_ADMIN receive GLOBAL CRUD permissions derived from
  registered resource capabilities.
- FARMER receives the resource's declared ownership scopes.
- Existing authorization behavior remains in AuthorizationService.

Verification at checkpoint `32b502d`:

- Authorization regression suite: 56/56 tests passed.
- PermissionService focused suite: 4/4 tests passed.
- Registry/capability regression coverage passed.
- Production build passed.
- Seed verification: 44 Permission rows.
- Seed verification: 84 RolePermission rows.
- Logical permission duplicates: 0.

The next integration step is connecting persisted capabilities more directly
to authorization behavior without rewriting the established
AuthorizationService core.

## Current authorization gaps

### 1. Unsupported scopes

The four scopes above are declared but intentionally fail closed.

Do not implement them without defining their real relationship semantics.

### 2. Capability architecture

Registry resource definitions now declare supported capabilities.

The platform capability flow is:

Registry resource definition
→ declared capability
→ PermissionService persistence
→ Permission
→ RolePermission / AccessGrant
→ AuthorizationService

Permission persistence is owned by PermissionService rather than duplicated
in seed/application code.

Registered resources declaring CRUD capabilities automatically participate in
the administrative capability model. ADMIN and SUPER_ADMIN receive GLOBAL
CRUD permissions for those declared capabilities, while FARMER receives the
resource's declared ownership scopes.

This is the foundation for platform-driven administrative capability. The
remaining work is stronger runtime integration between persisted capabilities
and authorization behavior.

### 3. Permission → Authorization integration

Persisted Registry capabilities now have a platform owner through
PermissionService. The remaining work is to integrate those persisted
capabilities more directly with AuthorizationService while preserving
the existing authorization engine, scope semantics, and fail-closed
behavior.

### 4. Domain-specific scope resolution

`AuthorizationService` currently resolves FARM scope through a Farm query.

This is acceptable for current behavior.

Long-term, scope/resource resolution should be generalized so that the
authorization engine does not accumulate domain-specific queries.

### 5. Field transformations

MASK / REDACT / AGGREGATE / TRANSFORM are represented and evaluated.

Actual response transformation belongs to a later data/response security layer.

---

# 10. Registry Architecture

Registry is intended to become the platform source of truth for modules,
resources, fields, and capabilities.

Target responsibilities:

- Module definition
- Module lifecycle
- Resource definition
- Resource registration
- Field definition
- Field policy
- Capability definition
- Permission/capability integration
- Dependency registration
- Versioning
- Lifecycle state
- Administrative capability generation

Target conceptual structure:

```text
Module
 ├── Resources
 │    ├── Fields
 │    └── Capabilities
 │
 ├── Dependencies
 └── Lifecycle
```

New modules should not require repeated manual implementation of every
cross-cutting platform capability.

---

# 11. Super Admin Architecture

Super Admin must have complete administrative capability over the platform,
subject to explicit security safeguards.

Current behavior:

- ADMIN and SUPER_ADMIN receive GLOBAL CRUD for registered resources whose
  Registry definition declares the corresponding CRUD capability.
- User administration has additional explicit platform permissions.
- Super Admin safety protections remain in UsersService.

Target:

**New registered resources automatically participate in the administrative
capability model.**

This should be implemented through Registry/Capability architecture rather
than an ever-growing manually maintained list.

---

# 12. Audit Architecture

Target: one unified platform audit system.

Audit should capture, where applicable:

- Actor
- Action
- Resource
- Resource ID
- Source
- Request context
- Before state
- After state
- Provenance
- Security-sensitive redaction

Potential sources:

- HUMAN
- SYSTEM
- AI
- IMPORT
- API

Legacy/duplicate audit implementations should be retired only after safe
migration.

---

# 13. Authentication Architecture

Current authentication is functional.

Target:

- Secure API client
- Session manager
- Refresh-token flow
- Credential protection
- Logout/revocation
- Frontend session restoration
- Cross-device support
- Elimination of unsafe credential-storage patterns

Password policy remains centrally defined.

---

# 14. Domain Migration

The migration must preserve:

```text
Authorization
     ↓
Validation
     ↓
Normalization
     ↓
Mutation
```

## Farms

Largely migrated.

## Farm Assets

Ownership/CRUD foundation migrated.

## Farm Records

Authorization/field-policy foundation established; migration continues.

## Crops

Largely migrated.

Canonical intake persistence:

```text
IntakeService
     ↓
CropsService.createFromIntake()
     ↓
Crop persistence
```

## Intake

Partial migration.

Authorization happens before:

- extraction
- sensitive payload processing
- persistence delegation

---

# 15. Frontend Architecture

Target:

```text
App
 ├── Route Registry
 ├── Capability-driven Navigation
 ├── Module APIs
 ├── Shared Forms
 ├── Shared Field Policy
 ├── Zustand Stores
 └── Domain Pages
```

Eventually eliminate:

- Duplicated validation
- Scattered role checks
- Manual pathname routing
- Giant page components
- Monolithic API layers

Frontend restructuring must be incremental and driven by actual platform
requirements.

---

# 16. Phase Roadmap

## PHASE 0 — BASELINE

- Git checkpoint
- Build
- Tests
- Environment verification

**Status: COMPLETE**

---

## PHASE 1 — FIELD PLATFORM

- Field Policy
- Validation engine
- Normalization
- Field Metadata
- Field Provenance

**Status: Substantially established**

Remaining:

- Broader Field Metadata
- Full Field Provenance foundation

---

## PHASE 2 — AUTHORIZATION

- Complete scopes
- Resource authorization
- Field authorization
- Super Admin global capability
- Permission uniqueness
- Access grants

**Status: Core foundation established**

Remaining:

- Registry/Capability integration
- Generic scope resolution
- Future scope implementations when domain semantics exist

---

## PHASE 3 — REGISTRY / CAPABILITY

- Module definition
- Resource registration
- Module lifecycle
- Dependencies
- Capability registration
- Permission integration
- Automatic Super Admin capability

**Status: ACTIVE — INTEGRATION UNDERWAY**

### Immediate objective

Connect persisted Registry capabilities to the established AuthorizationService
so authorization can consume the platform capability model without rewriting
the existing authorization engine.

Completed foundation:

- Registry declares resource capabilities.
- PermissionService owns Permission persistence.
- PermissionService owns RolePermission reconciliation.
- Seed derives administrative CRUD permissions from registered capabilities.
- Existing authorization tests and build remain green.

Next block:

- strengthen Permission → Authorization integration,
- verify capability persistence and authorization behavior together,
- preserve GLOBAL / OWN / FARM semantics,
- keep unsupported scopes fail-closed,
- avoid duplicate authorization logic.

---

## PHASE 4 — AUDIT

- Unified platform audit
- Redaction
- Mutation integration
- Request/source context
- Legacy audit retirement

**Status: PARTIAL**

---

## PHASE 5 — USERS

- Users → Field Policy
- Users → Authorization
- Users → Audit
- Users → History
- Users → Registry
- Super Admin rules

**Status: SUBSTANTIAL**

Recent completed migration:

- Users validation through shared Field Policy helper.

---

## PHASE 6 — AUTH

- API client
- Session manager
- Refresh flow
- Secure credentials

**Status: FUNCTIONAL / HARDENING REMAINS**

---

## PHASE 7 — DOMAIN

- Farms
- Crops
- Intake
- Assets
- Farm Records

**Status: ACTIVE MIGRATION**

---

## PHASE 8 — FRONTEND PLATFORM

- API architecture
- Module APIs
- Capability-driven navigation
- Route Registry
- Shared forms
- Validation consolidation

**Status: LATER PLATFORM PHASE**

---

## PHASE 9 — FINAL HARDENING

- Security audit
- Field-policy tests
- Authorization matrix
- Module lifecycle tests
- API integration tests
- Critical UI workflows

**Status: LATER**

---

# 17. Development Guardrails

## Rule 1 — Do not gold-plate

If an implementation is correct for the current architectural stage:

**KEEP IT.**

Do not refactor merely because it could theoretically be cleaner.

## Rule 2 — Fix forward

Prefer:

```text
Small architectural correction
        ↓
Focused tests
        ↓
Build
        ↓
Git checkpoint
        ↓
Next layer
```

over large rewrites.

## Rule 3 — Evidence before change

For an unfamiliar subsystem:

```text
Inspect enough
    ↓
Decide
    ↓
Implement
```

Do not investigate every possible edge case before making a safe,
well-supported implementation.

## Rule 4 — No behavior regression

Unless behavior is intentionally changing:

- Preserve authorization
- Preserve validation
- Preserve normalization
- Preserve ownership
- Preserve API contracts
- Preserve meaningful existing tests

## Rule 5 — Test with the change

Related implementation and tests should move together.

Prefer focused batches of up to approximately five related files/suites.

## Rule 6 — Checkpoint coherent versions

At meaningful milestones:

```text
Implement
 → Test
 → Build
 → Verify
 → Git checkpoint
 → Update Blueprint
 → Update Changelog
 → Reassess
```

## Rule 7 — Stop unnecessary deep investigation

Ask:

> Do we have enough evidence to safely implement the next required
> architectural step?

If yes:

**STOP INVESTIGATING → IMPLEMENT.**

If no:

Investigate only the missing decision.

---

# 18. Change Classification

Every significant architectural finding should be classified as one of:

### KEEP

Already correct.

### MODIFY

Correct architecture but implementation is incomplete or incorrect.

### ADD

Missing capability required by the blueprint.

### MERGE

Duplicate implementations should have one canonical owner.

### MOVE

Implementation belongs in another architectural layer.

### RETIRE

Legacy implementation no longer belongs after migration.

---

# 19. Current Git Baseline

Current verified checkpoint:

```text
e83bff5  Integrate temporal relationships with Farm lifecycle
7d6904b  Add RelationshipEvidence foundation
9b14cd3  Add ResourceLineage foundation
7750fc6  Add ResourceMovement foundation
7dfe070  Complete UsersService field policy migration
5a7921c  Add first-class registry capability contracts
c019c1b  Add CTO master blueprint and architecture control docs
a061cc3  Refactor Auth validation through shared helper
```

This blueprint is currently aligned with checkpoint:

```text
e83bff5
```

The current engineering frontier is:

**Farm integration → relationship-aware lifecycle semantics → authorized history UI**

The product-direction baseline remains PMD v0.2 — 23 Sep 2026.
# 20. Versioning Protocol

The blueprint is a living document.

It should be refreshed:

### Mandatory

- At each coherent architectural Git checkpoint
- After a phase milestone
- After a major architecture correction
- After a significant scope change
- After retiring/replacing a platform component

### Not mandatory

- Every tiny bug fix
- Every individual file edit
- Every test-only correction
- Every temporary development state

The goal is to represent **stable project reality**, not every intermediate
state.

---

# 21. CTO Status Template

Use this format when resuming major work:

```text
KK CTO STATUS
────────────────────────────
Version:
Git checkpoint:

Current Phase:
Current Layer:
Current Objective:

Done:
- ...

In Progress:
- ...

Remaining:
- ...

Next:
- ...

Git:
- clean / modified
- checkpoint: ...

Guardrails:
- authorization first
- canonical validation
- no behavior regression
- no unnecessary deep audit
```

---

# 22. Do Not Do Now

Unless new evidence changes the plan:

- Do not rewrite AuthorizationService.
- Do not implement unused authorization scopes prematurely.
- Do not perform broad validation audits.
- Do not refactor working services without architectural need.
- Do not build frontend capability navigation before the platform capability
  foundation is ready.
- Do not replace working Registry/Authorization infrastructure merely for
  theoretical purity.
- Do not perform destructive database/container operations without review.
- Do not weaken tests to make a migration pass.

---

# 23. Immediate Next Objective

## Permission → Authorization Integration

The Registry → Capability → Permission persistence foundation is complete.

The next engineering block is to connect persisted capabilities more directly
to the established AuthorizationService.

Target flow:

```text
Registry Module Definition
        ↓
Registered Resource
        ↓
Declared Capability
        ↓
PermissionService
        ↓
Permission
        ↓
Role / Grant
        ↓
AuthorizationService
```

Primary requirements:

- preserve the established AuthorizationService engine;
- persisted permissions represent Registry-declared capabilities;
- administrative CRUD capability remains platform-driven;
- GLOBAL / OWN / FARM behavior remains correct;
- unsupported scopes remain fail-closed;
- capability persistence and authorization behavior receive targeted tests;
- no duplicate authorization engine is introduced.

The immediate goal is stronger platform integration, not a rewrite of
AuthorizationService.
# 24. Definition of Architectural Success

A platform layer is considered complete only when:

1. Its canonical ownership is clear.
2. Its implementation is reusable.
3. Existing behavior is preserved unless intentionally changed.
4. Authorization boundaries are enforced.
5. Validation/normalization remains centralized.
6. Tests cover the important behavior.
7. The layer integrates with Registry where appropriate.
8. Super Admin capability is handled consistently.
9. Audit/history/provenance requirements are not bypassed.
10. The implementation is represented accurately in this blueprint.

---

# 25. Golden Rule

> **Build the platform underneath the features, not a pile of features that
> later needs to become a platform.**

When the architecture is already correct:

**KEEP.**

When it is incomplete:

**MODIFY.**

When something is missing:

**ADD.**

When ownership is duplicated:

**MERGE.**

When something belongs elsewhere:

**MOVE.**

When legacy infrastructure has been safely replaced:

**RETIRE.**

Always move the project forward.

---

# CTO V0.3 ARCHITECTURE AMENDMENT

**Date:** 25 September 2026
**Status:** ACTIVE
**Architecture Version:** V0.3
**Relationship to V0.2:** Additive evolution. V0.2 remains the baseline except where this amendment explicitly extends or supersedes it.

## 1. V0.3 Purpose

KrishiKendram V0.3 is a controlled architectural evolution, not a platform rewrite.

The existing Registry, Authorization, Audit, History/Provenance, Prisma, backend services, frontend infrastructure, security model, and domain modules remain valid foundations.

The governing implementation principle is:

> **Fix while upgrading. Extend while preserving. Migrate only when the replacement is proven.**

V0.3 introduces a stronger model for real-world resource relationships, ownership changes, leases, custody, operational access, transfers, partial transfers, lineage, and evidence.

## 2. V0.3 Architectural Direction

The platform will progressively introduce four complementary capabilities:

1. **Resource Relationship**
   - Who is related to a resource?
   - What is the relationship?
   - When did it start and end?
   - What is its current status?

2. **Resource Movement**
   - What business event changed the resource relationship or location?
   - Sale, transfer, lease, inheritance, gift, partial transfer, split, merge, etc.

3. **Resource Lineage**
   - Where did this resource or resource portion come from?
   - What predecessor resources produced it?
   - What successor resources resulted from a split or transfer?

4. **Relationship Evidence**
   - What document, transaction, proof, or verification supports the relationship or movement?

These capabilities are introduced progressively, beginning with the Farm domain and then extending to FarmAsset, FarmRecord, Livestock, Crop, and other applicable resources.

## 3. Ownership Is Temporal

Ownership must be treated as a time-aware business relationship rather than merely a mutable current-state attribute.

The existing `Farm.ownerId` remains useful during migration as a compatibility/current-state field.

However:

- historical ownership must not be destroyed by updating `ownerId`;
- ownership changes must produce historical relationship records;
- effective dates must be preserved;
- previous owners must remain identifiable according to authorization;
- transfers must preserve original record provenance;
- future architecture must support ownership succession without rewriting history.

The authoritative temporal model will progressively move toward relationship history while retaining compatibility with existing fields during migration.

## 4. Ownership Is Not the Same as Use

The platform must distinguish:

- ownership;
- co-ownership;
- possession;
- lease;
- custody;
- management;
- operational control;
- service relationship;
- advisory relationship;
- authorized use;
- authorization to perform a specific action.

A user may therefore interact with a resource without owning it.

Examples include:

- a farmer leasing another farmer's land;
- a manager operating a farm;
- a worker performing assigned work;
- a veterinarian accessing livestock;
- a mechanic servicing farm equipment;
- a caretaker maintaining livestock;
- a service provider operating on behalf of an owner.

Role alone must not determine resource ownership or access.

## 5. Resource Relationship Foundation

V0.3 introduces a generic relationship concept capable of representing relationships between users and resources.

Conceptual fields include:

- `resourceType`
- `resourceId`
- `userId`
- `relationshipType`
- `status`
- `validFrom`
- `validUntil`
- `endedAt`
- `endedReason`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- optional predecessor/successor relationship references

Initial relationship types may include:

- `OWNER`
- `CO_OWNER`
- `LESSEE`
- `MANAGER`
- `WORKER`
- `CUSTODIAN`
- `CARETAKER`
- `SERVICE_PROVIDER`
- `ADVISOR`
- `VETERINARIAN`
- `AUTHORIZED_OPERATOR`

The exact Prisma schema must be derived from the existing data model before implementation. This list is the architectural contract, not permission to invent a disconnected parallel schema.

## 6. Relationship Status

Relationship type and relationship status are separate concepts.

Initial status vocabulary:

- `ACTIVE`
- `EXPIRED`
- `TRANSFERRED`
- `REVOKED`
- `TERMINATED`
- `SUSPENDED`

`validUntil` may use a far-future technical default where appropriate to represent "no scheduled expiry."

It must **not** be interpreted as permanent ownership.

Authoritative business state comes from the relationship status and effective dates.

Protected operations must evaluate the current effective relationship at operation time rather than relying only on information captured at login.


## 7. Resource Movement

Relationship history alone is insufficient for business reconstruction.

V0.3 therefore introduces **Resource Movement** as a first-class business-history concept.

A movement represents a meaningful business event affecting ownership, possession, custody, allocation, location, or resource lineage.

Initial movement types may include:

- `SALE`
- `PARTIAL_SALE`
- `TRANSFER`
- `PARTIAL_TRANSFER`
- `LEASE`
- `LEASE_END`
- `INHERITANCE`
- `GIFT`
- `DONATION`
- `ALLOCATION`
- `REALLOCATION`
- `RETURN`
- `MERGE`
- `SPLIT`
- `RECOVERY`
- `LOCATION_CHANGE`
- `CUSTODY_CHANGE`

A movement should conceptually preserve:

- source user/resource;
- destination user/resource;
- movement type;
- affected resource;
- affected quantity or portion where applicable;
- effective date/time;
- recorded date/time;
- reason;
- transaction reference;
- evidence reference;
- provenance;
- creator/updater attribution.

Movement history is a business record and must not be confused with ordinary technical audit entries.

## 8. Partial Sale and Partial Transfer

V0.3 must support situations where only part of a resource is transferred.

Examples include:

- part of a farm's land being sold;
- part of a land parcel being transferred;
- part of a livestock group being transferred;
- selected assets moving to another owner;
- a resource being divided between multiple parties.

A partial movement must not overwrite the original resource history.

Instead, the architecture must preserve the relationship between:

- the original resource;
- the retained portion;
- the transferred portion;
- any newly created resource representation;
- subsequent movements.

This creates a lineage branch that allows the platform to answer:

> Where did this current resource or portion come from?

and:

> What happened to the original resource after the split or partial transfer?

The implementation should avoid duplicating historical records unnecessarily.

## 9. Resource Lineage

Resource lineage records derivation between resources or resource portions.

Initial lineage relationships may include:

- `DERIVED_FROM`
- `SPLIT_FROM`
- `MERGED_FROM`
- `TRANSFERRED_FROM`

Lineage exists to preserve business continuity across:

- split;
- merge;
- partial transfer;
- partial sale;
- derived resources;
- future resource restructuring.

Lineage must preserve historical identity and must not replace audit history.

## 10. Relationship Evidence

Relationships and movements may require supporting evidence.

Conceptual evidence metadata includes:

- `documentType`
- `documentNumber`
- `documentDate`
- `issuer`
- `verificationStatus`
- `verifiedBy`
- `verifiedAt`
- `notes`
- secure document/file reference

Examples include:

- sale deed reference;
- lease agreement;
- transfer document;
- inheritance document;
- allocation order;
- service authorization;
- ownership proof;
- government or institutional reference.

Actual uploaded documents must remain within the platform's secure file/document infrastructure.

The relationship or movement record should reference the secure document rather than embedding uncontrolled file content.

Evidence verification must be authorization-aware and auditable.

## 11. Audit, History, Movement, and Lineage Are Different

V0.3 explicitly separates four related but different concepts.

### Technical Audit

Answers:

> What did a user, system, API, import, or AI process do?

Examples:

- created a record;
- changed a field;
- deleted a record;
- restored a record;
- accessed an administrative function.

### Record History / Provenance

Answers:

> How did this stored record change over time?

This includes:

- original input;
- corrections;
- revisions;
- reversals;
- versions;
- creator/updater/deleter attribution;
- source/provenance.

### Resource Relationship History

Answers:

> Who had what relationship with this resource, and when?

Examples:

- owner;
- lessee;
- manager;
- custodian;
- veterinarian;
- authorized operator.

### Resource Movement History

Answers:

> What business event caused a resource, portion, relationship, or location to change?

Examples:

- sale;
- transfer;
- lease;
- partial transfer;
- split;
- merge;
- inheritance.

These layers should be linked where appropriate, but they must not be collapsed into one ambiguous history table.

## 12. Authorization Integration

V0.3 does not replace the existing permission architecture.

The existing authorization model remains foundational:

- `GLOBAL`
- `OWN`
- `FARM`

These scopes continue to provide coarse authorization boundaries.

`FARM` means access within the relevant farm boundary. It does not inherently mean that the user owns the farm.

Resource relationships supplement authorization by providing contextual facts about the user's current and historical relationship with the resource.

Conceptually, authorization evolves toward:

> **Role + Permission + Scope + Current Resource Relationship + Field Policy → AuthorizationService**

The exact implementation must continue to use the existing `AuthorizationService` and permission infrastructure rather than creating a second independent authorization engine.

Relationship-aware authorization must still respect:

- explicit permission grants;
- deny conditions;
- ownership;
- farm boundaries;
- field policies;
- resource status;
- current effective relationship;
- administrative privileges.

Relationship existence does not automatically grant unrestricted access.

## 13. Historical Records and Ownership Transfer

When resource ownership changes:

1. Existing records retain their original creator and provenance.
2. Historical records are not rewritten to make them appear to have been created by the new owner.
3. Previous ownership remains historically reconstructable.
4. The new owner may receive access to historical information where authorization permits.
5. Sensitive personal, financial, private, or business information does not automatically transfer merely because resource ownership changed.
6. New transactions are attributed to the users who actually create them.
7. Movement records connect the previous and new relationship states.
8. Audit records continue to preserve actual system/user activity.

The platform must therefore support:

> **Historical continuity without historical impersonation.**

A new owner can legitimately inherit access to a resource while the system still preserves who created each historical record.

## 14. User Profile Relationship History

The User profile architecture should progressively expose relationship history.

Depending on authorization, a profile may show:

### Current Relationships

- current ownership;
- co-ownership;
- leases;
- management;
- custody;
- operational relationships;
- service/advisory relationships.

### Historical Relationships

- previous ownership;
- ended leases;
- previous management/custody;
- transferred relationships;
- effective dates;
- end dates;
- status.

### Movement Summary

Where authorized, the profile may show resource movements associated with the user, including:

- sale;
- transfer;
- partial transfer;
- lease;
- inheritance;
- allocation;
- other supported movement types.

Visibility must remain authorization-aware.

The profile must not expose unrelated private information merely because a relationship exists.

## 15. Existing Resource Pages Are Upgraded, Not Replaced

Existing resource pages remain the primary user experience.

V0.3 progressively adds relationship and movement context to those pages.

For applicable resources, the UI should eventually expose:

- current relationship;
- relationship timeline;
- ownership history;
- movement timeline;
- lineage;
- supporting evidence;
- authorized historical records.

The first implementation target is the Farm page.

FarmAsset, FarmRecord, Livestock, Crop, and other applicable domains should adopt the same platform capability progressively.

The platform should avoid rewriting all resource pages simultaneously.


## 16. V0.3 Development Sequence

V0.3 implementation must proceed incrementally.

### Phase A — Finish Current Foundation

Complete the work already in progress before introducing a broad new migration.

Priority:

1. Verify `UsersService` against the 19 September 2026 checkpoint.
2. Complete the canonical user-field validation migration.
3. Run focused TypeScript and Jest validation.
4. Review the resulting diff.
5. Create a clean Git checkpoint.

No V0.3 relationship implementation should overwrite or abandon this existing work.

### Phase B — Inspect Existing Data Foundations

Before designing new Prisma models, inspect the actual current implementations of:

- `User`;
- `Farm`;
- `FarmAsset`;
- `FarmRecord`;
- audit/history/provenance;
- Registry;
- AuthorizationService;
- permission persistence;
- field-policy infrastructure;
- secure file/document infrastructure.

The new relationship architecture must integrate with these existing capabilities.

### Phase C — Introduce Relationship Foundation

Introduce the minimum compatible foundation for:

- Resource Relationship;
- Resource Movement;
- Resource Lineage;
- Relationship Evidence.

The first implementation should be intentionally small and testable.

The exact database schema must be derived from the current Prisma model and existing conventions.

The relationship foundation now includes ResourceRelationship, ResourceMovement, ResourceLineage, and ResourceEvidence persistence/resolution layers. ResourceEvidence stores controlled reference metadata and integrity information; it does not embed uncontrolled document content.

### Phase D — Integrate Farm

Farm is the first domain integration target.

During migration:

- retain `Farm.ownerId` for compatibility/current-state access;
- introduce temporal relationship records;
- preserve previous ownership;
- record movement events;
- support lease and authorized operational relationships;
- preserve historical provenance;
- connect evidence where required.

The migration must be reversible and non-destructive.

### Phase E — Authorization Integration

Extend the existing AuthorizationService so that resource relationships can participate in authorization decisions.

Do not create a parallel authorization system.

The resulting decision path should remain explicit and auditable.

### Phase F — Existing UI Upgrade

Upgrade the existing Farm/resource pages rather than replacing them.

Introduce progressive UI sections for:

- relationships;
- ownership history;
- movement;
- lineage;
- evidence;
- authorized historical records.

### Phase G — Progressive Domain Adoption

After the Farm implementation is proven, progressively adopt the capability for:

1. FarmAsset;
2. FarmRecord;
3. Livestock;
4. Crop;
5. other applicable resource domains.

Each adoption requires focused tests and a Git checkpoint.

## 17. V0.3 Non-Goals

V0.3 explicitly does **not** require:

- a complete database rewrite;
- immediate removal of `ownerId`;
- replacement of Registry;
- replacement of AuthorizationService;
- replacement of existing permission scopes;
- immediate polymorphism for every resource type;
- rewriting every resource page;
- migrating every domain simultaneously;
- rebuilding Audit from scratch;
- creating a second disconnected history framework;
- implementing every possible transfer scenario before the foundation is proven.

The goal is a reusable platform capability introduced through controlled adoption.

## 18. V0.3 CTO Guardrails

The following development sequence is preferred:

> **Existing capability → safe extension → focused test → Git checkpoint → progressive adoption**

over:

> **discard → rewrite → large migration → broad regression risk**

Additional guardrails:

1. Preserve historical provenance.
2. Never silently rewrite ownership history.
3. Never equate role with ownership.
4. Never equate ownership with authorization.
5. Never assume a farm transfer automatically transfers every asset or livestock relationship.
6. Never expose private historical information merely because resource ownership changed.
7. Keep technical audit separate from business movement history.
8. Keep relationship history separate from ordinary record version history.
9. Keep evidence references secure and authorization-aware.
10. Reuse existing Registry and Authorization infrastructure.
11. Prefer additive migrations over destructive migrations.
12. Test each coherent migration before expanding its scope.
13. Create Git checkpoints at meaningful architectural milestones.
14. Do not introduce a second implementation of an existing platform capability without proving the existing one is insufficient.

## 19. V0.3 Definition of Success

V0.3 is architecturally successful when KrishiKendram can represent, preserve, and authorize:

- current ownership;
- historical ownership;
- co-ownership;
- leases;
- management;
- custody;
- operational relationships;
- service relationships;
- full transfers;
- partial transfers;
- partial sales;
- movement history;
- resource lineage;
- supporting evidence;
- historical record provenance;
- authorization-aware access to historical information.

The system must achieve this without:

- rewriting historical creator attribution;
- destroying previous relationships;
- coupling every relationship to a single role;
- replacing the existing permission architecture;
- creating a disconnected audit/history system;
- requiring a wholesale platform rewrite.

The result should allow the platform to answer both:

> **Who has this resource now?**

and:

> **Who had this resource, relationship, or portion of it before, what changed, when did it change, and what evidence supports that change?**

---

# CTO EXECUTION DASHBOARD — V0.3 BASELINE

**Dashboard date:** 26 September 2026
**Architecture:** V0.3
**Status:** Architecture aligned — implementation ready

| Area | Status |
|---|---:|
| Development / Architecture Foundation | 90% 🟢 |
| Field Platform | 85% 🟢 |
| Authorization | ~72% 🟢/🟡 |
| Registry | ~75% 🟢/🟡 |
| Registry → Permission persistence | Complete 🟢 |
| Super Admin | 55% 🟡 |
| Audit | 40% 🟡 |
| History / Provenance | 30% 🟠 |
| Users / Auth | 70% 🟢 |
| Domain | 65–70% 🟢 |
| Frontend Platform | 35–40% 🟠 |
| AI Intake | 45% 🟡 |
| Recall | 10% 🔵 |
| Security Hardening | 35–40% 🟠 |
| Production | 20–25% 🔵 |
| Ecosystem | 10–15% 🔵 |

## Dashboard Interpretation

These percentages are intentionally retained from the V0.2/V0.3 baseline.

V0.3 does **not** artificially increase implementation percentages merely because the architecture has become clearer.

The principal V0.3 change is architectural alignment.

The most important architectural evolution is within the History / Provenance foundation, which now explicitly includes the future capability for:

- Relationship History;
- Movement History;
- Resource Lineage;
- Relationship Evidence;
- ownership succession;
- lease and custody history;
- partial transfer history;
- authorization-aware historical access.

This does not mean those capabilities are already implemented.

The dashboard therefore continues to represent implementation reality rather than architectural ambition.

As of 26 September 2026, the ResourceMovement foundation is implemented as a platform persistence and resolution layer. ResourceLineage and ResourceEvidence foundations are now also implemented and verified. Evidence provides controlled reference metadata and integrity information linked to relationships and movements. Business lifecycle creation workflows and Farm integration remain pending.

## Current V0.3 Priority Order

The current execution priority is:

1. Integrate ResourceRelationship with Farm ownership/access context while preserving `Farm.ownerId` compatibility.
2. Connect ResourceMovement, ResourceLineage, and ResourceEvidence to Farm lifecycle events.
3. Verify authorization-aware relationship resolution at Farm operation boundaries.
4. Add focused Farm integration tests and full regression coverage.
5. Extend the same platform capability to FarmAsset, FarmRecord, and Crop progressively.
6. Upgrade existing resource pages with authorized relationship, movement, lineage, and evidence history.
7. Expand to additional domains only after the Farm implementation is proven.

## V0.3 Architecture Principle

> **Ownership is a temporal relationship. Authorization is a permission decision. Movement is a business event. Lineage preserves resource continuity. Evidence supports the relationship or event. Audit records system activity. Provenance preserves historical truth.**

These concepts are related and must be connected, but they must not be collapsed into one ambiguous mechanism.

## V0.3 Final Status

**V0.3 Status: FARM LIFECYCLE INTEGRATION HARDENED — FINAL SMOKE CHECKPOINT**

The V0.3 implementation sequence has now covered the concrete Farm lifecycle: temporal ownership, governed transfer requests, full and partial transfer execution, movement, evidence, split/merge lineage, authorization-aware history, Crop relationship history, and immutable FarmRecord observation handling. Registry capability consistency has also been tightened. The remaining checkpoint is final runtime/end-to-end smoke verification and recovery validation before selecting the next real domain capability.

### 2026-09-26 — Farm child lifecycle checkpoint

The Farm lifecycle foundation now covers temporal ownership for Farm, FarmAsset,
and Crop. Farm deletion explicitly closes child relationship history before
database cascade deletion. FarmRecord remains classified as historical
observation data rather than an owned resource.

Next platform target: complete the V0.3 A/B/C promotion and recovery
checkpoint after validating the relationship-aware child access/history surfaces.

### 2026-09-26 — Relationship-aware child access/history checkpoint

FarmAsset and Crop now expose authorized relationship history through their
existing READ authorization boundaries. ResourceRelationshipService owns the
canonical history retrieval and returns domain relationship facts in effective
chronological order. FarmRecord remains historical observation/provenance data.

Current execution frontier: V0.3 A/B/C promotion validation and recovery
checkpoint.

### 26 September 2026 — V0.3 A/B/C promotion and recovery checkpoint

Development, Integration, and Canonical are synchronized with their remote main branches. Full backend regression remains 30/30 suites and 294/294 tests passing, production build passes, and git diff --check passes. Git checkpoints provide the current recovery mechanism; no additional recovery infrastructure is justified yet.

Current execution frontier: continue from the verified V0.3 relationship/history foundation into the next narrowly scoped platform capability.



### 26 September 2026 — Farm Resource Transfer Lifecycle checkpoint

The Farm integration now contains an explicit ownership-transfer lifecycle for
Farm and FarmAsset. Transfer closes the prior temporal OWNER relationship,
creates the destination OWNER relationship, and records a ResourceMovement
TRANSFER event linked to both relationship records. Optional transaction or
document references are persisted as ResourceEvidence and linked to the
transfer event and relationship history.

Ordinary create/update/delete operations deliberately do not create Movement
or Lineage records. ResourceLineage remains reserved for genuine resource
continuity events such as split, merge, derivation, or future transformations.
This preserves the V0.3 architectural separation between ownership, movement,
lineage, evidence, audit, and provenance.

Transfer implementation is isolated in FarmResourceLifecycleService so
FarmsService remains a CRUD façade and stays within the project's service-size
guardrail.

Verification: full backend regression 30/30 suites, 294/294 tests PASS;
production build PASS; git diff --check PASS.

Current execution frontier: add focused transfer lifecycle tests, expose
movement/evidence history through existing authorization-aware resource
workspaces, then implement a real split/merge lineage workflow when a concrete
resource transformation contract exists.


### 26 September 2026 — Movement/Evidence history access checkpoint

The Farm workspace API now exposes authorization-aware movement and evidence
history for Farms and FarmAssets. FarmAsset access resolves the active temporal
OWNER relationship before invoking the existing authorization policy, retaining
the legacy farm-owner fallback for resources without relationship history.

Dedicated lifecycle tests cover transfer success, inactive destinations,
evidence-reference validation, and temporal-owner history authorization.

The next UI checkpoint is to expose these histories in the existing Farm
workspace. ResourceLineage remains intentionally deferred until a concrete
split/merge/derivation transformation contract exists.

## Checkpoint — 2026-09-26
Farm and FarmAsset lifecycle history is now exposed in the existing frontend workspace. Movement and Evidence history are lazy-loaded through centralized API methods, while authorization remains enforced by the backend history endpoints. ResourceLineage remains reserved for genuine split/merge/derivation semantics and is not fabricated for ordinary CRUD or transfer events.

## Checkpoint — 2026-09-26 — ResourceLineage
The first real lineage workflow is now implemented for quantified FarmAsset stock/resource splitting. Ordinary CRUD and ownership transfer remain free of fabricated lineage. Split is transactional: source quantity decreases, a target asset is created, temporal ownership is established, a SPLIT movement is recorded, and a SPLIT_FROM lineage edge links source to target. Lineage history is authorization-aware and exposed in the FarmAsset workspace. Lineage logic is isolated in FarmResourceLineageService; FarmResourceLifecycleService remains focused on movement/evidence lifecycle concerns.

### 26 September 2026 — FarmAsset Merge Lineage checkpoint

The FarmAsset lineage workflow now supports quantified resource merging in addition to splitting. A merge requires at least two distinct quantified assets from the same farm, matching type/unit, and a common active owner. The operation is transactional: a new target asset receives the combined quantity, source assets are reduced to zero and their active relationships are terminated, a target temporal OWNER relationship is created, each source emits a MERGE movement, and each source is linked to the target with a MERGED_FROM lineage edge.

This keeps lineage reserved for genuine resource continuity transformations while preserving temporal ownership and movement history. Focused merge tests pass and the full backend regression remains green at 32/32 suites and 302/302 tests.

Current execution frontier: expose merge as a first-class FarmAsset workspace action, then complete the next domain adoption pass for FarmRecord/Crop where the lifecycle semantics are appropriate.

### 26 September 2026 — Partial Resource Transfer checkpoint

ResourceTransferRequest now supports quantified partial FarmAsset transfers through the existing temporal relationship, movement, and lineage primitives. A request for a quantity remains PENDING until the destination member accepts it (or an authorized administrator completes it). Acceptance runs atomically: the source asset quantity is reduced, a child asset is created for the transferred quantity, SPLIT movement and SPLIT_FROM lineage are recorded, the child ownership is transferred to the destination member, and the request is completed. The destination member does not require a Farm.

The lifecycle explicitly rejects zero/full-quantity transfers as partial transfers and validates units. Concurrent acceptance is guarded by an atomic request-state claim before resource mutation. The permanent Member ID remains the identity anchor for the request participants.

Verification: transfer-specific 3/3 tests PASS; full backend regression 32/32 suites and 302/302 tests PASS; production build PASS; git diff --check PASS.

Current execution frontier: expose pending transfer actions in the frontend, then unify resource timeline/history presentation across ownership, movement, split, merge, transfer, and evidence events.

### 26 September 2026 — Transfer actions + authoritative timeline checkpoint

- Added authenticated incoming-pending transfer retrieval and pending-count APIs.
- Added transfer lifecycle audit events for request, rejection, cancellation, and completion.
- Added History workspace transfer actions with Accept/Reject controls.
- History now incorporates authoritative farm-asset movement and lineage events instead of relying only on inferred created/updated timestamps.
- Inaccessible transferred assets are skipped without breaking the overall history workspace.
- Verification: backend 33/33 suites and 305/305 tests; backend production build PASS; frontend TypeScript/Vite production build PASS; git diff --check PASS.
- Execution frontier: complete transfer creation UX by Member ID/resource selection, then final lifecycle hardening and end-to-end verification.

### 26 September 2026 — Transfer creation UX checkpoint

- Added authenticated Member ID lookup for active transfer recipients, returning only the member identity fields required by the transfer workflow.
- Added History workspace transfer creation using the authenticated user's owned Farm/FarmAsset resources.
- Added full Farm transfer and quantified partial FarmAsset transfer selection; quantity is validated client-side before request creation while backend rules remain authoritative.
- Added reason capture and request submission through the existing ResourceTransferRequest API.
- Added focused Member ID resolution coverage without changing the transfer lifecycle's ownership, movement, lineage, evidence, or audit boundaries.
- Verification: transfer service 4/4 tests PASS; full backend regression 33/33 suites and 306/306 tests PASS; backend production build PASS; frontend TypeScript/Vite production build PASS; git diff --check PASS.
- Current execution frontier: final lifecycle hardening and end-to-end verification, followed by the next domain adoption pass.

### 26 September 2026 — Lifecycle hardening + runtime integration checkpoint

- Transfer request creation now rejects expired requests and invalid effective/expiry ordering before persistence.
- Transfer completion audit is written through the active Prisma transaction, keeping audit truth atomic with ownership/movement/lineage changes.
- History workspace now supports sent-transfer visibility/cancellation and transaction/document references, while retaining incoming accept/reject actions.
- Crop relationship history is incorporated into the unified operational timeline.
- Farm and FarmAsset evidence history is incorporated into the same timeline alongside movement and lineage events.
- Runtime smoke verification exposed missing Nest module wiring for the newly relationship-aware CropsService. CropsModule now imports PrismaModule and RelationshipsModule, and AuthorizationModule explicitly imports RegistryModule for its PermissionService dependency. A module-graph regression test was added so this class of startup failure is caught before runtime.
- Verification: transfer service 7/7 tests PASS; full backend regression 34/34 suites and 311/311 tests PASS; backend production build PASS; frontend production build PASS; runtime Nest startup PASS; `/api/v1/health` PASS; git diff --check PASS.
- Current execution frontier: final end-to-end lifecycle verification, then move from the Farm/Crop adoption pass into the next concrete domain lifecycle without introducing artificial movement/lineage semantics.

### 26 September 2026 — Transfer hardening + FarmAsset merge UI checkpoint

- Transfer request creation now persists the request and its audit event atomically.
- Reject and cancel now use atomic pending-state claims with transaction-bound audit events, preventing stale concurrent actions from rewriting a completed request.
- Transfer acceptance now includes expiry in the atomic claim condition as a second concurrency guard.
- FarmAsset merge is now exposed as a first-class action in the existing Farm workspace. The UI only offers quantified assets and provides a lightweight compatibility check for matching type/unit before calling the authoritative backend merge workflow.
- The merge UI remains isolated in a small component so the existing Farm page does not absorb another lifecycle implementation.
- Verification: transfer service 11/11 tests PASS; full backend regression 34/34 suites and 315/315 tests PASS; backend production build PASS; frontend production build PASS; runtime health PASS; git diff --check PASS.
- Current execution frontier: complete final runtime/end-to-end smoke coverage, then begin the next concrete domain adoption only where the domain semantics are real.

### 26 September 2026 — FarmRecord adoption alignment checkpoint

- FarmRecord remains an immutable historical observation/operational record and does not receive an ownership relationship, movement, or lineage model.
- The existing Farm workspace now sends only the canonical InputMethod values defined by the backend/Registry (MANUAL, VOICE, IMAGE, VIDEO, MIXED).
- Record descriptions are stored inside the existing required JSON data payload instead of an unsupported top-level field, preserving the current schema and avoiding a needless migration.
- Farm history now reads that observation description from the canonical data payload.
- This closes a frontend/backend contract mismatch without changing the FarmRecord persistence model or inventing new lifecycle semantics.
- Verification: FarmsService 38/38 tests PASS; frontend TypeScript/Vite production build PASS; git diff --check PASS.
- Current execution frontier: final runtime/end-to-end smoke coverage and Registry/permission consistency review before any new domain is introduced.

### 26 September 2026 — FarmRecord capability consistency checkpoint

- Registry capabilities for FarmRecord now reflect its actual lifecycle: READ and CREATE only.
- UPDATE and DELETE were removed from the declared capability/permission surface because FarmRecord is intentionally immutable historical observation data and has no corresponding mutation endpoints.
- PermissionService remains authoritative: persisted stale permission rows cannot become active resource capabilities because authorization filters against current Registry declarations.
- No database migration was introduced; the correction is additive at the Registry/authorization decision layer.
- Verification: Registry + Permission focused tests 57/57 PASS; backend production build PASS; frontend production build PASS; git diff --check PASS.
- Current execution frontier: final runtime/end-to-end smoke coverage, then close the V0.3 lifecycle checkpoint and select the next real domain capability.


### 27 September 2026 — V0.3 FINAL CLOSEOUT

V0.3 is now closed after final runtime, regression, build, and capability-consistency verification.

- Backend regression: 34/34 suites, 315/315 tests PASS.
- Backend production build: PASS.
- Frontend production build: PASS.
- Runtime `/api/v1/health`: PASS.
- `git diff --check`: PASS.
- Working tree: clean; `main` synchronized with `origin/main` at checkpoint `b8d06f5`.
- FarmRecord Registry capabilities now match its immutable READ/CREATE lifecycle.
- PermissionService continues to reject stale resource permission rows at authorization time when they are not declared by Registry.

V0.3 therefore becomes the recovered baseline for the next execution phase. No additional recovery infrastructure or speculative domain model is introduced.

### Next execution phase — V0.4 domain adoption

The next capability will be selected from a concrete lifecycle already represented by the current platform primitives. Implementation will reuse ResourceRelationship, ResourceMovement, ResourceEvidence, ResourceLineage, Registry, and Authorization rather than creating parallel lifecycle systems.

Selection rule: introduce a new domain/model only when there is an actual business lifecycle contract; otherwise extend an existing resource capability with the smallest reversible change.


### 27 September 2026 — V0.4 FarmAsset Custody Capability

The first V0.4 capability reuses the existing relationship/movement/evidence architecture for a real operational lifecycle: FarmAsset custody.

- FarmAsset now declares `ASSIGN` as a Registry capability across OWN/FARM/GLOBAL scopes.
- Active `CUSTODIAN` relationships are temporal and replaced transactionally when custody changes.
- Each custody change records a `CUSTODY_CHANGE` ResourceMovement and can carry ResourceEvidence.
- Authorization is evaluated against the active FarmAsset owner before custody mutation.
- Seed reconciliation now persists declared resource capabilities beyond CRUD for the supported `ASSIGN` action.
- No new Prisma resource model or parallel lifecycle mechanism was introduced.

Verification: backend 34/34 suites, 316/316 tests; backend build PASS; frontend build PASS; `git diff --check` PASS; authorization/Registry focused tests PASS; database seed PASS.

Current execution frontier: add focused custody-service coverage and runtime route verification, then extend only the next concrete operational lifecycle that fits the existing platform primitives.


### 27 September 2026 — V0.4 Custody Verification Close

Focused custody orchestration coverage is now in place for authorization-before-transaction behavior and successful delegation into the canonical relationship service.

- Focused custody + relationship tests: 6/6 PASS.
- Full backend regression: 35/35 suites, 318/318 tests PASS.
- Runtime health: HTTP 200.
- Protected custody route: HTTP 401 without authentication.
- Backend production build and frontend production build remain PASS.

The custody capability is therefore a verified V0.4 slice. Next work should target another concrete operational lifecycle only after inspecting whether its semantics already exist in the current platform primitives.


### 27 September 2026 — V0.4 FarmAsset Lease Lifecycle

Extended the existing FarmAsset lifecycle with leasing using already-defined platform semantics.

- Added lease validity (`validUntil`) to the existing transfer-resource DTO.
- Added FarmAsset lease orchestration with owner-aware `ASSIGN` authorization.
- Added temporal `LESSEE` relationship creation/replacement.
- Added canonical `LEASE` ResourceMovement and optional ResourceEvidence.
- Added protected `POST /farms/:farmId/assets/:assetId/lease` route.
- No new Prisma resource model or parallel lifecycle mechanism introduced.

Verification: focused Farms/Relationship tests 42/42 PASS; full backend regression 35/35 suites, 318/318 tests PASS; backend build PASS. Dedicated lease/custody service coverage: 6/6 PASS.

Next frontier: verify lease runtime boundary and then expose the completed lifecycle through the existing Farm workspace.


### 27 September 2026 — Unified Resource History Timeline checkpoint

Extended the existing History workspace to consume the lifecycle foundations already present in the platform.

- Asset history now includes temporal relationship history alongside movement, lineage, and evidence.
- Farm history now includes farm-level ResourceMovement events alongside farm evidence.
- The existing timeline remains the presentation layer; no duplicate history or lifecycle engine was introduced.
- Existing authorization-protected history APIs are reused unchanged.

Verification: frontend production build PASS; `git diff --check` PASS. Full regression/runtime verification remains deferred to the planned checking pass.

Next frontier: continue concrete lifecycle adoption only where existing relationship, movement, lineage, evidence, and authorization primitives fit; then perform the deferred full regression/runtime verification.


### 27 September 2026 — FarmAsset Split Workspace Control

Completed the frontend adoption of the existing atomic FarmAsset split lifecycle.

- Added the FarmAsset split API client.
- Added compact split controls to the existing Farm workspace asset cards.
- Quantity validation prevents zero/negative/full-source splits in the UI while the backend remains authoritative.
- Existing relationship, movement, lineage, authorization, and transaction semantics remain canonical.

Verification: FarmResourceLineageService 4/4 tests PASS; frontend production build PASS; `git diff --check` PASS.

Next frontier: continue only with the next explicit business lifecycle that fits the established platform primitives; otherwise keep the architecture stable and use the planned verification pass.

### 27 September 2026 — User Resource Relationship History checkpoint

Completed the documented User Profile Relationship History segment using the existing temporal ResourceRelationship persistence model.

- Added an authorization-protected GET /users/:id/relationships/history read path.
- History is bounded to a maximum of 200 records and ordered by relationship start time, preserving the temporal model without creating a second history system.
- Exposes relationship type/status, resource identity, validity window, termination reason, evidence reference, and attribution metadata.
- Integrated the result into the existing Users Activity workspace alongside audit activity.
- Added focused UsersService coverage for bounded relationship-history retrieval.
- No schema migration, new resource model, or parallel authorization/history mechanism was introduced.

Current execution frontier: continue concrete module adoption only where the existing platform contract is explicit; otherwise move to the planned full regression/runtime verification pass.


## 2026-09-27 — V0.5.3 Super Admin Resources Workspace

### Completed

- Added the first Super Admin Resources workspace at /app/resources.
- Workspace consumes the canonical frontend Registry contract layer rather than defining resource metadata locally.
- Resource selection is grouped by registered module and exposes model, owner, soft-delete, search/sort, features and lifecycle context.
- Capability declarations and scopes are displayed directly from Registry contracts.
- Resource fields are resolved through the centralized field-policy adapter, including resource-specific validation overrides.
- Registry transport now reuses the existing frontend API request boundary instead of maintaining a second fetch transport.
- Existing domain screens and lifecycle APIs remain unchanged.

### Verification

- Frontend TypeScript project build: PASS.
- Frontend Vite production build: PASS (2303 modules transformed).
- git diff --check: PASS.

### Next target

V0.5.4 — contract-driven platform administration expansion: modules, dependencies and governed capability/field administration using the same canonical boundary.


## 2026-09-27 — V0.5.4 Module Workspace

- Added the Super Admin Modules workspace at /app/modules.
- Module lifecycle, stable ID, dependencies and attached resources are presented from the canonical Registry contracts.
- Lifecycle transition logic remains backend-owned by ModuleLifecycleService; no frontend lifecycle engine or mutation model was introduced.
- Existing module/resource definitions remain declarative and centralized.

Next target: V0.5.5 capability and field administration using the same contract boundary.


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

### Completed

- Added an additive visual layer to the application shell without dismantling existing screens or workflows.
- Added ambient depth, subtle AI-accented light, fine-grain texture, content entrance motion, and refined shell shadows through centralized CSS.
- Added a persistent Visual Effects control in Appearance settings so users can disable ambient motion, glow, depth and related transitions on constrained devices.
- Preserved existing light/dark modes and Krishi/Ocean/Harvest/Midnight colour themes.
- Added reduced-motion handling through the platform preference as an additional accessibility safeguard.
- Kept visual effects cosmetic only: no business decision, authorization rule, AI result or backend contract is implied by the visual layer.

### Verification

- Frontend TypeScript build: PASS (tsc -b).
- git diff --check: PASS.
- Vite production bundling was attempted but the connected terminal currently resolves Node/npm through the Windows interop toolchain while the repository dependencies are Linux/WSL-oriented; Vite reported a missing native Rolldown binding. No dependency tree or lockfile was altered to work around this environment issue.

### Standing UI requirement

The visual intelligence layer now applies to the entire application incrementally. Future screens should inherit the same AI-ready visual language, responsive depth and performance-off path rather than receiving isolated redesigns.

### Next target

V0.5.6 platform administration integration, while continuing the visual system through existing and new screens without dismantling domain UI.


## 2026-09-27 — V0.5.6 Platform Administration Integration

- Connected the Super Admin landing dashboard to the canonical frontend Registry contract boundary.
- Added live Registry-backed counts for modules, resources, declared capabilities and field contracts.
- Added an AI-ready platform context panel that describes the Registry-backed context without fabricating AI analysis or recommendations.
- Existing Resources, Modules and Capabilities workspaces remain the detailed control surfaces; the dashboard is now their platform-level entry point.
- Backend Registry remains authoritative and frontend data remains presentation-only.

Verification: TypeScript build PASS; git diff --check PASS. Vite production bundling remains environment-blocked by the mixed Windows/WSL dependency environment and missing native Rolldown binding documented in the previous checkpoint.


## 2026-09-27 — V0.5.6 Permission Administration Surface

- Added a Registry-declared `permission` platform resource with READ/GLOBAL capability.
- Added a protected `GET /api/v1/platform/permissions` administration surface backed by the existing PermissionService and AuthorizationService.
- Added a read-only Super Admin Permission Matrix workspace at `/app/permissions` showing persisted permission scope, role assignments and field effects.
- No second authorization engine was introduced; backend Authorization remains the sole decision engine.
- The new permission capability participates in the existing additive Registry/seed reconciliation path so ADMIN and SUPER_ADMIN receive declared GLOBAL capability access.
- Frontend TypeScript verification passes. Backend TypeScript verification still reports two pre-existing unrelated test compile errors in FarmAsset custody/FarmsService specs; no new error was reported from the permission administration changes.

Next: continue platform administration integration and progressively expose safe control actions only where their existing backend mutation/audit paths are already authoritative.

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

The platform administration boundary now has a read-only reconciliation path between Registry-declared resource capabilities and persisted resource permissions. It reuses RegistryService and PermissionService and remains behind the existing platform permission authorization path.

### Completed

- Added GET /platform/permissions/reconciliation.
- Compared every Registry capability/scope against persisted resource permission rows.
- Reported declared, covered, missing, and stale entries without mutating authorization state.
- Preserved AuthorizationService as the only runtime authorization decision engine.
- Added no Prisma model and no second audit/history engine.

### Next target

V0.5.6.4 platform coverage dashboard using the existing Registry, permission, module-status, and audit contracts.

## 2026-09-27 — V0.5.6.4 Platform Coverage Dashboard

The Super Admin landing workspace now surfaces platform health from existing canonical contracts: Registry modules/resources, module lifecycle status, persisted permissions, Registry-permission reconciliation, and recent audit activity. The dashboard is read-only and does not introduce a second control plane.


## V0.5.7 — Registry/Permission Administration Hardening — 27 Sep 2026

- Live Prisma seed/reconciliation executed successfully against the current database.
- Registry-declared CRUD/ASSIGN capabilities are reconciled through the canonical PermissionService path.
- User-specific administrative capabilities (READ_ACTIVITY, READ_HISTORY, RESTORE) remain intentionally explicit until generalized capability persistence is expanded; no duplicate authorization engine introduced.
- Permission reconciliation remains read-only and reports declared, covered, missing, and stale persisted resource permissions.
- Verification: PermissionService 17/17; backend production build PASS; frontend production build PASS; git diff --check PASS; working tree clean.
- Generated backend/frontend build artifacts were root-owned from an earlier environment run; ownership was corrected at the WSL filesystem level. No application source workaround was added.

## 2026-09-27 — V0.5.8 Crop Module Completion Gate

The Crop module has passed its current architecture and delivery gate without introducing a second lifecycle or authorization path.

- Canonical Crop mutation ownership remains in CropsService.
- AI Intake delegates Crop persistence to CropsService.createFromIntake().
- Authorization occurs before protected Crop payload access and before Registry validation.
- Crop names use centralized Registry field validation/normalization.
- Crop ownership relationships are created and terminated through the canonical relationship service.
- Archive is implemented as the existing soft-delete lifecycle; no speculative duplicate restore engine was introduced.
- Frontend Crop workspace is connected to the canonical Crop API and relationship-history surface.
- Verification: Crop/module focused backend tests 17/17; frontend production build PASS.

### Next target

V0.5.9 — Intake/FarmRecord completion gate and module-wide history/provenance verification.

## 2026-09-27 — V0.5.9 Intake/FarmRecord Completion Gate

Intake/FarmRecord passed the current completion gate. Intake remains an interpretation boundary only: authorization occurs before extraction, Crop mutations delegate to CropsService, and FarmRecord persistence delegates to FarmsService.addRecord(). FarmRecord remains immutable historical data with Registry-defined READ/CREATE only; no UPDATE/DELETE lifecycle was introduced.

- FarmRecord Registry contract: READ + CREATE, OWN/FARM/GLOBAL.
- FarmRecord validation/normalization remains centralized in the Registry-backed FarmsService path.
- Original intake content remains preserved in the record data payload through the extractor's \raw value.
- Activity/History frontend already surfaces FarmRecord input method and record context.
- Verification: IntakeService 8/8 focused tests; Crop gate 17/17 remains green; frontend production build PASS.

### Next target

V0.5.10 — Farm module completion gate: farm lifecycle, asset/record/crop composition, relationship/movement/history consistency, and Super Admin contract coverage.

## 2026-09-27 — V0.5.10 Farm Module Completion Gate

The Farm module has passed the current completion gate without introducing a second lifecycle, authorization, or history path.

- Farm lifecycle remains canonical in `FarmsService` and `FarmResourceLifecycleService`.
- FarmAsset custody/lease lifecycles use the existing relationship, movement, lineage, and evidence primitives.
- FarmAsset lineage/merge/split behavior remains centralized in `FarmResourceLineageService`.
- FarmRecord remains immutable historical observation/provenance data; no artificial UPDATE/DELETE lifecycle was introduced.
- Farm and child access remain behind centralized Authorization/Registry contracts.
- Frontend Farm workspace remains connected to the canonical APIs and lifecycle surfaces.
- Verification: Farm-focused backend tests 66/66; full backend regression 36 suites / 325 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS.
- Two stale Farm spec contracts were reconciled with the current service/DTO signatures; no production implementation change was required.

### Next target

V0.5.11 — application-wide runtime lifecycle verification and module coverage reconciliation, using existing contracts only.

## 2026-09-27 �w^~)�t V0.5.11 Application Runtime Verification

The application-wide runtime verification segment is closed using the existing contracts only.

- Added reproducible E2E smoke coverage for the versioned health endpoint, canonical Registry module/lifecycle surfaces, protected Farm access, and protected platform permission administration.
- Discovered and corrected a real authorization boundary defect: Permission administration now uses the existing JwtAuthGuard before invoking AuthorizationService, preventing unauthenticated requests from reaching authorization with an undefined user and returning 500.
- Registry lifecycle status is verified through the canonical ModuleLifecycleService contract; no duplicate coverage model was introduced.
- Live runtime verification confirmed the API health endpoint and Registry endpoints respond successfully, while protected Farm access rejects unauthenticated requests with 401.
- Verification: E2E smoke 4/4; full backend regression 36 suites / 325 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS.

### Next target

V0.5.12 �w^~)�t application-wide module coverage reconciliation and remaining runtime contract hardening, using existing Registry, authorization, lifecycle, audit, relationship, and frontend contracts only.

## 2026-09-27 �w^~)�t V0.5.12 Registry Coverage Reconciliation

The Registry coverage reconciliation segment is closed.

- Added executable invariants proving every declared resource references a registered module.
- Added executable invariants proving legacy permission declarations remain covered by first-class capabilities and every declared capability has valid, registered scopes.
- The test deliberately treats first-class capability metadata as the canonical contract while preserving legacy permission metadata during migration; newer capability actions such as READ_ACTIVITY/READ_HISTORY are therefore not incorrectly forced into the legacy list.
- No new Registry, authorization, or persistence abstraction was introduced.
- Verification: full backend regression 36 suites / 327 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS; diff check PASS.

### Next target

V0.5.13+�u���T runtime module/API coverage reconciliation across the remaining application surfaces, with production-route smoke checks and no duplicate contracts.

## 2026-09-27 — V0.5.13 Runtime Module/API Coverage Reconciliation

The remaining high-value application API boundaries now have runtime smoke coverage using existing contracts only.

- Added E2E checks for Auth, Users, Crops, Intake, Resource Transfer requests, and Audit in addition to the existing Health, Registry, Farm, and permission-administration checks.
- Protected surfaces consistently reject unauthenticated access with HTTP 401 at the runtime boundary.
- No duplicate API abstraction, authorization path, persistence model, or lifecycle model was introduced.
- Verification: E2E 10/10; full backend regression 36 suites / 327 tests; backend TypeScript PASS; frontend TypeScript PASS; frontend production build PASS; diff check PASS.
- Existing frontend bundle-size warning remains non-blocking and is not being expanded into this milestone.

### Next target

V0.5.14 — authenticated runtime happy-path verification for the smallest stable read contracts, reusing existing test fixtures and avoiding mutation-heavy E2E coverage unless it catches a real contract gap.

## 2026-09-27 — V0.5.14 Authenticated Runtime Happy-Path Verification

The authenticated runtime happy-path segment is closed using existing fixtures and canonical contracts only.

- Added E2E verification for an authenticated `/api/v1/auth/me` read using an existing active user and the application's canonical JwtService.
- Added E2E verification for an authenticated `/api/v1/farms/my` collection read using an existing active Farmer with an existing Farm relationship.
- The tests intentionally avoid creating, mutating, or deleting test users/farms; no mutation-heavy E2E infrastructure was introduced.
- Authorization remains the existing centralized boundary; the runtime checks exercise the real JWT and authorization path rather than bypassing it with mocked guards.
- Verification: E2E 12/12; full backend regression 36 suites / 327 tests; backend build PASS; frontend TypeScript + production build PASS.
- The existing frontend bundle-size warning remains non-blocking and is not expanded into this milestone.

### Next target

V0.5.15 — authenticated read coverage for the next smallest stable domain surfaces, only where existing fixtures and authorization contracts already support it; otherwise proceed to the planned UI/runtime integration pass without introducing new infrastructure.

## 2026-09-27 — V0.5.15 Authenticated Read Coverage

The next authenticated read contract is closed using existing fixtures and authorization contracts only.

- Added E2E verification for the protected Crop collection read (`/api/v1/crops`) using an existing active authorized user and an existing Crop fixture.
- No mutation-heavy E2E setup, new fixture framework, or alternate authorization path was introduced.
- Verification: E2E 13/13; the preceding full backend regression remains 36 suites / 327 tests; backend/frontend production builds remain green from the preceding gate.

### Next target

V0.5.16 — authenticated read coverage for relationship/transfer and history surfaces where existing fixtures permit it; otherwise begin the planned UI/runtime integration pass.

## 2026-09-27 — V0.5.16 Authenticated Transfer Read Coverage

Relationship/transfer runtime read coverage is now closed for the currently stable transfer-request surface.

- Added authenticated E2E coverage for incoming and outgoing resource-transfer request reads using an existing active user.
- The test exercises the real JWT boundary and existing transfer-request controller/service; it does not create or mutate transfer fixtures.
- Empty collections are valid and are asserted as arrays, so this milestone does not depend on seeded transfer-request data.
- Verification: E2E 14/14; no new fixture framework or alternate authorization path introduced.

### Next target

V0.5.17 — authenticated history/relationship read coverage where a clean existing route and authorization contract are available; otherwise move into the planned UI/runtime integration pass.


## 2026-09-27 — V0.5.17 Authenticated History/Relationship Read Coverage

The authenticated history/relationship read segment is now closed using existing routes, fixtures, and authorization contracts only.

- E2E verifies /api/v1/users/:id/history for an existing active user.
- E2E verifies /api/v1/users/:id/relationships/history for the same existing active user.
- The checks exercise the real JWT and existing authorization/relationship services; no alternate authorization path, fixture framework, or mutation-heavy setup was introduced.
- Empty collections remain valid runtime results; the contract being verified is the authenticated collection boundary.
- Verification: E2E 15/15; full backend regression 36 suites / 327 tests; backend TypeScript no-emit PASS; frontend TypeScript PASS; frontend production build PASS; git diff --check PASS.
- The existing frontend bundle-size warning remains a future performance item and is not expanded into this checkpoint.

### Next target

Proceed to the planned **cross-module UI/runtime coverage and compatibility pass**, using existing APIs and centralized capability/field-policy presentation without introducing duplicate backend rules or new infrastructure.


## 2026-09-27 — V0.5.18 User History UI/Runtime Integration

The canonical UserHistory read contract is now connected to the existing History workspace. The frontend does not create a parallel history model: it consumes `GET /api/v1/users/:id/history`, maps versioned user changes into the existing lifecycle timeline, and retains ResourceRelationship history as the separate relationship stream.

- Added the typed `UserHistoryEvent` frontend contract matching the backend UserHistory response.
- Added the centralized `api.userHistory()` client method.
- HistoryPage now loads user history alongside farms, crops, transfers, and user relationship history.
- User history entries are rendered as timeline events with action, version, timestamp, changed fields, and actor context.
- Because User `READ_HISTORY` is currently a GLOBAL administrative capability, the user-history request is fail-soft for non-administrative users; their authorized relationship/lifecycle history remains available instead of the page failing on a legitimate 403.
- No backend behavior, authorization rule, persistence model, or duplicate history engine was introduced.
- Frontend TypeScript: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Backend TypeScript no-emit: PASS.
- Full backend regression: 36/36 suites, 327/327 tests PASS.
- `git diff --check`: PASS.
- Existing frontend bundle-size warning remains a future performance item and is not expanded into this milestone.

### Next target

**Cross-module UI/runtime coverage and compatibility pass** across the completed contracts, prioritizing real integration gaps and preserving the existing compact/futuristic UI rather than redesigning working surfaces.


## 2026-09-27 — V0.5.20 UI Compatibility & Runtime Readiness

### COMPLETE

The cross-module UI/runtime completion pass is closed for the current scope without redesigning stable surfaces.

- Verified the shared shell has responsive mobile navigation, horizontal overflow protection, safe-area handling, reduced-motion support, and an explicit visual-effects off path.
- Added accessible labels to the mobile navigation open/close controls.
- Reviewed major page loading, empty, and error-state coverage; existing patterns are sufficient, so no duplicate global retry framework was introduced.
- Runtime API health verified: /api/v1/health returned status ok.
- Frontend TypeScript and production build PASS; 2311 modules transformed.
- git diff --check PASS; working tree clean after checkpoint.
- Existing ~608 kB frontend bundle warning remains a deliberate future performance item.

### Next execution target

**Production hardening pass:** exercise the remaining backend/frontend runtime boundaries, focusing on real defects, security/authorization regressions, and release checks—not speculative infrastructure.


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

Transfer requests now preserve the same evidence and temporal context as direct resource lifecycle transfers.

- Transfer-request DTO accepts evidence reference type/value, document number and issuer.
- Transfer request creation persists a single `ResourceEvidence` record and links it through the existing `evidenceId` relation.
- Acceptance reuses that evidence record when creating the ownership transfer relationship and movement; partial farm-asset transfers also attach the evidence to the transfer movement.
- History workspace now exposes optional effective-from and expiry times plus evidence type/reference/document/issuer fields.
- Existing authorization, audit, relationship, movement and lineage foundations were reused; no duplicate evidence system was introduced.
- Backend TypeScript: PASS.
- Full backend regression: 36 suites / 328 tests PASS.
- Transfer request focused coverage: 12 tests PASS, including evidence persistence/reuse.
- Frontend TypeScript and production build: PASS; 2311 modules transformed.
- `git diff --check`: PASS.

### Next execution target

Continue product-domain completion from the existing lifecycle foundation, prioritizing concrete missing user-facing workflows and cross-module integration over speculative infrastructure.


## 2026-09-28 — V0.5.25 Contextual FarmAsset Transfer Handoff

### COMPLETE

FarmAsset transfer initiation is now reachable directly from the Farm workspace without duplicating the canonical transfer workflow.

- Added a contextual transfer action to each FarmAsset card.
- The action routes to the existing History transfer composer with the exact `farmAsset:<id>` resource preselected through the URL.
- Reused existing member lookup, partial/full quantity validation, transaction/evidence fields, effective/expiry dates, and transfer approval/acceptance flow.
- No new backend endpoint, authorization rule, persistence model, or transfer abstraction was introduced.

### Verification

- Frontend TypeScript: PASS.
- Frontend production build: PASS; 2311 modules transformed.
- Existing ~616 kB bundle warning remains deferred to the dedicated performance/code-splitting pass.
- Product-code diff is limited to `HistoryPage.tsx` and `FarmsPage.tsx`.

### Next execution target

Continue the next concrete product-domain/runtime gap, prioritizing lifecycle completeness and user-facing discoverability while preserving the centralized transfer, relationship, movement, lineage, evidence, and authorization foundations.


## 2026-09-28 — V0.5.26 Contextual Farm Transfer Handoff

### COMPLETE

Whole-farm transfer initiation now has the same contextual handoff as FarmAsset transfer.

- Added a Farm card transfer action that routes to the existing History transfer composer with `farm:<id>` preselected.
- Reused the canonical transfer workflow and its existing authorization, evidence, temporal, acceptance, rejection and administrative approval paths.
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
- This preserves the existing FarmRecord authorization, audit/history and unified timeline foundations.

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

### COMPLETE

FarmAsset split now uses the active temporal OWNER for both the source UPDATE authorization and the newly created target CREATE authorization. This closes a concrete post-transfer inconsistency where the source asset used the current owner but the split target authorization still used the legacy farm owner.

- Reused the existing ResourceRelationship lookup and AuthorizationService.
- No new model, endpoint, permission layer, or UI was introduced.
- Added a focused regression for a transferred FarmAsset split.
- Verification: FarmResourceLineageService 5/5 tests PASS.

### Next execution target

Continue the same bounded temporal-ownership audit across remaining concrete FarmAsset lifecycle operations.

### V0.5.30 — Crop Temporal Ownership Authorization Alignment
- Crop READ, UPDATE, archive, and relationship-history authorization resolves the active `resourceRelationship` OWNER first, falling back to the parent farm owner only when no active Crop OWNER relationship exists.
- Crop creation semantics remain farm-owned; no unsupported Crop transfer endpoint was introduced.
- Focused CropService regression suite: 15/15 passed.

### V0.5.31 — Crop Restore Ownership Continuity
- Crop restore now resolves the last recorded OWNER relationship before authorization and re-establishes that owner after restore, falling back to the parent farm owner only when no ownership history exists.
- Added regression coverage for restoring a transferred/temporally owned Crop.
- CropService regression: 16/16 passed; backend build completed successfully.

### V0.5.32 — Central Ownership Transfer Temporal Integrity
- Centralized `ResourceRelationshipService.transferOwnerRelationship` now rejects backdated transfers before the active ownership start and duplicate destination ownership.
- Regression coverage and backend build passed; no module-specific transfer bypass introduced.

### V0.5.33 — Farm Transfer Uses Temporal Owner
- Farm transfer authorization and farm movement/evidence history now resolve the active OWNER relationship, falling back to the denormalized farm owner only for legacy records.
- Added regression coverage for transferred farms; lifecycle tests and backend build pass.

### V0.5.34 — Farm Lifecycle Uses Temporal Owner
- Farm READ, UPDATE, DELETE, FarmAsset CREATE, and FarmRecord CREATE authorization now resolve the active Farm OWNER relationship before applying OWN scope.
- The denormalized `Farm.ownerId` remains a legacy fallback and response/storage field; the temporal relationship is authoritative for authorization.
- Added regression coverage for transferred Farm READ authorization.
- FarmsService regression: 40/40 passed; backend build passed.

### V0.5.35 — Custody and Lease Temporal Integrity
- Central relationship operations now reject custodian changes and lease replacements backdated before the active relationship start.
- Existing return/end operations already enforced the same temporal boundary; this closes the remaining replacement-path inconsistency.
- RelationshipService regression: 8/8 passed; backend build passed.

### V0.5.36 — Lineage Split/Merge Temporal Integrity
- FarmAsset split and merge now reject effective dates before the active source ownership start.
- This prevents lineage and ownership history from being backdated ahead of the source temporal relationship.
- FarmResourceLineageService regression: 7/7 passed; backend build passed.

### V0.5.37 — Partial Transfer Temporal Integrity
- Partial FarmAsset transfer acceptance now verifies the active source ownership start before creating the split target or movement/lineage records.
- Added regression coverage; TransferRequestService 15/15 passed and backend build passed.

### V0.5.38 — Relationship Creation Bypass Audit
- Audited all backend ResourceRelationship write sites.
- All production relationship creation paths route through ResourceRelationshipService.createOwnerRelationship or the central relationship operations; no direct module-level OWNER creation bypass was found.
- FarmRecord remains intentionally farm-owned without a separate temporal OWNER relationship.

### V0.5.39 — Transfer Movement Temporal Integrity
- Central ownership transfer now rejects effective dates before the latest recorded movement for the resource.
- This complements the active ownership-start guard and prevents transfer history from becoming chronologically out of order.
- RelationshipService regression: 9/9 passed; backend build passed.

### V0.5.40 — Lifecycle Closure Integrity Audit
- Audited Farm, FarmAsset, and Crop destructive lifecycle closure paths.
- Farm deletion terminates Farm ownership and all open child FarmAsset/Crop relationships in the same transaction; FarmAsset deletion and Crop archive also terminate their open relationships atomically.
- No additional lifecycle closure bypass was found in the audited paths.
- Cross-domain regression set: 4 suites / 47 tests passed.

### V0.5.41 — Authorization Matrix Final Sweep
- Audited controller/service authorization entry points across Users, Farms, Crops, Intake, transfers, permissions and audit administration.
- Confirmed resource decisions flow through the centralized AuthorizationService; privileged platform endpoints use authorization checks.
- Hardened the audit administration controller with the JWT guard so unauthenticated requests cannot reach its authorization layer.
- Authorization regression: 7 suites / 99 tests passed; backend build passed.

### V0.5.42 — API Contract & DTO Validation Sweep
- Confirmed global ValidationPipe uses whitelist, transformation, and forbidNonWhitelisted.
- Hardened transfer-request required identifiers with non-empty validation, preventing blank resource/user identifiers from crossing the API boundary.
- Existing date, enum, numeric and nested object validations remain in place.

### V0.5.43 — History / Provenance Completeness Sweep
- Audited AuditEvent, UserHistory, ResourceRelationship, ResourceMovement, ResourceLineage, ResourceEvidence, and transfer-request history paths.
- Confirmed actor attribution, timestamps, reasons, transaction/evidence references, relationship chronology, movement chaining, and lineage provenance are represented by the current domain records.
- Confirmed transfer acceptance/rejection/cancellation/approval events are transactionally audited where applicable.
- No isolated history/provenance bypass requiring a new parallel history subsystem was found.

### V0.5.44 — Frontend ↔ Backend Integration Sweep
- Audited the canonical frontend API client against current NestJS controller routes for auth, farms, crops, assets, records, intake, history, movement, lineage, evidence, custody, lease, and transfer workflows.
- Confirmed transfer-request routes and history endpoints used by the current History workspace match the backend contract.
- No fake endpoint or parallel workflow was found; the existing large-bundle warning remains a dedicated performance-pass item.

### V0.5.45 — Frontend Workflow Completion
- Closed the real contextual transfer-entry gap: Farm and FarmAsset Send actions now arrive at History with the selected resource preserved in the transfer form.
- Verified Farm, FarmAsset, FarmRecord, Crop history navigation, loading/error/empty states, and transfer accept/reject/cancel/admin approval wiring against live API contracts.
- No duplicate transfer workflow introduced.
