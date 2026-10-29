from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
from pathlib import Path
import os, tempfile

path = Path('/home/jj/Dev/KrishiKendram/Absolutely KK PMD.docx')
tmp = path.with_suffix('.docx.tmp')
ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ET.register_namespace('w', ns)
W = '{%s}' % ns
with ZipFile(path, 'r') as zin:
    files = {name: zin.read(name) for name in zin.namelist()}
root = ET.fromstring(files['word/document.xml'])
body = root.find('.//' + W + 'body')
if body is None:
    raise RuntimeError('DOCX body not found')
# Idempotency: do not append a duplicate canonical section.
existing = ''.join((t.text or '') for t in root.findall('.//' + W + 't'))
marker = '2026-10-27 — Universal Marketplace, Context Capture and Cross-Module Integration'
if marker not in existing:
    def para(text, style='Normal', bold=False):
        p = ET.Element(W + 'p')
        pPr = ET.SubElement(p, W + 'pPr')
        pStyle = ET.SubElement(pPr, W + 'pStyle')
        pStyle.set(W + 'val', style)
        r = ET.SubElement(p, W + 'r')
        if bold:
            rPr = ET.SubElement(r, W + 'rPr')
            ET.SubElement(rPr, W + 'b')
        t = ET.SubElement(r, W + 't')
        if text.startswith(' ') or text.endswith(' '):
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        t.text = text
        return p
    sections = [
      (marker, 'Heading1'),
      ('Status: canonical product requirement and forward architecture decision. Detailed companion specification: docs/KK-CROSS-MODULE-MARKETPLACE-AND-CONTEXT-ARCHITECTURE.md (repository). This section supersedes the earlier assumption that Inventory and Finance are Marketplace submodules.', 'Normal'),
      ('Product principle: universal, cross-domain Marketplace', 'Heading2'),
      ('KrishiKendram is a multi-domain platform for people and organizations, not only farmers. A person or organization may use multiple modules and hold multiple contextual roles under one identity. Marketplace is an independent discovery, commerce, service and exchange layer. Inventory and Finance are independent modules; neither is a child of Marketplace. Integrations are optional, explicit, authorized and reversible.', 'Normal'),
      ('A fertilizer supplier may use Marketplace and optionally Inventory/Finance without registering a farm or crop. Other provider/customer examples include universities and training providers, doctors/veterinarians, laboratories, machinery rental owners, government agencies, logistics and storage providers, repair/installation services, cooperatives, NGOs, community groups, researchers and manufacturers. Users may buy, sell, rent, book, teach, consult, volunteer, donate, exchange, apply for services or procure public services.', 'Normal'),
      ('Marketplace listing types and lifecycle', 'Heading2'),
      ('Support physical goods, digital products, professional services, rentals/leasing, appointments/bookings/events, contracts/subscriptions, RFQs/wholesale/counter-offers, public services/tenders, education/knowledge, jobs/expertise, donations/barter, logistics, storage, testing, repair and community offers. Use a shared listing core with type-specific Registry schemas and actions such as Buy, Request Quote, Book, Reserve, Rent, Enquire, Apply, Register, Donate, Exchange, Subscribe and View Official Service. Support provider storefronts, categories, location/service area, availability, price models, minimum quantities, wholesale tiers, media, lifecycle, visibility, verification, cancellations/returns and accessible multilingual descriptions.', 'Normal'),
      ('Social distribution and safe discovery', 'Heading2'),
      ('Provide internal KK sharing to people/groups/communities/organizations and safe external sharing via copy link, QR, WhatsApp, email, SMS and native share when available. Support links to Instagram, YouTube, Google Drive and public websites/posts without claiming automated import/publishing unless official API access and permissions exist. Public previews must not expose member-only/private data; never put auth tokens or secrets in URLs. Analytics must be purpose-limited, transparent and privacy-conscious.', 'Normal'),
      ('Context-aware commerce and progressive data capture', 'Heading2'),
      ('Every listing type/action must declare versioned Registry context and eligibility policy: required/recommended fields, applicability, validation, sensitivity, authoritative module, purpose/consent, retention and blocking severity. A central Context & Eligibility Engine reuses authorized facts and asks only for missing relevant information. Level 1 is an optional gentle prompt; Level 2 guides completion for context-dependent advice/quotes/bookings/services; Level 3 enforces applicable safety, legal or professional eligibility requirements. Missing optional information must not block unrelated activities or force unrelated module enrollment.', 'Normal'),
      ('Example: a registered farmer without crop/land details selects fertilizer. KK asks for intended crop, location/region, planting/preparation status and relevant area/stage before personalized application advice. It can offer to create/update Farm/Crops records after user confirmation. If applicable rules permit, the user may still purchase while tailored advice remains unavailable until context is sufficient. Regulated/high-risk products may require stricter verification. Never invent missing answers; support voice/text/photo, “unknown”, defer and resumable drafts where safe.', 'Normal'),
      ('Data provenance, AI and privacy', 'Heading2'),
      ('Confirmed facts are saved to their authoritative module and linked to transactions by stable references. Record provenance (user-confirmed, document-verified, partner-provided, AI-extracted, inferred, imported or unknown), source, timestamp, confidence and correction history. AI-extracted/inferred facts must never silently become verified or overwrite canonical records; consequential writes require a clear preview and confirmation. Preserve original-language transcript separately from translated/normalized text, with language/confidence/correction metadata. Explain why data is requested, where stored, who can access it, whether optional and how to change permissions.', 'Normal'),
      ('Order fulfilment data is not blanket consent for research, advertising, manufacturer assessment or government reporting. Those purposes require appropriate lawful basis, purpose-specific authorization/consent, minimization, access control and retention. Prefer aggregated reporting when individual records are not necessary. Medical/professional and other sensitive domains retain their own stricter access boundaries.', 'Normal'),
      ('Independent module and integration architecture', 'Heading2'),
      ('Identity & Organizations connect to all modules. Marketplace can integrate with Inventory (stock reservation/decrement/returns), Finance (quotes/receipts/settlement references), Farms/Crops/Livestock (authorized intended-use context), Education/Knowledge, Health/Veterinary, Government/Public Services, Logistics/Storage, Labs/Research, Community/NGOs, Notifications/Activity/History, Reports/Analytics, AI Companion, Documents/Media and Search/Discovery. Integration contracts/events must be typed, idempotent, audited, authorization-checked at source and target, and must not bypass domain APIs. Private records are not indexed/shared by default.', 'Normal'),
      ('Inventory remains authoritative for stock and movements; Finance remains authoritative for books and approved accounting mappings; Marketplace owns listing/order/booking workflows and immutable agreement snapshots. Finance must remain usable without Marketplace. Module enable/disable must be independent, preserve history and fail safely when optional integrations are unavailable. Legacy routes may redirect for compatibility but do not establish parent-child ownership.', 'Normal'),
      ('Commerce, governance and release safety', 'Heading2'),
      ('Preserve itemized immutable quotes, fee/commission/tax snapshots, decimal-safe money, append-only ledger, idempotency, signed provider webhooks, refunds/chargebacks/reconciliation, seller/buyer histories, verified mutual reviews, reports, evidence, scoped restrictions, appeals and reinstatement. Sandbox transactions are not real money movement. Live payments, refunds, chargebacks, payouts and tax remittance remain disabled until provider integration, security review, qualified legal/accounting review and authenticated end-to-end testing pass.', 'Normal'),
      ('Admin, Super Admin and God Mode share a Registry-backed policy/feature catalogue with dependencies, rollout, audit and rollback. Server-side authorization is mandatory. Disabling a feature blocks new use but preserves historical records and required audit/dispute/refund paths. Restrictions require evidence, scope, actor, reason, review/expiry or permanent decision, notice and appeal; AI risk signals are advisory, never permanent automatic bans.', 'Normal'),
      ('Integration rollout and acceptance criteria', 'Heading2'),
      ('Phase A: synchronize PMD/Bible/Blueprint/roadmap and correct Registry parentage. Phase B: Registry listing types/context policies and Context & Eligibility Engine. Phase C: rebuild Marketplace discovery, provider storefronts, type-aware actions, visibility and safe sharing while preserving existing commerce/trust functionality. Phase D: Inventory/Finance integration through their own domain APIs, then Education, professional services, Government, Logistics, Labs/Research and Community integrations. Phase E: multi-role authenticated E2E, security/privacy/accessibility/low-bandwidth tests, migration/rollback drills, durable media, provider certification and operational readiness.', 'Normal'),
      ('Acceptance: supplier can sell without farmer data; one identity can hold multiple contextual roles; Marketplace/Inventory/Finance can be enabled independently; missing context triggers a relevant, respectful prompt; safety gates cannot be bypassed; confirmed facts have provenance and live in the owning module; public sharing cannot leak private records; integrations are idempotent/audited; no live money movement before release gates. Documentation alone is not implementation: completion requires code, persistence, server authorization, UI, tests and runtime evidence.', 'Normal'),
      ('Related canonical document: docs/KK-CROSS-MODULE-MARKETPLACE-AND-CONTEXT-ARCHITECTURE.md. Execution must preserve existing data, migrations and recovery backups; never reset the database or Docker volumes to make this change.', 'Normal')
    ]
    sect = body.find(W + 'sectPr')
    for text, style in sections:
        p = para(text, style)
        if sect is not None:
            body.insert(list(body).index(sect), p)
        else:
            body.append(p)
    files['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
with ZipFile(tmp, 'w', ZIP_DEFLATED) as zout:
    for name, data in files.items():
        zout.writestr(name, data)
os.replace(tmp, path)
print('Updated PMD DOCX:', path)
print('Added canonical Marketplace/context architecture section:', marker)
print('DOCX package parts preserved:', len(files))
