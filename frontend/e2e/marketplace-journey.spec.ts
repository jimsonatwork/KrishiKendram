import { expect, test } from '@playwright/test'

test('Marketplace buyer/seller workspace exposes profiles, saved listings, private messages, RFQs and settlement transparency', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'buyer-1', role: 'FARMER' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  let favorites: any[] = []
  let messages: any[] = []
  let rfqs: any[] = []
  let favoriteCalls = 0
  let messageCalls = 0
  let rfqCalls = 0
  const listing = { id: 'listing-1', sellerId: 'seller-1', title: 'Fresh paddy seed', description: 'Certified seed lots', category: 'PRODUCE', quantity: 200, minOrderQuantity: 1, unit: 'kg', price: 42, currency: 'INR', status: 'PUBLISHED', imageUrls: [], videoUrls: [], externalLinks: [], seller: { id: 'seller-1', name: 'Seed Seller', displayName: 'Green Seed Farm', isVerified: true, userType: 'FARMER', profile: { regionLabel: 'Warangal', bio: 'Seed producer', contactPreference: 'IN_APP', publicPhone: null, showPhone: false } } }

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (path === '/auth/me') return route.fulfill({ json: { id: 'buyer-1', name: 'Buyer Farmer', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['PRODUCE', 'LIVESTOCK', 'EQUIPMENT', 'INPUTS', 'OTHER'] })
    if (path === '/marketplace/listings') return route.fulfill({ json: [listing] })
    if (path === '/marketplace/orders/mine') return route.fulfill({ json: [] })
    if (path === '/marketplace/commerce-policy') return route.fulfill({ json: { version: 1, currency: 'INR', feesEnabled: false, buyerFeeBasisPoints: 0, sellerCommissionBasisPoints: 0, taxEnabled: false, taxBasisPoints: 0, taxReviewReference: null } })
    if (path === '/marketplace/features/public') return route.fulfill({ json: ['marketplace.listings','marketplace.favorites','marketplace.messaging','marketplace.rfq','marketplace.history'].map(key => ({ key, enabled: true })) })
    if (path === '/marketplace/features') return route.fulfill({ json: [] })
    if (path === '/marketplace/history/mine') return route.fulfill({ json: { purchases: [], sales: [] } })
    if (path === '/marketplace/settlements/mine') return route.fulfill({ json: { mode: 'STATEMENT_ONLY', moneyMovementEnabled: false, currency: 'INR', lineCount: 0, totals: { gross:'0.00', commission:'0.00', sellerNetEstimate:'0.00', capturedSimulation:'0.00', refundedSimulation:'0.00', activePayoutHolds:'0.00' }, lines: [] } })
    if (path === '/marketplace/tax-profiles') return route.fulfill({ json: [] })
    if (path === '/marketplace/profile/mine') return route.fulfill({ json: { user: { id:'buyer-1', name:'Buyer Farmer', isVerified:true, userType:'FARMER' }, profile: null, publicPhone: null } })
    if (path === '/marketplace/favorites/mine') return route.fulfill({ json: favorites })
    if (path === '/marketplace/messages/mine') return route.fulfill({ json: messages })
    if (path === '/marketplace/rfqs/mine') return route.fulfill({ json: rfqs })
    if (path === '/marketplace/rfqs/open') return route.fulfill({ json: [] })
    if (path === '/marketplace/trust/cases' || path === '/marketplace/trust/restrictions' || path === '/marketplace/reviews/moderation/queue' || path === '/marketplace/settlements/holds' || path === '/marketplace/settlements/reconciliation') return route.fulfill({ json: [] })
    if (path === '/crops' || path === '/livestock' || path === '/farms/my') return route.fulfill({ json: [] })

    if (path === '/marketplace/listings/listing-1/favorite' && method === 'POST') {
      favoriteCalls += 1
      favorites = [{ id: 'favorite-1', listingId: 'listing-1', status: 'ACTIVE', listing }]
      return route.fulfill({ json: favorites[0] })
    }
    if (path === '/marketplace/listings/listing-1/favorite' && method === 'DELETE') {
      favorites = []
      return route.fulfill({ json: { removed: true } })
    }
    if (path === '/marketplace/messages' && method === 'POST') {
      messageCalls += 1
      const body = request.postDataJSON()
      messages = [{ id: 'message-1', senderId: 'buyer-1', recipientId: 'seller-1', listingId: 'listing-1', body: body.body, createdAt: new Date().toISOString(), sender: { id:'buyer-1',name:'Buyer Farmer' }, recipient: { id:'seller-1',name:'Seed Seller' }, listing: { id:'listing-1',title:listing.title } }]
      return route.fulfill({ json: messages[0] })
    }
    if (path === '/marketplace/rfqs' && method === 'POST') {
      rfqCalls += 1
      const body = request.postDataJSON()
      rfqs = [{ id:'rfq-1', buyerId:'buyer-1', status:'OPEN', title:body.title, category:body.category, quantity:body.quantity, unit:body.unit, description:body.description, currency:'INR', responses:[] }]
      return route.fulfill({ json: rfqs[0] })
    }
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/marketplace')
  await expect(page.getByText('Seller profile & buyer contact preferences')).toBeVisible()
  await page.getByRole('tab', { name: /Finance/ }).click()
  await expect(page.getByText('Seller settlement statement')).toBeVisible()
  await expect(page.getByText('Buyer & seller history')).toBeVisible()
  await page.getByRole('tab', { name: /Marketplace/ }).click()
  await expect(page.getByText('Bulk buyer RFQ & seller quotations')).toBeVisible()
  await expect(page.getByRole('article').getByText('Fresh paddy seed')).toBeVisible()
  await expect(page.getByText(/Seller: Green Seed Farm/)).toBeVisible()
  await expect(page.getByText(/Warangal/)).toBeVisible()

  await page.getByRole('button', { name: 'Save listing' }).click()
  await expect(page.getByRole('button', { name: 'Remove saved' })).toBeVisible()
  expect(favoriteCalls).toBe(1)

  await page.getByRole('button', { name: 'Message seller' }).click()
  await page.getByLabel('Marketplace message body').fill('Can you supply 50 kg next week?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Can you supply 50 kg next week?')).toBeVisible()
  expect(messageCalls).toBe(1)

  await page.getByLabel('RFQ title').fill('Bulk paddy seed for FPO')
  await page.getByLabel('RFQ quantity').fill('500')
  await page.getByLabel('RFQ unit').fill('kg')
  await page.getByLabel('RFQ description').fill('Certified seed with batch traceability and delivery to Warangal.')
  await page.getByRole('button', { name: 'Publish bulk RFQ' }).click()
  await expect(page.getByText('Bulk paddy seed for FPO')).toBeVisible()
  expect(rfqCalls).toBe(1)
})
