# KrishiKendram — Canonical Module Execution Plan

**Plan version:** 1.0
**Last updated:** 2026-10-30 09:22 IST
**Execution branch:** main (765216a); create a fresh CBA feature branch from this verified base
**Execution owner:** CTO workflow
**Canonical checkpoint:** one root timestamped YYYY-MM-DD_HHMMSS execution-plan Markdown file

## Mission and operating rules

Build the complete KrishiKendram Agri-OS as a sequence of finished, integrated modules. Do not confuse code presence, a green build, or mocked browser tests with module completion. Work from the existing product requirements and repository; reuse the established central Registry, authorization, audit, history, relationships, and domain services. Do not start speculative infrastructure or repeatedly redesign already accepted contracts.

1. Keep exactly **one active module/work package**. Finish its implementation and acceptance gate before moving on. Parallelize independent tests, code review and documentation only when they do not compete for the same files or database state.
2. Do not pause for routine permission prompts. Continue through safe, reversible engineering work. Ask only for genuinely consequential decisions (live money movement, external data sharing, irreversible deletion, production secrets, or legal/compliance policy).
3. Preserve existing source, user data, database volumes, recovery backups and migration audit history. Never reset the database to make tests pass.
4. Central Registry owns canonical fields, enums, defaults, validation metadata, capabilities, module dependencies and feature configuration. No copied field-validation logic and no direct cross-module table writes.
5. Every mutation must enforce authorization and parent-state rules server-side, use the owning domain service, and preserve actor-attributed audit/history/provenance. Archive is reversible; historical business records are not hard-deleted.
6. Keep Store/Shop (shopper experience) separate from Marketplace (seller/provider operations). Inventory owns stock; Finance owns ledger and reconciliation; Marketplace coordinates through typed service contracts.
7. Report progress briefly with verified evidence. Update this plan and the root timestamped checkpoint at least every 20 minutes or at each work-package boundary. If the development device or terminal stalls, stop and report the actual blocker; never imply background progress.
8. Commit/push only after the module passes its acceptance gate using the project CBA process. Do not bundle unrelated unfinished modules into a release.

## Module completion gate — required for every module

A module is COMPLETE only when all applicable points are evidenced:

- Product requirements and workflows reconciled against PMD, CTO Execution Bible, module roadmap and current code.
- Registry resource/field/capability/feature definitions cover fields, values, defaults, validation, dependencies and Admin/Super Admin/God controls.
- Backend APIs, DTOs, domain service, server-side validation, authorization and fail-closed negative cases are complete.
- Transactions, idempotency, parent/child lifecycle, ownership and cross-module boundaries are correct; no duplicate source of truth.
- Audit, history, provenance, evidence, archive/restore and actor attribution are correct for the module.
- Frontend workflows cover create/read/update and applicable archive/restore/approval/decision flows, including loading, empty, error, disabled, denied, responsive/mobile and accessible states.
- Unit/service tests, API/database transaction tests and browser journeys pass with real authenticated roles; mocked tests are useful but do not replace DB-backed acceptance.
- Cross-module integration, Prisma migration status, runtime health, backend/frontend builds and security/dependency checks pass.
- PMD, Bible, module docs, roadmap and execution checkpoint match the implementation. CBA commit/push is complete or explicitly recorded as blocked.

## Execution order and work packages

### Gate 0 — Close the active Store + Farm release candidate

**Current state:** migration reconciliation, authenticated DB-backed role acceptance and Store/Farm browser acceptance are complete; the latest Shop/Finance delta has passed full backend/frontend regression and builds; CBA promotion remains.

1. Verify the full backend suite and post-migration backend/frontend builds.
2. Run authenticated DB-backed role acceptance for Farm, FarmAsset, FarmRecord, Crop, Livestock, Marketplace and Shop. Add missing tests rather than treating mocked browser tests as production acceptance.
3. Verify booking, listing-Q&A and FarmAsset soft-archive APIs against the migrated live schema; exercise authorization, archive/restore, participant privacy and negative cases.
4. Close defects, rerun all gates, review diff and CBA. Commit/push only verified Store + Farm work.

