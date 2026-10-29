import { expect, test } from '@playwright/test'

test('separate Shop & Compare supports browsing, compare, cart and consent-based buyer profile', async ({ page }) => {
  page.on('pageerror', error => console.log('SHOP_PAGEERROR=' + error.stack))
  page.on('console', message => { if (message.type() === 'error') console.log('SHOP_CONSOLE_ERROR=' + message.text()) })
  const payload = btoa(JSON.stringify({ userId: 'shopper-1', role: 'FARMER' }))
  await page.addInitScript((p) => { localStorage.setItem('accessToken', 'e30.' + p + '.sig') }, payload)
  let savedProfile: any = null
  const listing = {
    id: 'listing-paddy-seed', sellerId: 'seller-1', title: 'Certified paddy seeds',
    description: 'High quality seed for paddy cultivation', category: 'INPUTS', offeringType: 'PRODUCT',
    quantity: 100, minOrderQuantity: 1, unit: 'kg', price: 65, currency: 'INR', status: 'PUBLISHED',
    publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), imageUrls: [], videoUrls: [], externalLinks: [],
    seller: { id: 'seller-1', name: 'Local Seeds', displayName: 'Local Seeds', isVerified: true, userType: 'BUSINESS', profile: { regionLabel: 'Guntur' } },
  }
  await page.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/api/v1', '')
    if (path === '/auth/me') return route.fulfill({ json: { id: 'shopper-1', name: 'Shopper Farmer', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/marketplace/listings' && req.method() === 'GET') return route.fulfill({ json: [listing] })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['INPUTS', 'PRODUCE', 'EQUIPMENT'] })
    if (path === '/marketplace/features/public') return route.fulfill({ json: ['marketplace.listings', 'marketplace.orders', 'marketplace.favorites'].map(key => ({ key, enabled: true })) })
    if (path === '/marketplace/views/last-hour') return route.fulfill({ json: { counts: { 'listing-paddy-seed': 3 }, windowMinutes: 60 } })
    if (path === '/marketplace/buyer-profile/mine' && req.method() === 'GET') return route.fulfill({ json: { profile: null, crossModuleConsent: false } })
    if (path === '/marketplace/buyer-profile/mine' && req.method() === 'PATCH') {
      savedProfile = req.postDataJSON()
      return route.fulfill({ json: { profile: { ...savedProfile, moduleTargets: savedProfile.crossModuleConsent ? savedProfile.moduleTargets : [] }, crossModuleConsent: savedProfile.crossModuleConsent } })
    }
    if (path === '/marketplace/favorites/mine') return route.fulfill({ json: [] })
    if (path === '/marketplace/listings/listing-paddy-seed/views' && req.method() === 'POST') return route.fulfill({ json: { listingId: listing.id, visitorsLastHour: 7, windowMinutes: 60 } })
    if (path === '/marketplace/listings/listing-paddy-seed/views') return route.fulfill({ json: { listingId: listing.id, visitorsLastHour: 7, windowMinutes: 60 } })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/shop')
  await expect(page.getByRole('heading', { name: 'Good buying starts with the right context.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByText('Certified paddy seeds', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('3 viewing in last hour')).toBeVisible()
  await page.getByLabel('Search products and sellers').fill('paddy')
  await expect(page.getByText('1 of 1 listings')).toBeVisible()
  await page.getByRole('button', { name: 'Add to comparison' }).click()
  await expect(page.getByRole('heading', { name: 'Compare products (1/4)' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible()
  await expect(page.getByText('Real payment checkout is disabled.')).toBeVisible()

  await page.getByRole('button', { name: 'Preferences' }).click()
  await page.getByLabel('I buy as').selectOption('COMMISSION_AGENT')
  await page.getByLabel('Purchase purpose').selectOption('COMMISSION')
  await page.getByLabel('I consent to use this profile in the KK modules I select below.').check()
  await page.getByLabel('Crop planning').check()
  await page.getByRole('button', { name: 'Save buying profile' }).click()
  await expect.poll(() => savedProfile).not.toBeNull()
  expect(savedProfile).toMatchObject({ buyerType: 'COMMISSION_AGENT', purchasePurpose: 'COMMISSION', crossModuleConsent: true, moduleTargets: ['crops'] })

  await page.getByRole('button', { name: 'Close cart' }).click()
  await page.getByRole('button', { name: /View details & compare/ }).click()
  await expect(page.getByRole('dialog', { name: 'Product details: Certified paddy seeds' })).toBeVisible()
  await expect(page.getByText('Visitors (last hour')).toBeVisible()
  await expect(page.getByText('7', { exact: true }).last()).toBeVisible()
})
