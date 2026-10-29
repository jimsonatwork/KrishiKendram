import { expect, test } from '@playwright/test'

test('buyer explicitly consents before linking agricultural order context to owned Farm/Crop records', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'buyer-1', role: 'FARMER' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  let submittedOrder: any = null
  let farmOrCropWrites = 0
  const listing = {
    id: 'listing-input-1', sellerId: 'seller-1', title: 'Urea fertilizer',
    description: 'Agricultural input', category: 'FARM_INPUTS', contextPolicyKey: 'AGRI_INPUT_USAGE',
    offeringType: 'PRODUCT', quantity: 20, minOrderQuantity: 1, unit: 'kg', price: 15,
    currency: 'INR', status: 'PUBLISHED', publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), imageUrls: [], videoUrls: [], externalLinks: [],
    seller: { id: 'seller-1', name: 'Input Seller', displayName: 'Input Seller', isVerified: true, userType: 'FARMER' },
  }

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    if ((path.startsWith('/farms') || path.startsWith('/crops')) && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) farmOrCropWrites += 1

    if (path === '/auth/me') return route.fulfill({ json: { id: 'buyer-1', name: 'Buyer Farmer', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['FARM_INPUTS', 'PRODUCE', 'OTHER'] })
    if (path === '/marketplace/offering-types') return route.fulfill({ json: [{ type: 'PRODUCT', label: 'Physical product', description: 'Goods', fields: [] }] })
    if (path === '/marketplace/listings') return route.fulfill({ json: [listing] })
    if (path === '/marketplace/orders/mine') return route.fulfill({ json: [] })
    if (path === '/marketplace/commerce-policy') return route.fulfill({ json: { version: 1, currency: 'INR', feesEnabled: false, buyerFeeBasisPoints: 0, sellerCommissionBasisPoints: 0, taxEnabled: false, taxBasisPoints: 0, taxReviewReference: null } })
    if (path === '/marketplace/features/public') return route.fulfill({ json: ['marketplace.listings', 'marketplace.orders', 'marketplace.context_capture', 'marketplace.favorites', 'marketplace.messaging'].map(key => ({ key, enabled: true })) })
    if (path === '/marketplace/features') return route.fulfill({ json: [] })
    if (path === '/marketplace/history/mine') return route.fulfill({ json: { purchases: [], sales: [] } })
    if (path === '/marketplace/settlements/mine') return route.fulfill({ json: { mode: 'STATEMENT_ONLY', moneyMovementEnabled: false, currency: 'INR', lineCount: 0, totals: { gross: '0.00', commission: '0.00', sellerNetEstimate: '0.00', capturedSimulation: '0.00', refundedSimulation: '0.00', activePayoutHolds: '0.00' }, lines: [] } })
    if (path === '/marketplace/tax-profiles' || path === '/marketplace/favorites/mine' || path === '/marketplace/messages/mine' || path === '/marketplace/rfqs/mine' || path === '/marketplace/rfqs/open' || path === '/marketplace/trust/cases' || path === '/marketplace/trust/restrictions' || path === '/marketplace/reviews/moderation/queue' || path === '/marketplace/settlements/holds' || path === '/marketplace/settlements/reconciliation' || path === '/livestock') return route.fulfill({ json: [] })
    if (path === '/marketplace/profile/mine') return route.fulfill({ json: { user: { id: 'buyer-1', name: 'Buyer Farmer', isVerified: true, userType: 'FARMER' }, profile: null, publicPhone: null } })
    if (path === '/marketplace/seller-profile-visibility') return route.fulfill({ json: { defaultVisible: true, rules: [] } })
    if (path === '/farms/my') return route.fulfill({ json: [{ id: 'farm-1', name: 'Home Farm', assets: [] }] })
    if (path === '/crops') return route.fulfill({ json: [{ id: 'crop-1', farmId: 'farm-1', name: 'Paddy', farm: { id: 'farm-1', name: 'Home Farm' } }] })
    if (path === '/marketplace/listings/listing-input-1/orders' && method === 'POST') {
      submittedOrder = request.postDataJSON()
      return route.fulfill({ json: { id: 'order-1', status: 'PENDING', ...submittedOrder } })
    }
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/marketplace')
  await expect(page.getByRole('article').getByText('Urea fertilizer')).toBeVisible()
  await page.getByLabel('Intended crop for Urea fertilizer').fill('Paddy')
  await page.getByLabel('Use location for Urea fertilizer').fill('Krishna District')

  await page.getByLabel('Consent to link context for Urea fertilizer').check()
  await page.getByLabel('Context farm link for Urea fertilizer').selectOption('farm-1')
  await page.getByLabel('Context crop link for Urea fertilizer').selectOption('crop-1')
  await page.getByRole('button', { name: 'Request to buy' }).click()

  await expect.poll(() => submittedOrder).not.toBeNull()
  expect(submittedOrder).toMatchObject({
    quantity: 1,
    consentToLinkContext: true,
    contextFarmId: 'farm-1',
    contextCropId: 'crop-1',
    contextAnswers: { intendedCrop: 'Paddy', region: 'Krishna District' },
  })
  expect(farmOrCropWrites).toBe(0)
})
