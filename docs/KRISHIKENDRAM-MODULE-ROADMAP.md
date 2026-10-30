# KrishiKendram — Canonical Module Inventory and Completion Roadmap

**Checkpoint:** 2026-10-29
**Purpose:** Align core-module sequencing, completion evidence, Registry ownership, and advanced technology decisions. This inventory is a working product roadmap, not a claim that every module has passed its final acceptance gate.

## Non-negotiable architecture

KrishiKendram is a modular Agri-OS. The Central Platform/Registry is the source of truth for module contracts: reusable fields, data types, allowed values, defaults, requiredness, normalization, validation, capabilities, dependencies, lifecycle and UI metadata. Shared rules are defined once; module-specific rules remain owned by their domain. Backend validation and authorization are authoritative. Frontend forms may be generated from the same contract but must not become a second policy engine.

Keep distinct concerns distinct:
- Registry declares resources/capabilities and module contracts.
- Authorization decides access; unsupported scope fails closed.
- Field Policy controls field-level validation/transformation/visibility.
- Audit records actor-attributed changes; History presents lifecycle over time; Provenance records source, confidence, corrections and derivation.
- Domain services own their data. Other modules integrate through authorized service contracts/events, not direct table writes.
- Module toggles must preserve data and distinguish hide/disable from deletion. Dependencies and global safety controls must be enforced.

## Completion vocabulary

- **Partial / active:** useful implementation exists, but complete authenticated workflow and acceptance evidence is not closed.
- **Functional slice:** important paths exist, but broader edge cases, integration or release gates remain.
- **Planned:** required direction, not yet a complete implementation.
- A build or mocked browser test alone does not make a module complete. Completion requires Registry/validation, authorization, audit/history, real API and UI workflow, error/empty/loading states, tests, runtime and dependency checks.

## Module inventory

