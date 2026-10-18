import { expect, test } from '@playwright/test'

const evidenceDeadline = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

async function setupMarketplaceChargeback(page: any, actor: 'buyer' | 'seller') {
  const userId = actor === 'buyer' ? 'buyer-1' : 'seller-1'
  const role = 'FARMER'
  const tokenPayload = btoa(JSON.stringify({ userId, role }))
  await page.addInitScript((payload: string) => {
    localStorage.setItem('accessToken', 'e30.' + payload + '.sig')
    localStorage.removeItem('refreshToken')
  }, tokenPayload)

  const chargeback: any = {
    id: 'chargeback-1', orderId: 'order-1', providerChargebackId: 'sandbox_chargeback_1234', status: 'OPEN',
    amount: '25.00', currency: 'INR', reason: 'Produce quality concern', evidenceUrls: ['https://example.test/buyer-evidence'],
    evidenceDeadline: evidenceDeadline(), outcomeReason: null, createdAt: new Date().toISOString(),
  }
  const order: any = {
    id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'COMPLETED', quantity: 25,
    unitPrice: '4.00', agreedUnitPrice: '4.00', currency: 'INR', note: null,
    listing: { id: 'listing-1', title: 'Fresh paddy produce' },
    payments: [{ id: 'payment-1', provider: 'sandbox', status: 'CAPTURED', amount: '100.00', currency: 'INR', refunds: [], chargebacks: actor === 'seller' ? [chargeback] : [] }],
  }
  let chargebacks: any[] = actor === 'seller' ? [chargeback] : []
  let createPayload: any = null
  let evidencePayload: any = null

  await page.route('**/api/v1/**', async (route: any) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    if (path === '/auth/me') return route.fulfill({ json: { id: userId, name: actor === 'buyer' ? 'Buyer Farmer' : 'Seller Farmer', role, status: 'ACTIVE' } })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['PRODUCE', 'LIVESTOCK', 'EQUIPMENT', 'INPUTS', 'OTHER'] })
    if (path === '/marketplace/listings') return route.fulfill({ json: [{ id: 'listing-1', sellerId: 'seller-1', title: 'Fresh paddy produce', description: 'Fresh harvest', category: 'PRODUCE', quantity: 25, minOrderQuantity: 1, unit: 'kg', price: 4, currency: 'INR', status: 'PUBLISHED', imageUrls: [], videoUrls: [], externalLinks: [], seller: { id: 'seller-1', name: 'Seller Farmer' } }] })
    if (path === '/marketplace/orders/mine') return route.fulfill({ json: [{ ...order, payments: order.payments.map((payment: any) => ({ ...payment, chargebacks })) }] })
    if (path === '/marketplace/commerce-policy') return route.fulfill({ json: { version: 1, currency: 'INR', feesEnabled: false, buyerFeeBasisPoints: 0, sellerCommissionBasisPoints: 0, taxEnabled: false, taxBasisPoints: 0, taxReviewReference: null } })
    if (path === '/marketplace/features/public') return route.fulfill({ json: ['marketplace.listings', 'marketplace.orders', 'marketplace.chargebacks_sandbox', 'marketplace.payment_sandbox', 'marketplace.refunds_sandbox', 'marketplace.history', 'marketplace.favorites', 'marketplace.messaging', 'marketplace.rfq', 'marketplace.trust_reports'].map(key => ({ key, enabled: true })) })
    if (path === '/marketplace/features') return route.fulfill({ json: [] })
    if (path === '/marketplace/history/mine') return route.fulfill({ json: { purchases: [], sales: [] } })
    if (path === '/marketplace/settlements/mine') return route.fulfill({ json: { mode: 'STATEMENT_ONLY', moneyMovementEnabled: false, currency: 'INR', lineCount: 0, totals: { gross: '0.00', commission: '0.00', sellerNetEstimate: '0.00', capturedSimulation: '0.00', refundedSimulation: '0.00', activePayoutHolds: '0.00' }, lines: [] } })
    if (path === '/marketplace/tax-profiles') return route.fulfill({ json: [] })
    if (path === '/marketplace/profile/mine') return route.fulfill({ json: { user: { id: userId, name: actor === 'buyer' ? 'Buyer Farmer' : 'Seller Farmer', isVerified: true, userType: 'FARMER' }, profile: null, publicPhone: null } })
    if (path === '/marketplace/favorites/mine' || path === '/marketplace/messages/mine' || path === '/marketplace/rfqs/mine' || path === '/marketplace/rfqs/open') return route.fulfill({ json: [] })
    if (path === '/marketplace/trust/cases' || path === '/marketplace/trust/restrictions' || path === '/marketplace/reviews/moderation/queue' || path === '/marketplace/settlements/holds' || path === '/marketplace/settlements/reconciliation') return route.fulfill({ json: [] })
    if (path === '/farms/my' || path === '/crops' || path === '/livestock' || path === '/inventory/items') return route.fulfill({ json: [] })
    if (path === '/marketplace/orders/order-1/chargebacks/sandbox' && method === 'POST') {
      createPayload = request.postDataJSON()
      const created = { ...chargeback, id: 'chargeback-new', amount: String(createPayload.amount), reason: createPayload.reason, evidenceUrls: [], evidenceDeadline: evidenceDeadline() }
      chargebacks = [created]
      return route.fulfill({ json: { ...created, simulationOnly: true, notice: 'Sandbox chargeback simulation only. No payment provider has been contacted and no money has moved.' } })
    }
    if (path === '/marketplace/chargebacks/sandbox/chargeback-1/evidence' && method === 'PATCH') {
      evidencePayload = request.postDataJSON()
      chargebacks = [{ ...chargeback, evidenceUrls: [...chargeback.evidenceUrls, ...evidencePayload.evidenceUrls] }]
      return route.fulfill({ json: { ...chargebacks[0], simulationOnly: true } })
    }
    return route.fulfill({ json: [] })
  })
  return { getCreatePayload: () => createPayload, getEvidencePayload: () => evidencePayload }
}

