# Marketplace Commerce, Trust, Tax and Governance Roadmap
Date: 2026-10-17
Status: requirements and architecture guardrails; implementation must be tracked by individual acceptance tests.

## 1. Per-transaction commercial calculation
Every listing must disclose the applicable commercial policy before the buyer commits. The checkout quote must itemize:
- listing subtotal and agreed unit price;
- buyer-side platform fee and seller-side commission, each independently configurable;
- applicable tax lines and who is legally responsible for collection/remittance;
- delivery/shipping, packaging, payment-gateway charges, discounts and adjustments;
- buyer total, seller gross, each deduction, seller net and expected settlement;
- currency, rounding rule, policy version, quote expiry, and a human-readable receipt.
No fee/tax rate may be hardcoded as a legal fact. Rates, thresholds, exemptions, tax codes, place-of-supply rules and invoice obligations require jurisdiction/product/category configuration reviewed by qualified tax/legal advisers. Preserve an immutable calculation snapshot on each order; later policy edits must never recalculate completed transactions. Use decimal-safe money arithmetic and currency minor-unit rounding, not binary floating-point for financial ledger amounts.

## 2. Ledger, payments and settlement
- Separate order state, payment state, refund state and settlement state.
- Append-only transaction ledger with idempotency keys, provider references, signed webhook verification, reconciliation, reversals/credit notes, payout holds and dispute adjustments.
- Never store raw card/UPI credentials. Use an approved payment provider adapter and verified callbacks.
- No actual payment collection or deductions until provider integration, refund path, settlement reconciliation, legal policy, and failure/retry tests are enabled and reviewed.
- Platform fees may be charged to buyer, seller, or both, but configuration must disclose them before confirmation and preserve a versioned snapshot.

## 3. Buyer and seller workspaces
- Buyer history: requested, accepted, rejected, cancelled, completed, refunded and disputed orders; receipts, price/fee/tax breakdown, delivery state, repeat order and complaint actions.
- Seller history: all listings and stock changes; offers and counteroffers; sales and cancellations; gross revenue, platform deductions, taxes/withholding where applicable, refunds, net settlement and downloadable statements.
- Never expose one user's private order history to another. A seller sees only transactions involving that seller and a buyer sees only their own purchases.

## 4. Reputation, comments, cautions and blacklist
- Mutual buyer-to-seller and seller-to-buyer reviews/comments, tied to verified completed transactions, with structured dimensions and an overall score.
- Separate private dispute evidence from public review text. Add report/appeal/moderation and review-response workflows; prevent duplicate reviews and retaliatory edits.
- Display caution indicators with reason category, evidence level, review date, expiry/recheck date and appeal status. Do not publish unverified allegations as established facts.
- Trust risk states: normal, caution, restricted pending review, suspended, and reinstated. Distinguish account suspension, marketplace-only restriction, listing block and transaction hold.
- Blacklist/denylist actions require reason, evidence, scope, actor, timestamp, review/expiry, notice and appeal path. Emergency restrictions can be temporary, time-bound and audited. Avoid irreversible or silent blacklisting.
- Add rate limiting, fake-review detection, suspicious transaction/link detection and seller/buyer report queues. AI risk signals are advisory and must not autonomously permanently blacklist users.

## 5. Admin, Super Admin and God Mode feature control
Use a single Registry-backed capability/feature catalogue. Features are individually switchable, with dependencies, rollout state, effective date, risk level, owner, audit history and rollback.
- Admin: operate approved day-to-day settings and moderate cases within delegated scope.
- Super Admin: configure commercial policies, tax profiles, fee rules, marketplace feature availability, moderation thresholds, seller verification and escalations.
- God Mode: ultimate override, schema/policy control, recovery/rollback, capability delegation and full audit visibility.
- God Mode must retain all operational approvals available to Super Admin; Super Admin must retain delegated Admin operations. Enforce server-side permissions; hiding a UI control is not authorization.
- Feature switches include buyer fees, seller commissions, taxes/invoice generation, offers/counteroffers, reviews, caution badges, blacklist workflows, media/social links, delivery, payment methods, payouts, RFQ/wholesale, lifecycle evidence sharing, AI price suggestions and fraud detection.
- Disabling a feature blocks new use but preserves historical records, order/ledger readability, refunds and audit. Dependency checks and confirmation are mandatory before disabling payment, tax or transaction-critical capabilities.

