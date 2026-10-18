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
\n\n
### Marketplace trust hardening — 2026-10-18 14:12 IST
- [x] Added explicit permanent Marketplace-wide blacklist support to trust-case resolution. An Admin/Super Admin can leave duration blank only for MARKETPLACE_ALL; narrower restrictions and caution ratings require a 1–365 day expiry.
- [x] Marketplace UI now explains permanent versus temporary duration, labels a no-expiry restriction as a permanent blacklist, and exposes reason-required manual revocation.
- [x] Active Marketplace-wide restrictions continue to hide the seller's published listings from public discovery and block Marketplace actions. No account or listing data is hard-deleted.
- [x] MarketplaceService unit suite passed: 55 tests, including new permanent-blacklist and expiry-policy regressions. Dedicated Admin browser journey passed, covering apply, persistent active state and reasoned revocation.
- [x] Backend Nest build passed after service changes; frontend TypeScript/Vite build passed after UI changes; git diff --check passed.
- [ ] Final release gates remain real payment/refund/chargeback/payout provider integration, qualified tax/legal/accounting review, production object-storage hardening, and authenticated E2E with real roles. Live money movement and tax remittance remain disabled.
\n\n
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
