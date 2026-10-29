# KrishiKendram — Cross-Module Marketplace, Context Capture & Integration Architecture
Date: 2026-10-27
Status: Canonical requirements and staged implementation plan
Scope: Align PMD, CTO Execution Bible, Master Blueprint, Marketplace governance, Registry and runtime implementation.

## 1. Product decision
KrishiKendram is a multi-domain operating platform, not a farmer-only application. A person or organization may participate in any number of modules and hold different roles in each. Marketplace is a standalone, cross-module discovery, commerce, service and exchange layer. Inventory and Finance are independent modules and must not be children of Marketplace. Marketplace may integrate with them when relevant and authorized.

Examples:
- Fertilizer wholesaler: Organization/Seller profile, Marketplace and optionally Inventory/Finance. No farm or crop record is required.
- Farmer: Farms/Crops without Marketplace; if buying fertilizer, can be guided to add crop/land context for safe, relevant advice.
- University: free or paid training, consultations, tests, certificates, research participation and knowledge resources.
- Doctor, veterinarian, laboratory or consultant: appointments, reports and professional services subject to credentials, privacy and applicable rules.
- Machinery owner: rent equipment by hour/day/acre/season with availability, deposits, delivery, inspection and return workflows.
- Government agency: schemes, service appointments, notices, tenders and public guidance; official status and fee rules must be verified.
- Logistics, warehousing, cold-chain, repair, installation, insurance, cooperatives, NGOs, community groups and local service providers: services, donations, exchanges or volunteer opportunities.
- A user may be buyer, seller, renter, provider, student, professional, farmer, supplier, volunteer, organization member or public-service applicant in different contexts without creating separate accounts.

## 2. Architecture boundaries
1. Identity & Organizations: accounts, person/organization profiles, memberships, verification, preferences and contextual role assignments. A role never implies access to unrelated data.
2. Independent domain modules: Farms, Crops, Livestock, Inventory, Finance, Education/Knowledge, Health/Professional Services, Government/Public Services, Logistics/Storage, Assets/Rentals and future domains. Each owns its authoritative records and lifecycle.
3. Marketplace: listing discovery/publishing, catalog categories, seller/provider storefronts, offers, RFQs, orders/bookings, sharing, reviews, trust workflows and cross-module listing references. It is not the source of truth for stock, farm facts, medical records, financial books or academic records.
4. Context & Eligibility Engine: evaluates action requirements against Registry-defined context, existing authorized facts, validation, consent, safety and eligibility. It requests only missing relevant details and routes confirmed updates to authoritative modules.
5. Integration/Event Bridge: typed, authorized references/events connect modules without parent-child coupling. Include idempotency, actor, source module/entity, target, timestamp, purpose, permission check and audit correlation. Events do not bypass domain APIs.
6. AI Companion: voice/text/image-assisted capture, language detection, original transcript plus translated/normalized derivative, provenance, confidence, correction and explicit confirmation before canonical writes. AI is advisory and uses authorized context only.

Disabling Marketplace must not disable Inventory or Finance. Disabling Inventory must not erase Marketplace listings or past orders; it only blocks capabilities requiring live stock linkage, with clear fallback/status. Finance must work independently for non-marketplace operations. Module dependencies are operational capabilities, not navigation parentage.

## 3. Context-aware transaction policy
Every listing type and action declares a versioned context policy in the central Registry: required/recommended fields, applicability, validation, sensitivity, authoritative source module, retention, consent/purpose and blocking severity. The engine compares policy to authorized facts and asks only for missing information.
- Level 1 — Gentle prompt: optional context improves personalization but is not needed to complete the action.
- Level 2 — Guided completion: context is required for the requested recommendation, quote, booking, delivery or follow-up. Explain why; allow draft/defer/alternate route when feasible.
- Level 3 — Required eligibility/safety check: applicable legal, professional or product safety requirements must be met before the restricted action. No bypass due to impatience or seller pressure.
- Do not force unrelated module enrollment or collect unrelated information.
- Do not invent answers. Support “I don't know”, defer, evidence upload, voice answer and later completion where policy permits.
- Sellers may define legitimate prerequisites but cannot demand unnecessary sensitive data or override platform/legal rules.
- Keep checkout/payment gates separate from advisory context: capturing farm context is not proof of product eligibility or a safe recommendation.

