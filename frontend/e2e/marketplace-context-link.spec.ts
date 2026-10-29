import { expect, test } from '@playwright/test'

test('buyer explicitly consents before linking agricultural order context to owned Farm/Crop records', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'buyer-1', role: 'FARMER' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  let submittedOrder: any = null
  let submittedRentalOrder: any = null
  let farmOrCropWrites = 0
  const listing = {
    id: 'listing-input-1', sellerId: 'seller-1', title: 'Urea fertilizer',
    description: 'Agricultural input', category: 'FARM_INPUTS', contextPolicyKey: 'AGRI_INPUT_USAGE',
    offeringType: 'PRODUCT', quantity: 20, minOrderQuantity: 1, unit: 'kg', price: 15,
    currency: 'INR', status: 'PUBLISHED', publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), imageUrls: [], videoUrls: [], externalLinks: [],
    seller: { id: 'seller-1', name: 'Input Seller', displayName: 'Input Seller', isVerified: true, userType: 'FARMER' },
  }
  const rentalListing = {
    id: 'listing-rental-1', sellerId: 'seller-2', title: 'Tractor rental',
    description: 'Rent a tractor by the day', category: 'EQUIPMENT', contextPolicyKey: 'RENTAL_BOOKING',
    offeringType: 'RENTAL', quantity: 2, minOrderQuantity: 1, unit: 'day', price: 2500,
    currency: 'INR', status: 'PUBLISHED', publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), imageUrls: [], videoUrls: [], externalLinks: [],
    seller: { id: 'seller-2', name: 'Equipment Provider', displayName: 'Equipment Provider', isVerified: true, userType: 'BUSINESS' },
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
    if (path === '/marketplace/context-policies/AGRI_INPUT_USAGE') return route.fulfill({ json: { key: 'AGRI_INPUT_USAGE', version: 1, title: 'Help us tailor safe agricultural product guidance', purpose: 'The crop and growing context helps KK and the seller provide relevant use instructions and follow-up support.', blockingAction: 'ORDER_CREATE', noAdviceUntilComplete: true, requiredFields: [{ key: 'intendedCrop', label: 'Intended crop', prompt: 'Which crop will you use this product for?', required: true, type: 'text', reason: 'Usage guidance depends on the crop.' }, { key: 'region', label: 'Use location', prompt: 'Which village, town or district will it be used in?', required: true, type: 'text', reason: 'Recommendations can vary by local conditions.' }], recommendedFields: [{ key: 'area', label: 'Area', prompt: 'How much area will you use it on?', required: false, type: 'number', reason: 'Helps estimate quantities.' }, { key: 'areaUnit', label: 'Area unit', prompt: 'Which area unit do you use?', required: false, type: 'text', reason: 'Prevents unit assumptions.' }, { key: 'growthStage', label: 'Crop stage', prompt: 'Crop stage', required: false, type: 'text', reason: 'Application timing can matter.' }, { key: 'purpose', label: 'Intended purpose', prompt: 'What are you trying to improve or treat?', required: false, type: 'text', reason: 'Helps distinguish needs.' }] } })
    if (path === '/marketplace/context-policies/RENTAL_BOOKING') return route.fulfill({ json: { key: 'RENTAL_BOOKING', version: 1, title: 'Tell the provider when and where you need the rental', purpose: 'Rental dates and use location help the provider confirm availability, delivery and the right price.', blockingAction: 'ORDER_CREATE', noAdviceUntilComplete: false, requiredFields: [{ key: 'startDate', label: 'Rental start date', prompt: 'When should the rental start?', required: true, type: 'date', reason: 'The provider needs the start date.' }, { key: 'endDate', label: 'Rental end date', prompt: 'When should the rental end?', required: true, type: 'date', reason: 'The provider needs the rental period.' }, { key: 'useLocation', label: 'Use location', prompt: 'Where will it be used?', required: true, type: 'text', reason: 'Availability depends on location.' }], recommendedFields: [{ key: 'usePurpose', label: 'Intended use', prompt: 'What will you use it for?', required: false, type: 'text', reason: 'Helps confirm suitability.' }] } })
    if (path === '/marketplace/listings') return route.fulfill({ json: [listing, rentalListing] })
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
    if (path === '/marketplace/listings/listing-rental-1/orders' && method === 'POST') {
      submittedRentalOrder = request.postDataJSON()
      return route.fulfill({ json: { id: 'order-rental-1', status: 'PENDING', ...submittedRentalOrder } })
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

  const rentalArticle = page.getByRole('article').filter({ hasText: 'Tractor rental' })
  await expect(rentalArticle).toBeVisible()
  await rentalArticle.getByLabel('Rental start date for Tractor rental').fill('2026-11-03')
  await rentalArticle.getByLabel('Rental end date for Tractor rental').fill('2026-11-05')
  await rentalArticle.getByLabel('Use location for Tractor rental').fill('Warangal')
  await rentalArticle.getByRole('button', { name: 'Request rental' }).click()
  await expect.poll(() => submittedRentalOrder).not.toBeNull()
  expect(submittedRentalOrder).toMatchObject({
    quantity: 1,
    contextAnswers: { startDate: '2026-11-03', endDate: '2026-11-05', useLocation: 'Warangal' },
  })
})