test('buyer opens a bounded sandbox chargeback and sees the evidence deadline', async ({ page }) => {
  const state = await setupMarketplaceChargeback(page, 'buyer')
  await page.goto('/app/marketplace')
  await expect(page.getByRole('article').filter({ hasText: 'Your request' }).getByText('Fresh paddy produce')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open sandbox chargeback' })).toBeVisible()
  await page.getByLabel('Sandbox chargeback amount order-1').fill('25.00')
  await page.getByLabel('Sandbox chargeback reason order-1').fill('Produce quality concern')
  await page.getByRole('button', { name: 'Open sandbox chargeback' }).click()
  await expect(page.getByText('Sandbox chargeback - OPEN - INR 25.00')).toBeVisible()
  await expect(page.getByText(/Evidence deadline:/)).toBeVisible()
  await expect(page.getByText(/No real provider or funds are involved/)).toBeVisible()
  expect(state.getCreatePayload()).toMatchObject({ amount: '25.00', reason: 'Produce quality concern' })
})

test('seller can submit HTTPS evidence for an open sandbox chargeback', async ({ page }) => {
  const state = await setupMarketplaceChargeback(page, 'seller')
  await page.goto('/app/marketplace')
  await expect(page.getByText('Sandbox chargeback - OPEN - INR 25.00')).toBeVisible()
  await page.getByLabel('Evidence links for chargeback chargeback-1').fill('https://example.test/seller-evidence')
  await page.getByRole('button', { name: 'Submit evidence' }).click()
  await expect(page.getByRole('link', { name: 'Evidence link 2' })).toBeVisible()
  expect(state.getEvidencePayload()).toMatchObject({ evidenceUrls: ['https://example.test/seller-evidence'] })
})
