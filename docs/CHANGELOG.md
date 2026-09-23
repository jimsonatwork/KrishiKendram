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

## Versioning Rule

At every coherent architectural milestone:

1. Verify implementation.
2. Run focused tests.
3. Run required build/integration checks.
4. Commit the milestone.
5. Update `CTO-MASTER-BLUEPRINT.md`.
6. Update this changelog.
7. Record any changed architectural decision.

