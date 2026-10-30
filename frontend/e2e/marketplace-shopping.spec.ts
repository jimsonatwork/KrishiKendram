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

  await page.getByRole('button', { name: 'Close buyer profile' }).click()
  await page.getByRole('button', { name: /View details & compare/ }).click()
  await expect(page.getByRole('dialog', { name: 'Product details: Certified paddy seeds' })).toBeVisible()
  await expect(page.getByText('Visitors (last hour')).toBeVisible()
  await expect(page.getByText('7', { exact: true }).last()).toBeVisible()
})

test('Shop keeps non-product listings discoverable without treating them as generic product orders', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'shopper-2', role: 'FARMER' }))
  await page.addInitScript((p) => { localStorage.setItem('accessToken', 'e30.' + p + '.sig') }, payload)
  let orderPosts = 0
  const job = {
    id: 'listing-harvest-job', sellerId: 'employer-1', title: 'Harvest helper opportunity',
    description: 'Seasonal field work', category: 'JOBS', offeringType: 'JOB', quantity: 1,
    currency: 'INR', status: 'PUBLISHED', publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), imageUrls: [], videoUrls: [], externalLinks: [],
    seller: { id: 'employer-1', name: 'Local Farm', displayName: 'Local Farm', isVerified: false, userType: 'BUSINESS' },
  }
  await page.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/api/v1', '')
    if (path === '/auth/me') return route.fulfill({ json: { id: 'shopper-2', name: 'Shopper', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/marketplace/listings' && req.method() === 'GET') return route.fulfill({ json: [job] })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['JOBS'] })
    if (path === '/marketplace/features/public') return route.fulfill({ json: [{ key: 'marketplace.listings', enabled: true }, { key: 'marketplace.orders', enabled: true }] })
    if (path === '/marketplace/views/last-hour') return route.fulfill({ json: { counts: { [job.id]: 0 }, windowMinutes: 60 } })
    if (path === '/marketplace/buyer-profile/mine') return route.fulfill({ json: { profile: null, crossModuleConsent: false } })
    if (path === '/marketplace/favorites/mine') return route.fulfill({ json: [] })
    if (path.endsWith('/orders') && req.method() === 'POST') {
      orderPosts += 1
      return route.fulfill({ json: { id: 'unexpected-order', status: 'PENDING' } })
    }
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/shop')
  const article = page.getByRole('article').filter({ hasText: 'Harvest helper opportunity' })
  await expect(article.getByRole('button', { name: 'View details', exact: true })).toBeVisible()
  await article.getByRole('button', { name: 'View details', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Product details: Harvest helper opportunity' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Job listings are visible here for discovery', { exact: false })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Add to cart' })).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Open Marketplace workspace' })).toBeVisible()
  expect(orderPosts).toBe(0)
})

test('Shop obeys external-content switches while retaining locally uploaded media', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'shopper-media', role: 'FARMER' }))
  await page.addInitScript((p) => { localStorage.setItem('accessToken', 'e30.' + p + '.sig') }, payload)
  const listing = {
    id: 'listing-media-policy', sellerId: 'seller-media', title: 'Local and external media listing',
    description: 'Media policy verification', category: 'INPUTS', offeringType: 'PRODUCT',
    quantity: 10, price: 25, currency: 'INR', status: 'PUBLISHED',
    publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    imageUrls: ['https://cdn.example.test/external.jpg', '/uploads/marketplace/local-image.png'],
    videoUrls: ['https://www.youtube.com/watch?v=AbCdEf12345'],
    externalLinks: ['https://drive.google.com/file/d/example/view'],
    seller: { id: 'seller-media', name: 'Media Seller', displayName: 'Media Seller', isVerified: true },
  }
  await page.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/api/v1', '')
    if (path === '/auth/me') return route.fulfill({ json: { id: 'shopper-media', name: 'Media Shopper', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/marketplace/listings' && req.method() === 'GET') return route.fulfill({ json: [listing] })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['INPUTS'] })
    if (path === '/marketplace/features/public') return route.fulfill({ json: [
      { key: 'marketplace.listings', enabled: true },
      { key: 'marketplace.external_content', enabled: false },
      { key: 'marketplace.social_video_embeds', enabled: false },
      { key: 'marketplace.visitor_analytics', enabled: false },
      { key: 'marketplace.listing_qa', enabled: false },
    ] })
    if (path === '/marketplace/views/last-hour') return route.fulfill({ json: { counts: {}, windowMinutes: 60, enabled: false } })
    if (path === '/marketplace/sellers/seller-media/profile') return route.fulfill({ json: { visible: true, publicStats: null } })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/shop')
  await expect(page.getByText('Local and external media listing', { exact: true }).first()).toBeVisible()
  await expect(page.locator('img[src="https://cdn.example.test/external.jpg"]')).toHaveCount(0)
  await page.getByRole('button', { name: /View details & compare/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Product details: Local and external media listing' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('img[src="/uploads/marketplace/local-image.png"]')).toHaveCount(1)
  await expect(dialog.locator('iframe')).toHaveCount(0)
  await expect(dialog.getByText('Seller links & documents')).toHaveCount(0)
})