## 6. Continuous option and technology evaluation
Maintain a quarterly and release-triggered technology review covering open-source multi-vendor commerce, payment adapters, GST/tax engines, object storage, video/media safety, social platform APIs, identity/verification, fraud detection, AI models, regional pricing feeds, accessibility and low-bandwidth/offline workflows. Compare license, self-hosting, cost, data residency, lock-in, maintenance, security, farmer usability and integration effort. Adopt via a feature branch, adapter contract, test matrix and rollback plan—not by adding parallel sources of truth.

## 7. Required implementation sequence and release gates
1. Versioned fee/tax policy + immutable checkout quote + decimal-safe ledger.
2. Payment adapter sandbox, idempotency, webhook verification, refunds and reconciliation.
3. Buyer/seller history, statements and net settlement calculations.
4. Verified mutual reviews, caution/report/appeal/moderation and scoped temporary restrictions.
5. Registry-backed feature control and role capability matrix across Admin, Super Admin and God Mode.
6. Integration/browser tests for quote -> acceptance -> payment -> fulfilment -> completion -> settlement/refund/dispute; verify policy changes do not alter historic transactions.
7. Legal/accounting review for launch jurisdiction and product categories.

## Acceptance rule
Documentation is not implementation. Mark each feature complete only when its server authorization, Registry validation, persistent data, audit trail, UI, tests, failure cases and operational controls exist. Never assume India GST rates or platform tax obligations without qualified review.


## 8. Wholesale and minimum-order rules (implemented slice — 2026-10-18)
- Sellers may optionally set a minimum order quantity on each listing, expressed in the listing's own unit (for example, 25 kg).
- The value is optional for backward compatibility; absent means no minimum is imposed.
- The Registry is the canonical validation source, and DTO validation also rejects zero/negative values.
- Backend quote and order creation enforce the minimum, independently of the UI. The UI displays the threshold and blocks undersized requests early for usability.
- The rule does not change inventory quantity or price; stock limits and atomic completion decrements remain independently enforced.
- Acceptance tests cover below-minimum rejection and exact-minimum acceptance. Add browser tests and price-tier testing in the next pass.


## 9. Negotiation loop (implemented slice — 2026-10-18)
- Buyers may submit a counter-offer after a seller changes the proposed unit price and the order enters PRICE_CONFIRMATION_REQUIRED.
- Counter-offers are only accepted from the authenticated buyer on that order; the order returns to PENDING for the seller's next decision.
- Each round recomputes the provisional fee/tax quote from the current policy and stores the pricing snapshot/version on the order.
- An audit event records the previous offer/agreed price, counter-offer amount, quantity, currency and pricing snapshot; the seller receives an in-app notification.
- Offers remain provisional negotiation only. No payment or deduction occurs. Feature flag marketplace.offers gates the backend endpoint and UI.
- Repeat this loop until the buyer confirms the seller's revised price, the seller accepts without a new revision, or either party cancels/rejects according to the order state.



## 10. Delivery tracking and receipt confirmation (implementation slice — 2026-10-18)
- Accepted orders support delivery status, carrier, consignment/tracking number, HTTPS tracking URL, estimated delivery date, dispatch timestamp and buyer-confirmed delivery timestamp.
- Seller updates are restricted to the seller on the accepted order and follow allowed status transitions; buyer receipt confirmation is restricted to the buyer on the order.
- Every delivery update and receipt confirmation is audited and notifies the counterparty.
- If delivery tracking was started, seller completion is blocked until the buyer confirms delivery. Orders without tracking remain backward-compatible.
- Delivery tracking is governed by the Registry-backed marketplace.delivery feature flag and depends on marketplace.orders.
- Carrier integrations, shipment-label purchasing, shipping-rate calculation, return authorization and refunds are separate follow-up work; tracking metadata alone does not claim a carrier integration.