Example: a registered farmer without crop/land data selects fertilizer. Before crop-specific dosage/application advice, KK asks intended crop, location/region, planting/preparation status and relevant area/stage where needed. It can offer to create/update Farm/Crops records after confirmation. Purchase may proceed if applicable rules allow, while tailored advice is withheld until context is sufficient. Regulated/high-risk products may require stricter verification.

## 4. Context lifecycle and data quality
- Reuse authorized, current, verified facts; do not repeat questions without a reason.
- Save data in its authoritative domain module and link the order/booking to stable IDs and relevant versions/snapshots.
- Track provenance: user-confirmed, document-verified, partner-provided, AI-extracted, inferred, imported or unknown; include source, timestamp, confidence and correction history.
- AI extraction/inference never silently becomes verified fact. Read back consequential details and require confirmation before canonical writes.
- Store original-language wording/transcript and language metadata separately from translated/normalized text; retain confidence and corrections under privacy/retention rules.
- Maintain field-level access, purpose limitation, audit, correction and retention/deletion workflows.
- Ask follow-ups conversationally; support voice, text, image and document input without requiring context re-entry.
- Incomplete profile requirements become resumable tasks rather than repeatedly blocking unrelated activity.
- Explain what is requested, why, where it is stored, who can see it, whether optional and how to change permissions.

## 5. Marketplace offering taxonomy
Use a shared listing core with type-specific schemas/workflows:
1. Physical goods and consumables.
2. Digital products, files, templates and licensed content.
3. Professional services and consultations.
4. Rentals, leasing and shared-use assets.
5. Appointments, bookings, classes, workshops and events.
6. Contracts, subscriptions, maintenance and recurring services.
7. RFQ, bulk/wholesale procurement and counter-offers.
8. Free services, public-benefit offers, donations, barter and community exchange.
9. Government tenders, institutional procurement and verified public-service listings.
10. Jobs, expertise, mentoring, volunteer work and project opportunities.
11. Knowledge content, courses, research participation and paid/free education.
12. Logistics, transport, warehousing, testing, repair, installation and fulfilment.

Listing schema covers provider identity, type/category/tags, description, price model/currency/tax treatment where configured, unit/quantity/minimum, availability, geography/service area, delivery/fulfilment, prerequisites/context policy, media, external references, visibility, verification, lifecycle, cancellation/returns, terms, accessibility/language and policy snapshots. Type-specific fields come from Registry definitions; do not create one enormous form.

## 6. Discovery, storefront and lifecycle
- Discover by category, type, module/domain, location/service area, availability, price model, provider verification, language, freshness and relevance.
- Filter/sort by current day, yesterday, recent days, week, active/closing soon and archive; paginate.
- Support individual/organization storefronts, multi-vendor catalogs, stock/availability, variants/packages, wholesale tiers, minimum quantities, offers/counteroffers, RFQs, subscriptions and repeat booking.
- Type-aware actions: Buy, Request Quote, Book, Reserve, Rent, Enquire, Apply, Register, Donate, Exchange, Subscribe or View Official Service.
- Lifecycle: draft, pending verification/review, published, paused, sold/fulfilled, expired, cancelled, archived and disputed as appropriate. Never hard-delete financial, trust or audit evidence.
- Distinguish platform-verified facts from seller claims, user reviews and AI suggestions.
- Support free/public-benefit services; do not assume every listing is commercial.

