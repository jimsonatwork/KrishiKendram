# CTO Enhancement Register
## KrishiKendram — Persistent Completion Backlog

> Persistent, version-controlled record of enhancements, deferred technical-completeness work, and hardening items discovered during execution.

## Status Legend
- **MUST** — required before technical-completeness/release closure
- **NOW** — must be addressed during the current functional pass
- **LATER** — intentionally deferred until the appropriate completion pass
- **DONE** — implemented and verified

## Execution Rules
1. Preserve this register in Git.
2. Add newly discovered enhancements here rather than relying on chat memory.
3. Update status and evidence when completed.
4. Never expose secrets, passwords, tokens, private keys, or credential values here.
5. Promote LATER to NOW if an item becomes a correctness, security, or release-safety blocker.

## MUST Enhancements

### E-001 — Central Credential / Secrets Management
**Status:** MUST
**Priority:** High
**Requested:** 2026-09-29

Centralize application credentials and secrets behind one controlled local secret source so backend, Docker, scripts, and future tooling can consume consistent variables.

Scope:
- Formalize the existing local credentials vault.
- Define canonical variable names.
- Add a safe committed example/template containing names only.
- Ensure real credential files remain ignored by Git.
- Add non-secret validation that required variables exist.
- Ensure applications consume secrets through the canonical source rather than duplicated values.
- Document rotation procedure.
- Later support encrypted-at-rest vault storage and unlock/decrypt workflow.
- Production deployment must use an appropriate production secret-management mechanism.

Security rule: actual secret values must never be committed, printed into diagnostics, or stored in this register.

### E-002 — Full Technical Completeness Pass
**Status:** LATER
**Priority:** High

After functional workflows are stable, audit the complete backend/frontend architecture against the CTO Master Blueprint and feature list: architecture, module boundaries, validation, authorization, lifecycle, history, provenance, relationships, performance, reliability, observability, security, migrations, recovery, and production readiness.

### E-003 — Full Feature Blueprint Gap Audit
**Status:** LATER
**Priority:** High

Compare actual implementation against the complete domain/feature list and record missing, partial, deferred, and production-ready capabilities. Do not declare completion from module existence alone.

## Functional-Phase Enhancements

### E-004 — End-to-End Workflow Verification
**Status:** NOW
**Priority:** High

Verify representative real workflows across UI → API → database → authorization → history → UI. Fix genuine defects exposed by integration.

### E-005 — Authorization / Ownership Final Matrix
**Status:** LATER
**Priority:** High

Verify OWN/FARM/GLOBAL scopes and CRUD/archive/restore behavior through real application workflows, including cross-farm denial and relationship changes.

### E-006 — History / Lifecycle Reconstruction
**Status:** LATER
**Priority:** High

Verify meaningful create/update/delete/archive/restore/transfer operations preserve actor, time, before/after/context and allow useful reconstruction.

### E-007 — Production Configuration Hardening
**Status:** LATER
**Priority:** High

Finalize production CORS, secrets, authentication, database configuration, logging, health/readiness, migration strategy, restart behavior, and container configuration.

### E-008 — Portability / Fresh-Environment Verification
**Status:** LATER
**Priority:** Medium

Prove the application can be reconstructed from repository + documented configuration + migrations without hidden dependence on this workstation.

### E-009 — Break-Glass Super Admin Recovery
**Status:** DONE
**Priority:** Critical
**Requested:** 2026-09-29

Provide a deliberately separate, local-only recovery route for administrative access when the normal authentication/user lifecycle is unavailable or corrupted.

Requirements:
- Keep the recovery identity outside ordinary registration and UI flows.
- Store the recovery password as a one-way password hash, never plaintext or reversible encryption.
- Keep the recovery credential file outside Git with restrictive permissions.
- Require explicit local/operator invocation; never expose an unauthenticated HTTP backdoor.
- Permit recovery of an existing Super Admin or controlled creation when no usable Super Admin remains.
- Record recovery actions in the normal audit/history model where the database is available.
- Provide a documented rotation/recovery procedure.
- Keep the mechanism usable after ordinary account status/permission failures.

## Discovery Rule

Every material enhancement discovered during functional testing, UI work, security review, performance work, or feature-gap analysis should be added here with a stable ID before being forgotten or deferred.

## Completion Rule

An item is not **DONE** merely because code exists. Mark it DONE only after implementation and appropriate verification evidence are recorded.

## 2026-10-03 CTO Progress

- Canonical project root is WSL Ubuntu-26.04 `/home/jj/Dev/KrishiKendram`; Windows `D:\Dev\KrishiKendram` is not the active source tree.
- Canonical filesystem resource registry is `backend/config/resource-paths.json`, including the Super Admin runtime/image resource.
- Break-glass Super Admin recovery is implemented as a local operator command and is not exposed as an HTTP backdoor.
- Added committed environment contract names and non-secret validation via `npm run check:env`; real `.env` values remain outside Git.
- Added `npm run recover:super-admin` and corrected the legacy bootstrap script alias to the canonical recovery implementation.
- WSL backend/frontend were restarted after the changes; API, UI, and Super Admin image each returned HTTP 200.
- Backend regression: 42 suites / 387 tests passed. Backend production build passed. `git diff --check` passed.

## Next Review

After the first complete application workflow pass, review this register and reprioritize before beginning the technical-completeness pass.

## Product Expansion — Controlled Future Scope

### E-010 — Indian Language / Localization Platform
**Status:** LATER
**Priority:** High
**Requested:** 2026-10-02

After core application stability is established, introduce a platform-level localization architecture covering all Indian languages required by the product, with centralized translation keys, user language preference, English fallback, locale-aware dates/numbers/units, and an extensible language catalog. Language preference must not alter authorization or business rules.

### E-011 — Farmer AI Assisted Data Capture
**Status:** LATER
**Priority:** High
**Requested:** 2026-10-02

Design a governed AI-assisted input workflow for farmers who may have difficulty typing. Target inputs include voice conversation, photographs/scans, and mixed input. The assistant should ask simple question-and-answer prompts, extract proposed field values, show a confirmation/edit step, then persist only through normal authorized application APIs. AI must never bypass validation, authorization, provenance, history, audit, or consent boundaries. Initial implementation should focus on voice + photo-assisted structured form filling; document and video inputs can follow later.

**Architectural dependency:** E-011 uses the AI abstraction/security boundary defined in the CTO Master Blueprint and is deferred until core workflows are stable enough to provide trustworthy target schemas.

### E-012 � God Mode Authoritative Control Plane
**Status:** NOW / ARCHITECTURE BASELINE
**Priority:** Critical
**Requested:** 2026-10-04

Build God Mode as the authoritative administrative control plane for all governed KrishiKendram configuration and operations. Full architecture is defined in `docs/GOD-MODE-ARCHITECTURE.md`.

Scope includes centralized system truth, runtime, database/connections, Docker/infrastructure, modules/registry/resources, fields/validation, authorization/delegation, users/lifecycle, navigation, themes, feature flags, security, approval workflows, credentials, audit/history, snapshots/recovery, route diagnostics, system diagnostics and dependency graph.

Required mutation contract: validate ? dependency analysis ? snapshot ? apply ? health-check ? audit. God defines delegated capabilities for Super Admin/Admin/Cluster Head. No required administrative operation should force source-code editing once the governed configuration contract exists.

Acceptance requires canonical ownership, persistent editable settings, dependency impact, snapshot/audit coverage, tested rollback, safe infrastructure controls, credential rotation policy and verified canonical repository/path truth.

**Pre-expansion checkpoint:** `0b01374 Checkpoint God Mode control center before architecture expansion`.