## 11. Persistent photo/video upload (implementation slice — 2026-10-18)
- Authenticated sellers can upload JPEG, PNG, WebP or AVIF photos (15 MiB limit each) and MP4 or WebM video (100 MiB limit each).
- Multer uses randomized temporary filenames outside the public directory. The service checks the file signature against the declared media type, then moves the file to a UUID-based final key; user-supplied filenames and path segments are never used.
- Uploads require listing-create authorization, respect Marketplace restrictions and the Registry-backed marketplace.media_uploads feature flag, and produce an audit event.
- The listing form uploads files directly and appends the returned internal media paths. Listing image/video rendering resolves those paths to the API origin.
- Public static serving sets Cross-Origin-Resource-Policy for cross-origin display. The default durable local directory is backend/uploads/marketplace; operators can set KK_MARKETPLACE_MEDIA_DIR to a persistent mounted directory. Uploaded media and temp files are ignored by Git.
- Current boundary: local disk adapter only; no cloud object storage, malware scanning, image re-encoding, automatic orphan cleanup or media lifecycle/retention UI yet. These remain release-hardening work before broad public production exposure.

## 12. Quantity-based wholesale pricing (implemented slice — 2026-10-18)
- Sellers can define up to 12 wholesale tiers as minimum quantity/unit price pairs. The UI accepts concise pairs such as 25:45, 100:40, sorts them for display, and rejects duplicate thresholds or invalid numeric values.
- Tier quantities and prices are validated through central Registry field definitions; the server independently checks ascending/unique thresholds before persistence.
- Quote and order creation select the highest eligible tier for the requested quantity. A buyer's explicit offer remains a separate negotiated price, and the order retains the applicable listed/tier unit price as a distinct snapshot.
- Wholesale pricing is controlled by the Registry-backed marketplace.wholesale_pricing feature flag. When disabled, quotes fall back to the listing base price and tier editing/display is hidden or disabled.
- The additive migration 20261018120500_marketplace_wholesale_price_tiers adds the nullable JSON tier list; existing listings remain compatible.

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

## 13. Sandbox payment simulation (implemented, deliberately disabled by default — 2026-10-18)
- Buyer-owned accepted orders can create an idempotent sandbox payment intent with an immutable saved quote snapshot.
- The API is hard-gated by both marketplace.payment_sandbox (default OFF, critical-risk feature) and KK_MARKETPLACE_PAYMENT_MODE=sandbox plus a configured webhook secret of at least 32 characters. It is not a live-provider adapter.
- Webhooks use raw request bytes, HMAC-SHA256 signatures with timing-safe comparison, provider event uniqueness, payload hashes, amount/currency matching and allowed payment state transitions.
- A simulated CAPTURED event writes equal-value debit/credit entries to the append-only ledger in the same transaction and records an audit event. This only demonstrates accounting flow; it does not represent funds, payment authorization from a real processor, settlement or remittance.
- Tests cover fail-closed default mode, idempotent intent creation, invalid-signature rejection and equal-value ledger entries.
- Live payment providers, real capture/refunds/chargebacks, seller payouts, reconciliation, tax remittance and production webhook secret management remain disabled and require separate security, accounting and provider review.

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

### Core module handoff after Marketplace closure — 2026-10-18 22:35 IST
- Marketplace, Inventory and Finance consolidation is committed and remains an ancestor of canonical main. Keep Marketplace as the commercial parent workspace; do not recreate independent Finance/Inventory farmer destinations or duplicate their ledgers.
- The next core module gate is Farm Assets, not further Marketplace feature expansion unless regression reveals a blocker. Focus on custody, lease, ownership transfer, split/merge, lineage, evidence, and archived-parent invariants.
- All asset writes must re-check active parent farm state in the same transaction. Archiving must not delete movement/evidence/lineage history. Live payments, payouts and tax remittance remain disabled until provider integration and qualified reviews.