| # | Module / capability | Purpose | Current status (evidence-based) | Next completion focus |
|---|---|---|---|---|
| 1 | Platform foundation | Runtime, configuration, database, migrations, API contracts, shared UI foundation | Partial / active | Safe migration history, health/runtime, release hardening and dependency-aware module lifecycle |
| 2 | Identity, Authentication & Sessions | Sign-in, registration, session/refresh, account state | Functional baseline; hardening remains | Real authenticated role E2E, session/security edge cases, recovery and production controls |
| 3 | Users, Organizations & Profiles | Person/business/provider identities and reusable profile facts | Partial | Role and organization workflows, field policy, consent, history and cross-module profile boundaries |
| 4 | Roles, Permissions & Authorization | Central policy decisions, scope/resource/field access | Core foundation exists; integration closure remains | Registry capability integration, full role/scope matrix, fail-closed tests and Admin UX |
| 5 | Central Registry & Field Policy | Module/resource/field contracts, common values/validation, dependencies and UI metadata | Strong foundation; coverage/lifecycle incomplete | Audit every active field and module, remove duplicate rules, add schema/contract coverage and versioned configuration |
| 6 | Admin, Super Admin & God Mode | Module toggles, capability/policy management, configuration governance | Partial | Verify all applicable controls, reasons/audit/versioning, dependencies and rollback-safe changes |
| 7 | Audit, History, Provenance & Lifecycle | Actor attribution, record timelines, source confidence, archive/restore and temporal relationships | Significant foundation; cross-module closure remains | Unified audit coverage, provenance and correction trails, retention, archived-parent and cross-module timeline acceptance |
| 8 | Farms | Farm identity, location, ownership, status and farm-level operations | Functional foundation; final gate open | Full authenticated create/edit/archive/restore and relationship/history workflows |
| 9 | Farm Assets / Equipment / Resources | Equipment, land/resource assets, custody, leases, transfers, split/merge and lineage | Advanced lifecycle foundation; final gate open | Real-role E2E, edge-case lifecycle matrix, evidence and history continuity |
| 10 | Farm Records | Operational records, observations and farm activity records | Partial / active | Direct and composite write atomicity, parent-state enforcement, validation, audit and historical reads |
| 11 | Crops & Crop Lifecycle | Crop registration, season, variety, area, stage, activity and harvest lifecycle | Functional slice; final gate open | Canonical Registry contracts, parent/ownership checks, stage/season lifecycle and authenticated acceptance |
| 12 | AI Intake & Guided Data Capture | Voice/text/photo intake, missing-field questions, extraction and confirmed writes | Partial / active | Original-language and normalized/translated values, confidence/review, confirmation, cancellation, resumable follow-ups and real voice E2E |
| 13 | Livestock & Veterinary workflows | Animals/herds, lifecycle, health events, breeding/production and reminders | Functional slice; final gate open | Full record lifecycle, health/production workflows, permissions, reminders and real-role acceptance |
| 14 | Inventory | Stock, units, lots, movements, reorder thresholds, source-linked listing stock and returns | Functional slice; independent domain must remain | Full stock lifecycle, adjustment/returns/reservations, valuation rules, audit and cross-module transactional acceptance |
| 15 | Finance & Accounting | Income/expense ledger, quotes/receipts references, settlement statements, fees/taxes, reconciliation and payout controls | Functional slice; money movement intentionally gated | Clear accounting model and currency boundaries, idempotency/reconciliation, provider integration, tax/legal/accounting review |
| 16 | Marketplace (provider/seller workspace) | Listings, providers, negotiation, messaging, RFQs, offers, orders, trust, disputes and governance across domains | Advanced functional slice; not production-complete | Typed action/workflow for every offering type, real-role E2E, seller/provider onboarding, abuse/trust controls and release gates |
| 17 | Shop (shopper-first storefront) | Separate ecommerce-style discovery and purchase-intent experience without replacing Marketplace operations | Implemented functional slice; not production-complete | Excellent responsive discovery, personalization with consent, availability/view analytics, product comparison, reliable cart/order requests and end-to-end acceptance |
| 18 | Context & Eligibility Engine | Registry-driven progressive questions and eligibility before a listing action/quote/booking | First increment implemented | Policies for every offering type; reusable rules, context provenance, user corrections, privacy/consent and typed workflow handoff |
| 19 | Notifications & Alerts | In-app events, severity, deduplication, read state and expiry | Functional slice | Verify event coverage and permissions; external email/SMS/push adapters remain optional integrations |
| 20 | Reports & Analytics | Authorized cross-domain read-only summaries, filters and exports | Backend workflow implemented; final UX/release gate open | Role/farm/date acceptance, explainable as-of/data-scope, performance and robust export/UI states |
| 21 | Search, Discovery & Recommendations | Unified discovery across products, services, providers and knowledge | Partial storefront search only; full shared service planned | Start with indexed/filterable search and relevance; later add ranking/recommendations with explainability and consent |
| 22 | Documents, Photos, Video & Media | Safe upload, ownership, storage, previews, links and evidence | Partial listing media/link support; production storage gate open | Durable object storage, content/type/size checks, malware scanning where appropriate, signed access URLs, retention and privacy |
| 23 | Messaging & Collaboration | Buyer-provider messages, conversations and notifications | Messaging slice exists; broad collaboration remains | Delivery/read state, abuse controls, attachment safety, notification integration and provider-consented external sharing |
| 24 | AI Platform / Agent Runtime | Provider registry, model adapters, tool contracts, context permissions and local/open-source model support | Partial; model/provider runtime and user experience need hardening | Fast local-first inference, cancellation/timeouts, safe tools, caching, evaluations and opt-in provider adapters; no direct DB writes |
| 25 | Security, Privacy & Consent | Data minimization, secrets, retention, consent, threat controls and safe sharing | Foundations exist; comprehensive audit remains | Threat model, dependency remediation, media/payment security, access review and privacy tests |
| 26 | External Integrations & Events | Typed contracts for logistics, storage, labs, government, veterinary, payments, communications and other systems | Planned / selective integration slices | Versioned events, idempotency, retries/dead letters, observability and explicit consent/authorization |
| 27 | Additional Agri domains | Land/soil, water/irrigation, weather, farm operations, subsidies, SHGs/community and logistics | Planned domain expansion | Add only when core platform and domain contract patterns are stable; reuse shared registry, history and authorization |
| 28 | Knowledge / Education | Curated learning content, courses, lessons and progress; potential Marketplace provider category | Later optional module/integration; not current priority | Revisit after core modules; do not divert from the current core sequence |
| 29 | Production & Operations | Deployment, backups/recovery, observability, migrations, incident and release procedures | Partial development baseline; not production-ready | Restore-tested backups, monitored deployments, security/release gates, rollback and operational runbooks |

## Marketplace and Shop: advanced target