## 7. Social and external distribution
- Internal KK sharing to member/group/community/organization/module audience; enforce membership, relationship, visibility and field-level authorization.
- External share: copy link, QR, WhatsApp, email, SMS and native share where available; prefilled text must not expose private buyer/order data.
- External references may include Instagram, YouTube, Google Drive, websites, public posts, brochures and catalogs. Validate URL schemes/domains and label external destinations. Do not claim API-based import/posting without official API access and permissions.
- Public share previews use safe metadata and Open Graph-style title/description/image; member-only listings must not leak through previews.
- Use stable public IDs/tokens; never put secrets or auth tokens in URLs.
- Measure views, saves, shares, qualified inquiries and conversions only when lawful and transparently disclosed. Prefer aggregate analytics and respect opt-outs/retention.
- Attribution uses privacy-conscious, expiring identifiers; do not infer sensitive traits from engagement.

## 8. Commerce, finance, inventory and trust boundaries
- Marketplace owns order/booking workflow and immutable agreement snapshots; Inventory owns authoritative stock/movements; Finance owns books and approved accounting mappings; payment adapter owns provider state; tax configuration is jurisdiction-aware and reviewed.
- Stock-linked orders invoke an authorized Inventory domain operation using a safe transaction/outbox pattern; no parallel stock ledger.
- Itemize fees, commission, taxes, delivery, discounts, buyer total, seller net, currency, rounding and policy version before commitment and snapshot immutably.
- Use decimal-safe money, append-only ledger, idempotency, signed webhooks, refund/chargeback/reconciliation and payout holds. Sandbox events are never real money movement. Live payments/payouts/tax remittance stay disabled until provider, security, legal/accounting and authenticated E2E gates pass.
- Finance remains usable without Marketplace. Order events integrate only through explicit reviewed mappings; do not book settled cash before verified payment/accounting rules.
- Buyer/seller histories, verified mutual reviews, comments, complaints, caution ratings, reports, evidence, restrictions, appeals and reinstatement are scoped, audited and privacy-aware.
- Restrictions require reason, evidence, scope, actor, review/expiry or permanent decision, notice and appeal. AI risk signals are advisory, never permanent automatic bans.
- Returns, warranties, disputes, cancellations, no-shows, deposits, rental damage and rescheduling need listing-type-specific policies.

## 9. Admin / Super Admin / God governance
A central Registry-backed policy catalogue defines schemas, context requirements, listing types, feature flags, eligibility, sharing, verification, retention, fees, trust thresholds, integration dependencies, rollout, owner, risk and rollback.
- Admin operates approved daily workflows within delegated scope.
- Super Admin manages approved configuration, verification, fee/tax policy, features, moderation and escalations.
- God Mode controls platform root, schema/policy overrides, delegation, dependencies, recovery and full audit. It retains Super Admin operational approvals; Super Admin retains delegated Admin operations.
- Authorization is server-side; hiding a UI control is not security.
- Feature-off blocks new use but preserves history and authorized read/audit/refund/appeal paths. Prevent disabling dependencies that corrupt transactions or safety duties.
- Record actor, reason, before/after, timestamp, effective date and rollback for consequential changes.

## 10. Recommended module integration map
- Identity & Organizations ↔ every module: profiles, organization membership, contextual roles, verification and permissions.
- Marketplace ↔ Inventory: listing-stock reference, available quantity, reservation/decrement, returns and availability; optional, independently switchable.
- Marketplace ↔ Finance: quotes, order snapshots, receipts, fees, settlement status, refund/dispute references; no unapproved automatic cash-book entries.
- Marketplace ↔ Farms/Crops/Livestock: user-authorized context for intended use, delivery and aftercare; domain records remain authoritative.
- Marketplace ↔ Education/Knowledge: courses, training, consultations, certificates, events, free resources and paid offerings.
- Marketplace ↔ Health/Veterinary/Professional Services: appointments, credential checks, referrals and reports with strict sensitive-data boundaries.
- Marketplace ↔ Government/Public Services: verified notices, scheme eligibility journeys, appointments, tenders and directories; verify official status.
- Marketplace ↔ Logistics/Storage/Assets: quotes, availability, booking, delivery, handover, return and damage lifecycle.
- Marketplace ↔ Labs/Research/Manufacturers: test booking, reports, voluntary field trials and consented product feedback.
- Marketplace ↔ Community/Cooperative/NGO: donation, barter, equipment sharing, volunteering and public-benefit services.
- Notifications/Activity/History ↔ all modules: permission-checked events/reminders/timeline links; no leaks to unauthorized recipients.
- Reports & Analytics ↔ all modules: role-scoped operational metrics and purpose-limited aggregate reporting.
- AI Companion ↔ all modules through authorized capability/context manifests; no direct database writes.
- Documents/Media ↔ all modules: secure storage, scanning, lifecycle, access checks, retention and authorized share links.
- Search/Discovery ↔ all modules: index only approved public/discoverable records; never index private records.
- Payments/Tax/Compliance: adapters, provider verification, jurisdiction rules and release gates, not duplicated inside every module.