### Gate 1 — Platform, Registry, authorization and administration

Close platform runtime/configuration and migration health; central Registry/Field Policy coverage; role/capability/scope authorization; module lifecycle/dependencies; Admin, Super Admin and God Mode parity, approvals, reason capture, versioning, audit and rollback-safe toggles. Verify feature-off semantics preserve historical access and required dispute/audit operations.

### Gate 2 — Identity, Authentication, Users and Organizations

Complete registration/sign-in/session/refresh/recovery, role and organization membership, person/business/provider profiles, field policies, consent, privacy, account lifecycle, history and real-role browser journeys.

### Gate 3 — Audit, History, Provenance and shared lifecycle primitives

Close canonical event attribution, entity timelines, source/confidence/correction history, evidence, retention, reversible archive/restore and cross-module temporal consistency. Reuse existing ResourceRelationship, ResourceMovement, ResourceLineage and RelationshipEvidence contracts.

### Gate 4 — Core Farm Management

Complete sequentially: **Farms → Farm Assets/Equipment/Resources → Farm Records → Crops/Crop Lifecycle → AI Intake/Guided Capture → Livestock/Veterinary**. For each: ownership and parent-state rules, Registry fields, CRUD/lifecycle, immutable operational history where appropriate, evidence, audit, UI and real-role acceptance. FarmRecord is append-only operational history, not an ordinary mutable CRUD resource.

### Gate 5 — Inventory

Complete stock/catalog units, lots, receipts/issues/adjustments, reservations, transfers, returns, reorder thresholds, valuation and audit. Preserve Inventory as source of truth and integrate Marketplace/Shop only through its domain services.

### Gate 6 — Finance and Accounting

Complete chart/accounting model, income/expense, quotes/receipts references, buyer/seller fees, tax profiles and jurisdiction-aware calculation, immutable ledger, settlement/reconciliation, reports, idempotency and authorization. Live capture, payout, refund and tax remittance remain disabled until provider, security, legal/accounting and explicit release gates pass.

### Gate 7 — Marketplace and Shop

Complete typed workflows for product purchase, rental, booking, appointment, service quote, job, digital delivery, subscription, RFQ, offer, negotiation, order, delivery, receipt, dispute, review, caution and appeals. Keep Shop as shopper-first discovery and Marketplace as provider/seller operations. External media must be safe, consented, allowlisted and clearly attributed. Public visitor/profile statistics must be privacy-safe aggregates.

### Gate 8 — Shared product services

Complete Context/Eligibility, Notifications/Alerts, Reports/Analytics, Search/Discovery, Documents/Photos/Video/Media, Messaging/Collaboration and External Integrations/Events. Each service must have an owner, versioned contract, access policy, retention rules, observability and cross-module acceptance.

### Gate 9 — AI Platform and process-style assistant

Complete provider registry and local-first model runtime, tool contracts, authorized context, safe Registry-backed writes, multilingual auto-detection, voice/text/photo capture, original-language plus normalized English storage, confidence/review, explicit confirmation, missing-field follow-ups, resumability, immediate stop/cancel, latency telemetry and evaluation. No direct model-to-database writes; paid/cloud providers remain opt-in and disabled by default unless explicitly configured.

### Gate 10 — Security, Production and Operations

Complete threat and privacy review, dependency remediation, secrets, backup restore drills, observability, incident/runbook, deployment, rollback, migration discipline, performance and real production-like role acceptance. Only then claim production readiness.

### Gate 11 — Later breadth

Knowledge/Education and additional Agri/community domains (soil, water, weather, subsidies, SHGs, logistics and others) start only after core module contracts and release gates are stable.

## Current execution ledger — 2026-10-30 09:22 IST