### Farm Records core-stack handoff — 2026-10-18 23:01 IST
- Farm Assets archived-parent guards have been promoted through CBA. The next core gate is Farm Records.
- Direct record creation and the Intake composite writer must both check active parent state inside the transaction. Preserve Registry-only validation, authorization-before-validation ordering, actor-attributed audit history, and historical read access after farm archive.
- After Farm Records closure, continue with Crop and then Intake; do not drift back into Marketplace or AI-only work unless a core dependency requires it.

### Crop core-stack handoff — 2026-10-18 23:06 IST
- Farm Records direct-write archive race is closed and promoted. Crop is the active core module before the final Intake closure.
- Keep all crop creation paths canonical and Registry-backed; enforce active-parent checks in direct and composite create, update, and restore transactions. Preserve temporal ownership and audit history.
- After Crop closure, complete Intake transaction atomicity, multilingual original/translation persistence, uncertainty confirmation, and process-style missing-field follow-ups. Avoid detouring back to Marketplace/AI-only scope.

## 14. Sandbox chargeback evidence and outcome lifecycle (2026-10-18)
- Added a distinct Registry-backed marketplace.chargebacks_sandbox feature flag, disabled by default and dependent on the sandbox payment feature. It is not the provider-backed marketplace.refunds capability.
- A buyer can open a chargeback simulation only for their own accepted/completed order with a captured sandbox payment. The request uses a unique idempotency key, decimal-safe amount/currency, reason, optional HTTPS evidence links, and a seven-day evidence deadline.
- Chargeback reservation is counted together with requested/successful refunds and other open/lost chargebacks so the same captured amount cannot be claimed twice. The creation transaction writes an audited, record-only seller payout hold.
- The seller on the order may submit additional HTTPS evidence links before the deadline; evidence is limited to ten links and remains visible only to the order participants through their authenticated order history.
- A signed HMAC-SHA256 sandbox outcome (WON or LOST) is verified against exact raw request bytes, replay-protected by provider/event ID and payload hash, and must match the immutable amount/currency. A LOST outcome writes balanced append-only simulated reversal entries; both outcomes release the record-only payout hold and are audited.
- All chargeback sandbox APIs require KK_MARKETPLACE_PAYMENT_MODE=sandbox, a sufficiently long sandbox webhook secret, and the feature flag. They never contact a payment processor, move money, or create a real chargeback. The additive migration is 20261018170000_marketplace_sandbox_chargebacks.
- Production gates remain: a chosen/reviewed payment provider adapter, provider-specific signed dispute events and evidence submission, real dispute deadlines/arbitration, chargeback accounting approved by finance/legal advisers, live reconciliation and authenticated role-based end-to-end tests. Do not enable real collection, refunds, or payouts until these gates pass.


## 2026-10-27 — Universal Marketplace architecture (supersedes parent-workspace assumption)

The earlier section “Marketplace parent workspace: Inventory and Finance submodules” records a historical implementation choice and is **superseded as product architecture** by this section. Inventory and Finance must be independent modules, not children/tabs owned by Marketplace. Existing routes/data and stock/finance integrations should be preserved and refactored safely; legacy URLs must continue to resolve. The canonical detailed design is `docs/KK-CROSS-MODULE-MARKETPLACE-AND-CONTEXT-ARCHITECTURE.md`.

Marketplace is a cross-domain platform for physical/digital products, services, rentals, bookings, events, subscriptions, RFQs/wholesale, public services/tenders, education/knowledge, professional appointments, jobs/expertise, donations/barter, logistics, storage, testing, repair and community offers. Any person or organization may act in multiple roles/modules. A fertilizer supplier does not need to register a farm; a farmer may use Farm/Crops without using Marketplace.

