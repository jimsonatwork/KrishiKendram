from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
from pathlib import Path
import os

path = Path('/home/jj/Dev/KrishiKendram/Absolutely KK PMD.docx')
tmp = path.with_suffix('.docx.tmp')
ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ET.register_namespace('w', ns)
W = '{%s}' % ns
marker = '2026-10-27 — Consent-aware Farm/Crop context links in Marketplace'
with ZipFile(path, 'r') as zin:
    files = {name: zin.read(name) for name in zin.namelist()}
root = ET.fromstring(files['word/document.xml'])
body = root.find('.//' + W + 'body')
if body is None:
    raise RuntimeError('DOCX body not found')
existing = ''.join((t.text or '') for t in root.findall('.//' + W + 't'))
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
        t.text = text
        return p
    sections = [
        (marker, 'Heading1'),
        ('Requirement and implementation contract', 'Heading2'),
        ('For agricultural-input orders, Marketplace may optionally associate the order with an existing Farm and/or Crop owned by the buyer. This is an order-specific association, not a Farm/Crop update. The UI must present an unchecked, explicit consent control and explain the purpose and scope before any record is linked.', 'Normal'),
        ('Server enforcement: reject Farm/Crop IDs without consent; require active records owned by the authenticated buyer; verify that a selected Crop belongs to the selected Farm; do not trust client-supplied owner IDs. Persist optional contextFarmId/contextCropId foreign keys on MarketplaceOrder and retain the user-confirmed contextAnswers and versioned contextPolicySnapshot. The snapshot records consent timestamp, linked IDs and ORDER_CONTEXT_ONLY scope.', 'Normal'),
        ('Privacy and lifecycle: do not write to authoritative Farm/Crop records, share this context with researchers/advertisers/other organizations, or create a record as an AI side effect. A future create/update workflow must be a separate explicit, previewed, authorized action. If a linked Farm/Crop is deleted, its optional foreign key is set null while the order snapshot/audit history remains.', 'Normal'),
        ('Acceptance tests: context fields are allow-listed and normalized; unknown keys are not persisted; policy version/provenance and order audit are retained; order history is limited to buyer/seller participants; unconsented links and records not owned by the buyer are rejected; mismatched Crop/Farm selections are rejected; a consented owned link is saved only on the order; no Farm/Crop write request is issued by checkout.', 'Normal'),
        ('Current evidence: backend MarketplaceService suite 67/67 passed; full backend regression 69 suites / 677 tests passed; backend and frontend production builds passed; the consent-link Playwright test passed 1/1. See the dated CTO execution plan for current runtime and migration checks.', 'Normal'),
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
print('PMD context-link section ensured:', marker)