## 11. Delivery plan
Phase A — Document/architecture correction: update PMD, Bible, Blueprint and Marketplace roadmap; remove Inventory/Finance parent-child relation while preserving independent routes/legacy redirects; define Registry context-policy and integration contracts; preserve records/migrations.
Phase B — Marketplace foundation: cross-domain listings with type/category/source module/entity refs; context-policy evaluation and resumable prompts; role/org-aware providers; public/member/restricted visibility; type-aware discovery/storefront/lifecycle; safe social share links/previews.
Phase C — Transaction/integrations: Inventory-owned stock operations; Finance mappings via approved events; listing-specific quote/booking/rental/service/digital delivery/cancellation; notifications/activity/history/follow-up.
Phase D — Trust/intelligence/ecosystem: credentials, reviews, reports, appeals, fraud, disputes; voice/photo context capture and confirmation; consented research and purpose-limited government reporting; incremental module integrations.
Phase E — Production readiness: authenticated multi-role E2E, migration/rollback drills, accessibility/low-bandwidth, security/privacy review, provider certification, tax/accounting/legal review, durable media storage, observability and support playbooks.

## 12. Acceptance criteria
- Supplier publishes/sells without farmer registration or Farm/Crop linkage.
- One account can hold multiple contextual roles and organization/module memberships with independent authorization.
- Marketplace, Inventory and Finance enable/disable independently without data loss or broken history.
- Farmer lacking crop/land context receives a relevant prompt before context-dependent advice; existing facts reused, only missing fields asked.
- Safety/eligibility gates cannot be bypassed; optional data does not block unrelated activities.
- Confirmed facts save to authoritative modules with provenance/history/appropriate consent; AI never silently overwrites canonical data.
- Integrations check source/target authorization, are idempotent/audited and handle missing optional modules.
- Public sharing does not leak private records or bypass listing visibility.
- Fee/tax/stock/order/payment states stay distinct; no live money movement until release gates pass.
- Tests cover cross-role/owner denial, disabled modules, missing context, corrections, idempotency, audit, sharing, cancellation and recovery.
- Documentation is not implementation: completion requires code, persistence, server authorization, UI, tests and runtime evidence.


## Refresh contract

List/table live refresh is an explicit per-workspace opt-in, off by default, with 10-, 15-, and 30-second intervals. It updates list data only and never reloads the page. Focus, visibility, and page-show events do not trigger refresh. Editable form values, active filters, search terms, and in-progress edits must survive background list refreshes. Admin configuration and sensitive screens remain manual-refresh unless a table-only live refresh is explicitly justified.
### Seller-profile access policy
Seller profiles are user-owned Marketplace identity/contact-preference records. The Registry declares the capability, while the additive permission seed assigns the OWN capability to account roles; runtime ownership remains enforced by the central authorization service (ownerId equals userId). Public display of phone details remains separately consent-gated.
### Cross-module User Access Matrix
The user profile/activity view may show a Registry-driven matrix of module, resource, action, scope, role grant and user-specific grant. Admin, Super Admin and God Mode can turn matrix visibility on/off with an audit reason. Visibility is not permission; normal central authorization and contextual checks remain authoritative. Include missing/ungranted declared capabilities so administrators can diagnose gaps rather than seeing only successful grants.