A Registry-backed Context & Eligibility Engine must check listing/action requirements, reuse authorized facts and request only missing relevant context. Apply gentle optional prompts, guided completion for context-dependent advice/booking/quote, and mandatory safety/legal eligibility checks where required. Do not globally block unrelated actions. Store confirmed facts in authoritative modules with provenance, confidence, correction history and purpose/access rules. AI-extracted facts require confirmation before canonical writes. Preserve original-language transcript separately from translation/normalization. Order data does not automatically authorize research, advertising, manufacturer assessment or government reporting.

Integrations: Identity/Organizations with all modules; Marketplace with Inventory (stock/returns), Finance (quotes/receipts/settlement references), Farms/Crops/Livestock, Education, Health/Veterinary, Government, Logistics/Storage, Labs/Research, Community/NGOs, Notifications/Activity/History, Reports/Analytics, AI, Documents/Media and Search/Discovery. Use typed authorized events/contracts, idempotency and audit; no bypass of domain APIs and no private-data leakage through public sharing.

Implementation order: (1) correct Registry parentage and module navigation while retaining compatibility; (2) Registry listing types/context policies; (3) Context & Eligibility Engine and progressive capture; (4) rebuild Marketplace discovery/listing/provider storefront and type-specific actions/social sharing; (5) optional Inventory/Finance domain integration; (6) further module integrations and authenticated cross-role regression. Preserve current commerce/trust features. Live payments, refunds, chargebacks, payouts, tax remittance and production launch remain gated by provider integration, security, legal/accounting review, durable media hardening and authenticated E2E.

### Messaging integration dependency
Marketplace listing announcements and promotional campaigns must route through the user's own connected provider, not a shared platform credential. Require approved provider templates, per-recipient consent, revocation and send audit/acknowledgement tracking. Do not advertise automated campaigns to WhatsApp Business or Telegram until their connectors have passed provider-specific verification.


### Inventory-owned Marketplace stock integration — 2026-10-27
Marketplace no longer reads/writes InventoryItem or InventoryTransaction tables directly. Inventory exposes a seller-owned listing-source resolver (with Inventory READ authorization) and an internal Marketplace sale operation (with Inventory UPDATE authorization) that owns compare-and-update stock decrement, stock-out ledger, audit, and low-stock notifications. Marketplace invokes the sale operation inside its existing order transaction so stock, listing quantity/status, order state, and audit still commit or roll back together. Real provider payments/payouts remain disabled.


### Registry-backed offering details and canonical source references — 2026-10-27
The public `GET /api/v1/marketplace/offering-types` contract now drives create/edit form fields for all 12 offering types. Field keys, labels, types, enum choices, and requiredness come from `backend/src/platform/registry/definitions/marketplace-offering-definitions.ts`; individual detail fields are registered centrally and server-validated on create/update. Persisted details live in nullable `MarketplaceListing.offeringDetails` JSONB added by migration `20261027160000_marketplace_offering_details`. Buyers see saved details using Registry labels. Source module/entity references are derived from owned resource type/ID and client-supplied mismatches are rejected. The PMD DOCX, CTO Bible, architecture and commerce roadmap are being kept aligned with this implementation; existing listings remain compatible with null details.


## Shopper-first storefront checkpoint — 2026-10-27

- Implemented separate /app/shop template while retaining /app/marketplace unchanged for seller listings and operational workflows.
- Shopper features: responsive catalog, search, category/type filters, price sorting, product details, compare up to four listings, saved listings, last-hour unique-session counts, editable per-unit offers in cart, quantity editing and order-request submission using the existing API.
- Added persistent buyer-intent profile with farming/business/household/resale/broker/commission-agent personas, an authenticated consent-checked context endpoint and optional module-specific consent. Consent is off by default, can be revoked, and does not authorize automatic Farm/Crop changes.
- Added anonymous hashed-session view tracking and last-hour unique session counts. No IP addresses are stored for this metric.
- Payment UI explicitly identifies real payment as disabled. Cart submission creates order requests, not paid orders. Provider-backed payments remain a separate release gate.