Treat Marketplace and Shop as two distinct experiences over shared contracts:
- **Marketplace workspace:** seller/provider operations, listing management, inquiries, offers, RFQs, negotiations, messages, orders/requests, disputes, trust and administration.
- **Shop storefront:** shopper-first catalog, category/type discovery, date-based recency, filters, comparison, favorites, seller credibility, media, visitor/session aggregates, offers/cart and order requests.
- **Typed workflows:** product purchase, rental booking, appointment, job application, digital delivery, subscription, service quote, logistics request, public-service/tender, donation/barter and other offering types must not all become generic product orders.
- **Commercial controls:** transparent buyer/seller fees, jurisdiction-aware tax calculation, invoices/receipts, currency-safe ledgers, refunds, disputes, chargebacks, settlement and payouts. Real money movement and tax remittance stay disabled until the provider, security, legal/accounting and authenticated role acceptance gates pass.
- **Trust and safety:** buyer/seller ratings and comments, caution signals, reasoned time-bound/permanent restrictions, evidence-backed disputes, fraud/abuse review, privacy-safe public profiles and audit trails.
- **Inventory integration:** Inventory owns stock, movement and valuation; Marketplace calls its authorized domain contract. Never duplicate stock or ledger tables.
- **Finance integration:** Finance owns financial records and reconciliation; order requests do not automatically become captured payments or cash income.
- **Visitor analytics:** aggregate unique sessions for defined windows; avoid storing raw IPs or implying that a session count identifies real people.
- **Context capture:** ask only for fields relevant to the selected offering/action; keep optional context optional and enforce mandatory safety/legal checks server-side.
- **Advanced technology:** start with Registry-driven schema/forms and PostgreSQL-backed filtering/search; introduce a dedicated search index (e.g. OpenSearch) only when relevance/scale justifies operations cost. Use an event/outbox pattern for reliable cross-domain events when asynchronous integrations are introduced. Use object storage with signed URLs for media; a reviewed payment-provider adapter and idempotent webhook processing before live payments. Add recommendation/ranking models only after trustworthy catalog, consent and measurable evaluation data exist.

## Recommended implementation order

1. **Platform and Registry closure:** inventory every active module/resource/field, confirm global vs module-specific validation ownership, close Registry/Authorization/Field Policy integration and safe lifecycle toggles.
2. **Core farm stack:** Farms → Farm Assets → Farm Records → Crops → Intake → Livestock. Close real workflows, history, authorization, parent-state and transactional invariants; do not create a new domain to avoid finishing these.
3. **Inventory and Finance:** independently owned, Registry-backed domains; ensure Marketplace integrations call their service contracts.
4. **Marketplace and Shop:** keep improving the separate storefront and provider workspace; complete typed workflows and trust/governance without enabling real money movement prematurely.
5. **Shared services:** Notifications, Reports, Media, Search, Messaging, audit/history/provenance and integrations; close their cross-module acceptance gates.
6. **AI platform and advanced automation:** improve local-first, multilingual, process-style AI using safe Registry-backed actions only after core workflow contracts are stable.
7. **Release readiness:** authenticated E2E with real roles, security/dependency review, migration reconciliation, restore test, observability and deployment runbooks.
8. **Later breadth:** Education/Knowledge and additional agri/community domains after the core sequence.

## Definition of done per module

A module is only marked **COMPLETE** when all applicable checks pass:
1. Registry contract covers fields, enums, defaults, shared and module-specific validation, capabilities and dependencies.
2. Backend authorization and server-side validation enforce the same contract; no direct cross-domain table writes.
3. Create/read/update/archive/restore or the relevant lifecycle paths preserve audit, history and provenance.
4. Frontend loading, empty, error, disabled, permission-denied, mobile and accessibility states work.
5. Tests cover service/unit, API/DB transaction and browser workflows, including negative/security cases with authenticated roles.
6. Runtime health, migration status and cross-module regression pass.
7. Documentation and timestamped execution checkpoint agree with the verified repository state.
8. Commit/push follows the project CBA gates; never hide an unresolved migration mismatch or claim a mocked test as real-DB acceptance.

**Current execution focus:** close the correct core module sequence and Registry/Authorization integration while preserving the already-built Marketplace/Shop. Education and broader domain expansion remain deferred.

## Mandatory cross-chat/module-plan change-control standard (2026-10-29)

Before accepting a module plan or material chat-driven change, cross-check this inventory, the PMD, CTO Execution Bible and canonical Module Execution Plan, plus the relevant domain architecture/governance documents, Registry module/resource/field/capability definitions, feature dependencies, authorization policy, data ownership, migrations, audit/history/provenance, consent/privacy, tests and the current execution checkpoint. Update all impacted artifacts together. A plan cannot mark work complete without implementation and evidence; status labels must reflect verified repository/runtime results. Preserve existing changes and migration history, and use CBA gates before commit/push.

