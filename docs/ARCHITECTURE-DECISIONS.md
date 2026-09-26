# KrishiKendram — Architecture Decisions

This document records durable architectural decisions and their rationale.

When a decision changes, do not silently rewrite history. Mark the old
decision as superseded and record the replacement.

---

## ADR-001 — Centralize Ownership, Modularize Implementation

**Status:** ACTIVE

Each cross-cutting rule should have one canonical owner.

Examples:

- Field Policy owns field validation/normalization.
- Authorization owns access decisions.
- Registry owns platform resource/module metadata.
- Audit owns platform mutation attribution.

Modules consume these systems rather than recreating competing rules.

---

## ADR-002 — Authorization Before Validation and Mutation

**Status:** ACTIVE

Protected operations must follow:

Authorization → Registry/Field Policy validation → normalization → mutation.

Sensitive extraction or protected payload processing must not happen before
authorization.

---

## ADR-003 — Authorization Uses a Two-Stage Resource/Field Model

**Status:** ACTIVE

Resource authorization happens first.

A successful resource decision produces the exact Permission ID.

That Permission ID is then passed to field-policy evaluation.

Field policy must never grant resource access independently.

---

## ADR-004 — Unsupported Authorization Scopes Fail Closed

**Status:** ACTIVE

Declared scopes without implemented relationship semantics must return false.

Current unsupported scopes:

- ASSIGNED
- ORGANIZATION
- SHARED
- PUBLIC

Do not implement them until their actual domain/data semantics are defined.

---

## ADR-005 — Permission Uniqueness Is Canonical

**Status:** ACTIVE

Permission identity is unique by:

module + section + resource + action + scope.

Database uniqueness is enforced.

---

## ADR-006 — Super Admin Capability Must Be Platform-Driven
**Status:** ACTIVE

Super Admin administrative access must derive from Registry capability
definitions rather than requiring manual permission maintenance for every
resource.

The first persistence milestone is implemented:

- Registry resource definitions declare CRUD capabilities.
- PermissionService owns Permission persistence.
- PermissionService owns RolePermission reconciliation.
- Seed derives ADMIN and SUPER_ADMIN GLOBAL CRUD permissions from registered
  resource capabilities.

This persistence layer is a foundation, not the final runtime architecture.

The next step is stronger Permission → Authorization integration while
preserving the established AuthorizationService engine and fail-closed
unsupported scopes.
## ADR-007 — Do Not Rewrite a Working Authorization Core

**Status:** ACTIVE

The existing AuthorizationService has sufficient architectural integrity to
continue forward.

Future work should integrate Registry/Capability architecture rather than
performing an unnecessary authorization rewrite.

---

## ADR-008 — Canonical Crop Persistence Belongs to CropsService

**Status:** ACTIVE

Intake delegates canonical crop persistence to:

CropsService.createFromIntake()

This keeps crop ownership inside CropsService.

---

## ADR-009 — Field Validation Is Canonical

**Status:** ACTIVE

Resource field validation should use the central Registry/Field Policy
definition.

Frontend/API/service layers should not invent conflicting field rules.

---

## ADR-010 — Incremental and Reversible Migration

**Status:** ACTIVE

Platform migration must:

- Preserve working behavior.
- Preserve ownership/security.
- Reuse existing infrastructure.
- Avoid destructive replacements.
- Keep migrations reversible where practical.
- Move one coherent architectural layer at a time.

---

## ADR-011 — Git Checkpoints Define Stable Versions

**Status:** ACTIVE

Meaningful architectural milestones should be:

1. Tested.
2. Built.
3. Verified.
4. Committed.
5. Reflected in the CTO Master Blueprint.
6. Reflected in the Changelog.

---

## ADR-012 — Stop Investigation Once the Decision Is Supported

**Status:** ACTIVE

Investigation is valuable only while it changes the implementation decision.

Once sufficient evidence exists:

**stop auditing → implement → test → checkpoint.**

Broad audits and theoretical refactoring should not displace required
implementation work.

---

## ADR-013 — Blueprint Is a Living Project Artifact

**Status:** ACTIVE

The CTO Master Blueprint is maintained inside the repository.

It is updated at meaningful versioning milestones and whenever major
architectural corrections occur.

The repository document represents stable project reality; chat history is
supporting context, not the sole source of truth.

---

## ADR-014 — Security Is Cross-Platform

**Status:** ACTIVE

Security requirements apply across:

Web, Mobile, Desktop, API, Browser Storage, Network, Logs, Backups, and
Integrations.

Passwords, tokens, personal data, business data, farm data, and files must
receive appropriate protection across those boundaries.

---

## ADR-015 — AI Must Respect Platform Authorization

**Status:** ACTIVE

AI context must be assembled only from data the requesting actor is
authorized to access.

Target:

Authorization → permitted context → AI abstraction → provider.

AI does not bypass platform authorization.
---

## ADR-016 — Resource Movement Is Business History

**Status:** ACTIVE

ResourceMovement is a first-class business-history layer separate from technical AuditEvent records and temporal ResourceRelationship records.

The movement foundation must preserve, where applicable:

- affected resource identity;
- source and destination user/resource references;
- movement type;
- effective business time and recorded system time;
- quantity or portion for partial movement;
- previous-movement linkage;
- transaction and evidence references;
- creator/updater attribution.

Movement records must not silently rewrite prior relationship history. Partial sale and transfer scenarios will use movement history together with ResourceLineage to preserve continuity.


---

## ADR-017 — Evidence Is a Secure Reference Layer

**Status:** ACTIVE

Relationship and movement evidence must be represented as controlled reference
metadata, not as an uncontrolled document-content store.

ResourceEvidence may preserve:

- evidence type;
- reference type and reference value;
- document/transaction number;
- issuer and relevant dates;
- integrity hash;
- structured metadata;
- creator/updater attribution.

Evidence may be linked to temporal relationships and business movements.

Actual document/file storage remains a separate concern. Authorization must
govern access to any underlying document or external record.

This keeps relationship truth, evidence references, file storage, and technical
audit as distinct platform responsibilities.

---

## ADR-018 — Temporal Relationship Is Authoritative for New Farm Access

**Status:** ACTIVE

For Farm access, the temporal ResourceRelationship context is evaluated before
the legacy Farm.ownerId compatibility field.

The existing Farm.ownerId remains a compatibility fallback only when no
temporal relationship history exists for the farm.

This prevents a stale current-state owner field from silently overriding an
explicit relationship lifecycle such as transfer, termination, or revocation.

The rule preserves backward compatibility for pre-relationship farms while
making the V0.3 relationship model authoritative as soon as relationship
history exists.