## 2026-10-29 — Shopper storefront acceptance checkpoint

- Preserve the distinct shopper storefront at `/app/shop`; do not replace the existing seller/order workspace at `/app/marketplace`.
- Shop discovery now groups listings into Today, Yesterday, Day before yesterday, Earlier this week and Older. Search, category/type filters and price/date sorting apply within the visible catalog.
- Product details can show up to three videos plus seller/document links, restricted to valid HTTP(S) URLs. Do not render unsafe URL schemes. Anonymous visitor counts remain aggregate session counts for the previous 60 minutes.
- Verified: frontend build passed, Shop & Compare Playwright passed after the grouping/media change, 4 focused core/Marketplace browser journeys passed, 89 targeted backend tests passed and Nest build passed.
- Release boundary unchanged: the cart submits order requests only. No live money movement, tax remittance, payout, refund/chargeback or settlement is enabled without approved provider, security, legal/accounting and authenticated acceptance gates.

## 2026-10-29 — Marketplace Finance/Inventory workspace switches

- Marketplace now exposes Finance and Inventory as optional embedded workspace views while rendering the domain-owned FinancePage and InventoryPage. The Registry module IDs (`finance`, `inventory`), authorization boundaries, APIs, and standalone routes remain independent; these views do not make Marketplace the owner of their records.
- New audited feature flags: `marketplace.inventory_workspace` and `marketplace.finance_workspace`. Both default ON and depend on `marketplace.listings`. They appear in the existing Marketplace feature switchboard, require a reason for each change, are versioned/audited, and can be toggled by Admin or Super Admin under the existing risk policy.
- When a workspace flag is OFF, its tab is hidden and direct navigation to its nested Marketplace workspace shows a disabled notice. Existing records are preserved. The flag does not disable `/app/inventory` or `/app/finance`; those remain governed by their own module access/lifecycle controls.
- Verification on 2026-10-29: Marketplace backend regression 6 suites / 104 tests passed; Finance + Inventory service tests 2 suites / 14 passed; backend and frontend builds passed; six Marketplace browser journeys passed including switch-off and nested-route behavior. Real-account authenticated acceptance remains pending. Live payments, refunds/chargebacks, payouts and tax remittance remain disabled pending external provider and compliance acceptance.

## Registry-driven progressive context capture — 2026-10-29

- Marketplace listings can resolve a versioned context policy from the central policy registry. The first policy set covers agricultural input use (AGRI_INPUT_USAGE), rental dates/location (RENTAL_BOOKING), appointment date/time (BOOKING_REQUEST), and logistics pickup/delivery/load details (LOGISTICS_QUOTE).
- The shopper/provider workspace fetches the policy definition and renders required and optional fields dynamically rather than hardcoding one agricultural form. Agricultural farm/crop record linking remains optional and requires explicit consent; other policy answers are attached only to that order request.
- Backend order creation independently resolves the policy, rejects missing required fields, allow-lists stored answers, validates number/date types, and rejects rental end dates before start dates. UI checks are convenience only; server enforcement remains authoritative.
- Verified on 2026-10-29 after the unapproved Education draft was archived from the active tree: full backend regression passed 70 suites / 691 tests; full Playwright suite passed 24/24; backend/frontend production builds and Prisma validate/generate passed; migrate status reports 55 migrations and an up-to-date database; API health, Shop and Marketplace returned HTTP 200; unauthenticated order and settlement endpoints returned HTTP 401. CBA promotion gates are clear. Live money movement and authenticated real-role acceptance remain separate release gates.
- Scope boundary: this is the first progressive-capture increment, not completion of every listing type's domain workflow. Separate job applications, public-service eligibility, recurring subscription lifecycle, bookings/calendar availability, digital delivery, and logistics fulfilment still need typed domain actions and role-aware acceptance. Do not represent a generic order request as a confirmed booking, job application, delivery, or paid transaction.

## 13. Shop customer experience, external media, supplier Q&A and verified trust signals — 2026-10-29