### Shop and Marketplace expansion standard

Shop remains a separate shopper-first template; Marketplace remains the seller/provider and governance workspace. Both use central contracts and existing domain services. Support seller-selected uploads or external HTTPS media references, allowlisted social demo/review embeds with source attribution and link fallback, and persistent listing Q&A for product doubts, sample requests and bulk/MOQ enquiries. Store platform-observed questions, answers, RFQs, offers, decisions, disputes and consented evidence with participant-scoped authorization and audit. External activity is not observable/verified unless an authorized integration confirms it; link-outs must explain protection boundaries.

Expose public member-since month/year and privacy-safe seller/buyer activity statistics only from authoritative eligible records (verified completed purchases/sales, response/fulfilment metrics and verified reviews). Exclude cancelled/test/duplicate transactions, do not expose private counterparties/spend, distinguish verified and self-reported metrics, and show insufficient data honestly. Provide mutual reviews, dispute/return evidence, seller response, moderation, appeals, scoped restrictions and privacy-safe aggregate visitor sessions.

Every feature, limit, dependency and approval must be centrally configurable and server-enforced with appropriate Admin/Super Admin/God Mode controls. Off means no new use; it must not delete historical data or block necessary audit, dispute, refund or record access. Inventory owns stock; Finance owns ledger and reconciliation; Users owns profile identity; Media owns media; Notifications/Search/Audit/History/Provenance remain shared services. No duplicate sources of truth or direct cross-module table writes. Real money movement and unverified external integrations remain gated by provider/security/legal/accounting and authenticated E2E acceptance.

### Q&A and trust statistics implementation gate — 2026-10-29 23:41:48 IST

Marketplace/Shop now has a working-tree implementation slice for persistent listing Q&A, private sample/bulk enquiries, supplier answers, audit/notifications, central feature definitions/configuration, server-side configurable limits, safe external HTTPS links and allowlisted video embeds, plus opt-out aggregate public profile stats. Status remains **implementation-in-progress**: focused service tests pass 75/75, Prisma schema validation passes, backend build has no TypeScript errors, and frontend production build passes with a large-chunk warning. Privacy/authorization runtime and role-based browser checks remain pending. The additive migrations are not applied; reconcile the known missing migration-history entry first.

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


## Store + Farm completion sprint checkpoint — 2026-10-30 07:55 IST

The user has directed completion of both Store and Farm Management before moving to another module. Execute both workstreams in parallel only where repository/runtime resources allow; otherwise close each workflow sequentially without switching scope.

### Store / Shop acceptance scope
- Keep /app/marketplace (seller/provider workspace) and /app/shop (shopper-first storefront) distinct.
- Complete product/service/rental/booking/digital/subscription/RFQ/public-service/knowledge/donation/job/logistics typed offering workflows; do not coerce all types into a product order.
- Complete seller profile/listing lifecycle, safe upload/external links, Q&A, private sample/bulk enquiries, visitor session analytics, comparison/cart/order request, buyer/seller history, reviews, moderation, caution/restriction, evidence-backed disputes, settlement statements and admin governance.
- All feature flags, dependencies, limits and approvals are centrally configured and server-enforced with reason/audit/version. Feature-off blocks new actions without deleting history or blocking dispute/audit access.
- Inventory owns stock; Finance owns ledger, fees/tax calculation and reconciliation. Keep live money movement and tax remittance disabled until external provider and compliance gates are satisfied.

### Farm Management acceptance scope
- Farms: authenticated create/read/update/archive/restore, ownership transfer, location/area and relationship/evidence/movement history.
- Farm Assets: create/update/archive/restore, active parent checks, ownership/custody/lease/transfer, split/merge, lineage and evidence history. Hard delete is not an acceptable user-facing lifecycle; preserve history and add a schema-backed archive/restore lifecycle where currently absent.
- Farm Records: append-only operational records, central validation, actor attribution, atomic direct/composite writes, parent-state re-check and authorized timeline reads. Corrections are new records.
- Crops: Registry-backed season/status and crop details, owner/farm checks, forward-only lifecycle progression with failed/harvested terminal states, archive/restore and before/after audit.
- Livestock: herd/animal create/read/update/archive/restore, temporal ownership, operational health/vaccination/treatment/production/weight/breeding/feeding records and due notifications. Creation defaults never overwrite sparse updates; no new child writes under archived farms.

