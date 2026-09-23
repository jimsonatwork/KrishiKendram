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
| Repository | `/home/jj/Dev/KrishiKendram` |
| Branch | `main` |
| Current checkpoint | `a061cc3` |
| Current checkpoint message | Auth validation through shared helper |
| Current primary phase | Phase 3 — Registry / Capability Architecture |
| Current platform priority | Connect Registry to capability/permission architecture |
| Working-tree state at blueprint creation | Checked by this script |
| Development mode | Incremental, reversible, test-driven |
| Next major target | Registry → Capability → Permission → automatic Super Admin capability |

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
- Existing authorization tests currently passing: 56/56.

### Current Architectural Position

Authorization core is considered an **established foundation**, not an area
for unnecessary rewrite.

The next work should concentrate on platform integration:

```text
Registry
   ↓
Module Definition
   ↓
Resource Registration
   ↓
Capability Registration
   ↓
Permission Generation
   ↓
Role / Grant Assignment
   ↓
AuthorizationService
```

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

**Core foundation established.**

Evidence:

- Permission persistence
- Permission uniqueness
- Role assignments
- Access grants
- Field permissions
- Allow/deny grants
- Permission specificity
- Exact permission ID propagation
- Resource authorization
- Field authorization
- Fail-closed unknown field effects
- Authorization module wiring
- Seed-driven resource capabilities
- Automatic ADMIN/SUPER_ADMIN GLOBAL CRUD for registered resource CRUD actions

Latest focused authorization verification:

```text
4 test suites passed
56 tests passed
0 failures
```

## Current authorization gaps

### 1. Unsupported scopes

The four scopes above are declared but intentionally fail closed.

Do not implement them without defining their real relationship semantics.

### 2. Capability architecture

Administrative capabilities are currently generated through seed logic.

Target architecture:

```text
Registered Resource
       ↓
Declared Capabilities
       ↓
Platform Permission
       ↓
Administrative Capability
       ↓
SUPER_ADMIN / ADMIN
```

New registered resources should participate automatically without requiring
manual permission lists.

### 3. Domain-specific scope resolution

`AuthorizationService` currently resolves FARM scope through a Farm query.

This is acceptable for current behavior.

Long-term, scope/resource resolution should be generalized so that the
authorization engine does not accumulate domain-specific queries.

### 4. Field transformations

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

**Status: ACTIVE NEXT PHASE**

### Immediate objective

Connect existing Registry resource definitions to a proper capability model
without rewriting the established Authorization engine.

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
a061cc3  Refactor Auth validation through shared helper
866aab1  Refactor Users validation through shared helper
e93bebd  Refactor Crop validation through shared helper
d2de8fd  Refactor Farms validation through shared helper
6be7670  Refactor Crop persistence through CropsService
```

This blueprint is being established against:

```text
a061cc3024d2f7dc5c284173dc35ae099f348267
```

---

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

## Registry → Capability Architecture

The next implementation should establish the missing connection:

```text
Registry Module Definition
        ↓
Registered Resource
        ↓
Declared Capability
        ↓
Permission
        ↓
Role / Grant
        ↓
AuthorizationService
```

Primary requirement:

**A newly registered resource should automatically participate in the
platform administrative capability model without manually duplicating
permission configuration.**

Do this incrementally.

Do not replace the current Authorization engine.

---

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