### External content and lower-storage options
- Let each seller choose supported platform uploads, HTTPS external links, or both. External links are references, not copies; record source/provider, submitter, rights/consent declaration, validation status and timestamps. Provide safe preview or ordinary link fallback and never scrape login-protected content.
- Social product demos and review links/embeds use an explicit provider allowlist and provider terms. Validate URLs, block unsafe schemes/private-network redirects, escape/embed safely, and avoid mirroring content without permission. External review content must retain source attribution and cannot be labelled as a verified platform review.
- Keep the platform media adapter boundary so local storage can later be replaced with object storage. Uploads need type/signature/size validation, access control, safe filenames, retention and a malware-scanning/storage-hardening release gate.

### Persistent supplier Q&A and bulk/sample enquiries
- Buyers may ask listing-linked product questions, request a sample, or ask about MOQ, wholesale tiers, lead time, delivery regions, product variants and bulk orders. The listing owner answers under authenticated authorization. Persist question, answer, actor, timestamps, listing version/reference, visibility, moderation/report state and audit trail; notify the participants.
- Questions and answers are not orders, promises of stock, accepted quotations or payments. A buyer/supplier must explicitly convert an enquiry into a typed RFQ, offer, sample request, booking or order workflow; preserve the origin link and consented context.
- Support optional safe attachments/external references and explicit consent before sharing contact details. Protect private details, rate-limit spam, detect malicious links and provide report/moderation/appeal controls.
- Maintain records of platform-observed messages, RFQs, offers, decisions, disputes and evidence for support and authorized analytics. If parties continue externally, the platform cannot claim to observe or protect that external activity; show a clear coverage notice and allow provenance-labelled evidence/outcome submission where supported.

### Trust and customer experience
- A public profile may show member-since month/year, completed verified purchases, completed verified sales, response rate/time, fulfilment/cancellation ratios and verified transaction review summaries when sufficient data exists. Counts must derive from authoritative records, exclude cancelled/test/duplicate orders, explain the counting rule, avoid exposing private transaction detail, and distinguish verified from self-reported information. Do not display unavailable metrics as zero.
- Support mutual transaction-linked reviews, seller replies, report/appeal/moderation, dispute evidence, delivery/receipt tracking, transparent fees/tax quotes, return/refund paths and scoped restrictions. Public cautions must be evidence-backed, time-bound/reviewable where possible and appealable; AI signals remain advisory and cannot independently impose permanent blacklisting.
- Use aggregate privacy-minimizing view/session analytics with a defined time window. Counts are approximate sessions, not identified humans or verified interest; do not store raw IP addresses for view counting.

### Central controls and cross-module ownership
- Registry owns feature/resource/field contracts, defaults, validation, feature dependencies and limits. Backend authorization is authoritative. Admin, Super Admin and God Mode get controls/approvals according to delegated scope, with actor, reason, effective time, audit, version and rollback. Disabling a feature blocks new use while preserving historical records, dispute/refund access and audit. Safety-critical controls fail closed.
- Integrate with Users/Organizations for identity/tenure, Inventory for stock/movements, Finance for quotes/ledger/fees/tax/reconciliation, Media for storage and external references, Notifications for Q&A/order events, Search for discovery, and Audit/History/Provenance for evidence. No duplicated stock/ledger/profile sources or direct cross-module table writes.
- Independently gate uploads, external links, social embeds, Q&A, sample requests, bulk/RFQ, public statistics, reviews/comments, recommendations, visitor analytics, messaging, delivery, disputes, fees/tax display and payment modes. Real payment/payout/tax remittance and external API integrations require provider, security, legal/accounting and authenticated E2E approval before activation.