### Evidence checkpoint
- Focused backend regression on 2026-10-30: 188 tests passed across 10 Store/Farm suites after Crop lifecycle, Livestock parent-state/defaults and published-listing visitor privacy changes.
- Full backend build, frontend build, authenticated DB-backed browser E2E and migration release gate remain pending fresh evidence. Store migrations 20261029221500_marketplace_booking_requests and 20261029233000_marketplace_listing_questions remain pending. The database-only rolled-back duplicate 20261004160000_god_mode_authority_tier still needs a Prisma-supported, audit-preserving reconciliation. No database changes have been made to resolve it.
- Both modules remain IN PROGRESS, not COMPLETE. CBA commit/push follows only after tests, runtime, docs, migration and acceptance gates pass.

## Store + Farm verification checkpoint — 2026-10-30 09:06 IST

- Backend regression: 71 suites / 710 tests passed. Backend Nest build and frontend TypeScript/Vite production build exit 0. Prisma schema validation and git diff --check pass.
- Browser journeys: Farm archive/restore 1/1; cross-module Inventory/Finance/Notifications/Reports 1/1; Marketplace buyer/seller workspace 1/1; Shop storefront 3/3.
- Store / Shop and Farm Management are **implementation-verified, release-gated**, not production COMPLETE. Three migrations remain pending and the database has one rolled-back duplicate authority-tier migration absent from local history. No DB changes were made. Authenticated DB-backed role E2E and CBA commit/push remain pending safe migration reconciliation and explicit owner approval.

## Database migration reconciliation finding — 2026-10-30 09:08 IST

- Read-only PostgreSQL inspection confirms the successful 20261004110000_god_mode_authority_tier row and the rolled-back 20261004160000_god_mode_authority_tier duplicate have identical SHA-256 checksums. The AuthorityTier schema is already present from the successful migration.
- The live FarmAsset table does not yet contain deletedAt and still has the old FarmAsset_farmId_createdAt_idx index. MarketplaceBookingRequest and MarketplaceListingQuestion tables do not yet exist. This confirms all three pending migrations are required before those workflows can be accepted against the live database.
- Installed Prisma CLI and client are 6.19.3. Prisma ORM v6 documentation describes migrate resolve --applied as marking a failed/manual-completed migration applied without executing its SQL. Candidate reconciliation: restore the missing duplicate migration folder with the exact historical SQL/checksum, then mark that already-schema-applied duplicate as applied. This changes migration metadata only; it must not execute the duplicate SQL.
- After owner approval and a fresh backup/schema check, deploy only the three reviewed pending migrations. No database change has been performed. Do not reset, delete, or manually edit migration-history rows.

### Additional browser acceptance — 2026-10-30 09:10 IST

- Marketplace governance: 4/4 browser tests passed for Admin blacklist apply/revoke, sandbox chargeback buyer/seller evidence, and consented Farm/Crop context linking. Selected mocked browser acceptance across Store and Farm now totals 10/10. Local UI and API health endpoints both returned HTTP 200; authenticated DB-backed role acceptance remains pending.


## Canonical execution plan — 2026-10-30

Canonical module order, work-package boundaries, module completion gate, repository hygiene rules and current execution ledger are maintained in . The root timestamped execution checkpoint records verified progress. This roadmap remains the module inventory and product acceptance reference.

## Store + Farm live database acceptance — 2026-10-30 09:34 IST

- 71 backend suites / 710 tests pass after migration deployment. Backend build passed; frontend TypeScript/Vite build exit 0 (large main-chunk warning only).
- Real PostgreSQL E2E: 4 suites / 28 tests pass. New coverage verifies Farm create/archive/restore, FarmAsset create/archive/restore, public Marketplace product Q&A, private sample request visibility and seller answers.
- Role policies for FarmAsset restore and Marketplace question creation are declared in the Registry and configured through audited God Mode capability policy. No direct permission-table writes.
- Prisma migration status is up to date at 59 migrations. Final mocked browser repeat and CBA promotion are the remaining Store + Farm closure steps.

## Store + Farm final acceptance — 2026-10-30 09:40 IST

- Backend unit regression 710/710; authenticated PostgreSQL E2E 28/28; selected browser acceptance 10/10.
- Backend and frontend production builds passed; frontend has a non-fatal large-main-chunk warning.
- Prisma reports 59 migrations and the live schema up to date. Full pre-migration database backup retained and verified.
- Store + Farm are ready for CBA promotion. Next execution package: Platform / Registry / Authorization / Admin closure.

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