### Seller profile visibility controls
Seller profile visibility defaults to ON for all users. Admin/Super Admin/God Mode may configure a global default and ordered rules scoped by any combination of user IDs, module IDs, and Marketplace categories. Empty selectors mean wildcard; non-empty selectors in one rule are conjunctive; last matching rule wins. Enforcement is server-side and policy changes are audit logged with a reason. This controls public seller-profile fields only and never bypasses explicit seller consent for public phone display.

### User-specific messaging and outreach
Each user owns an isolated provider connection. The first adapter targets Arattai Business Platform using OAuth Bearer authentication, approved message templates and its promotional API. Tokens and recipient phone numbers are encrypted with AES-256-GCM using a deployment-managed 32-byte key; credentials never return to the browser. Promotional messages require an active per-user/per-recipient opt-in record, a template ID, and explicit confirmation before sending. Consent can be revoked; the server refuses sends after revocation. Transactional messages use Arattai POST /api/v1/transactions and require a separate transactional consent purpose; marketing consent does not authorize operational sends. WhatsApp Business and Telegram appear as future provider slots and are not represented as live until their own APIs and authorization flows are implemented.


### Inventory-owned Marketplace stock integration — 2026-10-27
Marketplace no longer reads/writes InventoryItem or InventoryTransaction tables directly. Inventory exposes a seller-owned listing-source resolver (with Inventory READ authorization) and an internal Marketplace sale operation (with Inventory UPDATE authorization) that owns compare-and-update stock decrement, stock-out ledger, audit, and low-stock notifications. Marketplace invokes the sale operation inside its existing order transaction so stock, listing quantity/status, order state, and audit still commit or roll back together. Real provider payments/payouts remain disabled.


### Registry-backed offering details and canonical source references — 2026-10-27
The public `GET /api/v1/marketplace/offering-types` contract now drives create/edit form fields for all 12 offering types. Field keys, labels, types, enum choices, and requiredness come from `backend/src/platform/registry/definitions/marketplace-offering-definitions.ts`; individual detail fields are registered centrally and server-validated on create/update. Persisted details live in nullable `MarketplaceListing.offeringDetails` JSONB added by migration `20261027160000_marketplace_offering_details`. Buyers see saved details using Registry labels. Source module/entity references are derived from owned resource type/ID and client-supplied mismatches are rejected. The PMD DOCX, CTO Bible, architecture and commerce roadmap are being kept aligned with this implementation; existing listings remain compatible with null details.


## Implementation checkpoint — consent-aware Farm/Crop context links (2026-10-27)

Agricultural-input checkout now offers an optional, unchecked consent control to link context to an existing Farm and/or Crop. The server rejects linked IDs without explicit consent, requires active records owned by the authenticated buyer, and checks Crop/Farm consistency. MarketplaceOrder stores optional foreign keys and preserves the user-confirmed answers plus a versioned policy snapshot recording consent time, linked IDs and ORDER_CONTEXT_ONLY scope. Checkout does not modify Farm/Crop records, share context with third parties, or create/update records through AI. A future authoritative create/update flow must be separately previewed and authorized.


## Shopper storefront and consent-aware buyer profile (2026-10-27)

/app/shop is a separate shopping template; the existing /app/marketplace seller and operations workspace remains intact. Shopping supports searchable/filterable listings, comparison, cart, offers as order requests, and privacy-conscious anonymous unique-view counts for the last 60 minutes. The new MarketplaceBuyerProfile stores buyer type, purchase purpose, business/region/scale/crop interests and explicit cross-module consent. Module targets are persisted only while consent is active; the authenticated buyer-profile context endpoint returns a minimal profile only when that user selected the requesting module; revocation turns sharing off without deleting the Marketplace profile. Farms, Crops, Livestock, Inventory and Finance now consume the endpoint through a shared read-only notice. The notice informs the user and links back to profile editing; it never mutates domain records. No automatic writes into Farm/Crop records are allowed. Real-money checkout is intentionally unavailable until payment-provider and legal/accounting release gates pass.
