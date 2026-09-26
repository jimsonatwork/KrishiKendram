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
| Repository | `/home/jj/Dev/KrishiKendram-Development` (active C) |
| Branch | `main` |
| Current checkpoint | `e83bff5` |
| Current checkpoint message | Integrate temporal relationships with Farm lifecycle |
| Current primary phase | V0.3 — Farm Lifecycle Integration |
| Current platform priority | Complete FarmAsset/FarmRecord/Crop lifecycle integration and A/B/C promotion validation |
| Working-tree state at blueprint creation | Checked by this script |
| Development mode | Incremental, reversible, test-driven |
| Next major target | Farm integration → relationship-aware lifecycle semantics → authorized history |

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

**V0.3 Status: ARCHITECTURE ALIGNED — FARM INTEGRATION ACTIVE**

The V0.3 implementation sequence is active. UsersService and Registry / Authorization foundations are checkpointed; ResourceRelationship, ResourceMovement, ResourceLineage, and ResourceEvidence foundations are implemented and verified. The current engineering frontier is Farm integration and business lifecycle semantics.