| Work package | Status | Evidence / remaining gate |
|---|---|---|
| Store + Farm implementation | IN PROGRESS — release candidate | 710 backend tests passed before migration; 10 selected mocked browser journeys passed; backend/frontend builds and Prisma validation passed before migration. Re-run full suite/builds post-migration and add authenticated DB-backed role acceptance. |
| Migration reconciliation | COMPLETE | Full pre-migration dump verified (292,998 bytes; restore-list 528 entries). Exact duplicate historical SQL restored with matching SHA-256. Prisma migrate resolve --applied succeeded; 3 additive migrations deployed. Prisma migrate status: 59 migrations, schema up to date. Live schema and history rows verified. |
| Platform / Registry / Admin | PARTIAL — next after active RC | Close field/resource/capability inventory, module dependency lifecycle and authenticated role matrix. |
| Identity / Users | PARTIAL | Real-role registration/session/profile/organization acceptance remains. |
| Audit / History / Provenance | PARTIAL | Consolidated cross-module event and timeline acceptance remains. |
| Farm stack | IMPLEMENTED FOUNDATION — acceptance open | Real-role and live DB workflows remain; FarmRecord immutable semantics retained. |
| Inventory / Finance | FUNCTIONAL SLICES — completion open | Full stock and accounting lifecycle + transaction integration gates remain. |
| Marketplace / Shop | ADVANCED FUNCTIONAL SLICES — completion open | Real-role typed workflows and release gates remain; live money movement stays disabled. |
| Shared services / AI / Production | PARTIAL / PLANNED | Follow execution order; do not divert from active module. |

## Repository hygiene rules

- Keep one canonical living execution plan plus one root timestamped checkpoint. Archive unique historical checkpoints under docs/archive/execution-plans/; remove only byte-identical duplicate snapshots after preserving the newest copy.
- Preserve .cto-backup, source-level recovery copies, database dumps and recovery folders until their contents are reviewed and their replacement is verified. Never delete by filename pattern alone.
- Remove generated Playwright result/report folders after the test evidence is recorded; retain dependency caches and build outputs when they are used by the running development environment.
- Delete obsolete code only after reference/import search, test coverage review, Git diff review and backup/recovery check. Do not delete migrations, schema history, seed data or user-owned files as cleanup.

## Change-control

Any new requirement is first reconciled against this plan, PMD, CTO Execution Bible, the relevant module contract and Registry. Update affected docs and implementation together. Do not silently reorder the work. A dependency may move earlier only when the active module cannot safely proceed without it; record the reason and return to the defined sequence immediately afterward.

## Store + Farm release-candidate evidence — 2026-10-30 09:34 IST

- Post-migration backend unit regression: 71 suites / 710 tests passed.
- Backend Nest build passed. Frontend TypeScript/Vite production build exit 0; main chunk warning remains for later performance work.
- Backend live-DB E2E: 4 suites / 28 tests passed, including Farm create/archive/restore, FarmAsset create/archive/restore, Marketplace public Q&A/private sample request and seller answer, existing auth/Farm/Crop/Livestock/Intake journeys.
- Registry/role policy gaps found during real authorization checks were closed through audited God Mode capability policy. FarmAsset declares RESTORE and softDelete; Marketplace listing-question CREATE/OWN is enabled for active participant roles.
- Final mocked browser acceptance repeat is running. Once it passes, complete CBA promotion. Next module: Platform / Registry / Authorization / Admin closure.

## Final Store + Farm acceptance — 2026-10-30 09:40 IST

- Backend unit: 71 suites / 710 tests passed. Backend build passed. Frontend build exit 0 (non-fatal main bundle size warning).
- Authenticated live PostgreSQL E2E: 4 suites / 28 tests passed.
- Browser acceptance: 10/10 passed after migration deployment.
- Prisma: 59 migrations; database schema up to date. Pre-migration full dump retained and verified; rolled-back duplicate history preserved.
- Store + Farm: READY FOR CBA PROMOTION. Next active work package: Gate 1 Platform / Registry / Authorization / Admin. Do not start Gate 1 until CBA promotion is complete and canonical main is updated.

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