### Acceptance tests
- Feature off/limit/dependency enforcement at the server and Admin/Super Admin/God role boundaries; audit and rollback.
- HTTPS/unsafe URL, redirect, blocked embed, inaccessible external content and low-bandwidth fallback tests.
- Q&A ownership, participant privacy, notifications, moderation, rate limits, sample/bulk enquiry, and explicit conversion to RFQ/offer/order.
- Member-tenure and verified transaction counts, exclusion rules, privacy, insufficient-data state, review eligibility and appeal.
- Cross-module Inventory/Finance ownership, transaction atomicity, audit/history/provenance, and evidence boundary for external-site actions.

## Implementation slice: listing Q&A and configurable trust controls — 2026-10-29 23:41:48 IST

Working-tree implementation adds persistent listing Q&A with public product questions and participant-private sample/bulk enquiries; seller-only answers; audit/notification events; central Registry feature definitions and configurable question/sample/bulk limits; HTTPS-only external content links and allowlisted social video embeds; and opt-out aggregate public trust statistics. Admin/Super Admin/God Mode feature configuration now accepts centrally allow-listed options and validates numeric limits on the server. These are implementation-in-progress, not release-complete: focused service tests pass 75/75, Prisma schema validation passes, backend build has no TypeScript errors, and frontend production build passes with a large-chunk warning. Authenticated role/browser E2E remains pending. Do not apply migrations until the existing migration-history mismatch is reconciled.

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


## Store release and privacy acceptance update — 2026-10-30 07:55 IST

- Public last-hour listing visitor counts are public only for listings whose current state is PUBLISHED and deletedAt is null. Draft, rejected, archived and otherwise unpublished seller activity must not be exposed through the per-listing endpoint. Counts remain anonymous session aggregates, never account identities or IP addresses.
- Listing Q&A remains split by visibility: public product questions may be read publicly; sample and bulk/MOQ requests are private to the asking buyer and listing seller. Seller answers must be participant-authorized and audited.
- Store remains a separate shopper-first Shop template plus seller/provider Marketplace workspace. Inventory and Finance remain independent source-of-truth domains, integrated through their authorized services.
- Payment capture, payouts, refunds, chargebacks and tax remittance remain disabled outside approved sandbox/test flows until provider, security, legal/accounting, reconciliation and authenticated role acceptance gates pass.
- 2026-10-30 focused Marketplace/Farm regression run passed 188 tests across 10 suites. This is focused unit/service evidence only; it does not close DB-backed E2E, pending migrations, browser acceptance or production readiness.

## Browser verification — 2026-10-30 09:10 IST

- Marketplace buyer/seller workspace 1/1; Shop storefront 3/3; Admin blacklist apply/revoke 1/1; sandbox chargeback buyer/seller evidence 2/2; consented Farm/Crop order-context linking 1/1.
- Marketplace selected mocked browser acceptance: 8/8. This is not authenticated DB-backed role acceptance; the booking, listing-Q&A and FarmAsset soft-archive migrations remain pending behind the migration-history reconciliation gate.

## Live database acceptance and role policy — 2026-10-30 09:34 IST

- New DB-backed Marketplace test passes: active buyer can create a public product question and a private sample request; the public listing feed excludes the private request; buyer and seller participant views retain access; seller answer is visible for public Q&A and private enquiry remains participant-only.
- Listing-question CREATE/OWN is enabled for active Marketplace participant roles through audited God Mode capability policy. The Registry remains authoritative; no direct permission-table writes.
- Booking-request table migration is deployed and the booking-request service flow is covered by Marketplace service tests. Live payment capture, payouts, refunds and tax remittance remain gated.

## Store / Marketplace release acceptance — 2026-10-30 09:40 IST

- Marketplace/Shop browser acceptance passed: buyer/seller workspace, Shop browse/compare/cart/profile, non-product discovery, external-content controls, Admin blacklist, sandbox chargeback buyer/seller evidence and consented Farm/Crop context linking.
- Live PostgreSQL Marketplace Q&A E2E passed: public product question, private sample request, participant-only buyer/seller views and seller answer. Booking request schema is deployed and service-level booking creation tests pass.
- Payment capture, payouts, refunds and tax remittance remain disabled outside sandbox until provider, security, legal/accounting and reconciliation gates are met.

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