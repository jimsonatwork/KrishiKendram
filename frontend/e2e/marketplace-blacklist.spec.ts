import { expect, test } from '@playwright/test'

test('Admin can apply and revoke a permanent Marketplace-wide blacklist', async ({ page }) => {
  test.setTimeout(60_000)
  const payload = btoa(JSON.stringify({ userId: 'admin-1', role: 'ADMIN' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  const caseRow = {
    id: 'case-1', reporterId: 'buyer-1', targetUserId: 'seller-1', status: 'OPEN',
    type: 'REPORT', category: 'FRAUD', description: 'Repeated misleading listings reported with supporting evidence.',
    evidenceUrls: ['https://example.test/evidence'], createdAt: '2026-10-18T08:00:00.000Z',
    reporter: { id: 'buyer-1', name: 'Buyer' }, target: { id: 'seller-1', name: 'Seller Under Review' },
  }
  let cases = [caseRow]
  let restrictions: any[] = []
  let decisionBody: Record<string, unknown> | null = null
  let revocationBody: Record<string, unknown> | null = null
  let createdListingPayload: Record<string, unknown> | null = null

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (path === '/auth/me') return route.fulfill({ json: { id: 'admin-1', name: 'Marketplace Admin', role: 'ADMIN', status: 'ACTIVE' } })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    if (path === '/marketplace/categories') return route.fulfill({ json: ['PRODUCE', 'LIVESTOCK', 'EQUIPMENT', 'INPUTS', 'OTHER'] })
    if (path === '/marketplace/listings' && method === 'POST') {
      createdListingPayload = request.postDataJSON()
      return route.fulfill({ json: { id: 'listing-inventory-1', sellerId: 'admin-1', status: 'DRAFT', ...createdListingPayload } })
    }
    if (path === '/marketplace/listings' && method === 'GET') return route.fulfill({ json: [] })
    if (path === '/inventory/items' && method === 'GET') return route.fulfill({ json: [{ id: 'inventory-1', farmId: 'farm-1', name: 'Paddy seed', category: 'SEEDS', unit: 'kg', quantityOnHand: 8, reorderLevel: 2, farm: { id: 'farm-1', name: 'Demo Farm' } }] })
    if (path === '/marketplace/orders/mine') return route.fulfill({ json: [] })
    if (path === '/marketplace/commerce-policy') return route.fulfill({ json: { version: 1, currency: 'INR', feesEnabled: false, buyerFeeBasisPoints: 0, sellerCommissionBasisPoints: 0, taxEnabled: false, taxBasisPoints: 0, taxReviewReference: null } })
    if (path === '/marketplace/features/public') return route.fulfill({ json: ['marketplace.listings', 'marketplace.trust_reports', 'marketplace.favorites', 'marketplace.messaging', 'marketplace.rfq'].map(key => ({ key, enabled: true })) })
    if (path === '/marketplace/features') return route.fulfill({ json: [] })
    if (path === '/marketplace/history/mine') return route.fulfill({ json: { purchases: [], sales: [] } })
    if (path === '/marketplace/settlements/mine') return route.fulfill({ json: { mode: 'STATEMENT_ONLY', moneyMovementEnabled: false, currency: 'INR', lineCount: 0, totals: { gross: '0.00', commission: '0.00', sellerNetEstimate: '0.00', capturedSimulation: '0.00', refundedSimulation: '0.00', activePayoutHolds: '0.00' }, lines: [] } })
    if (path === '/marketplace/tax-profiles') return route.fulfill({ json: [] })
    if (path === '/marketplace/profile/mine') return route.fulfill({ json: { user: { id: 'admin-1', name: 'Marketplace Admin', isVerified: true, userType: 'FARMER' }, profile: null, publicPhone: null } })
    if (path === '/marketplace/seller-profile-visibility') return route.fulfill({ json: { defaultVisible: true, rules: [] } })
    if (path === '/marketplace/favorites/mine' || path === '/marketplace/messages/mine' || path === '/marketplace/rfqs/mine' || path === '/marketplace/rfqs/open') return route.fulfill({ json: [] })
    if (path === '/marketplace/reviews/moderation/queue' || path === '/marketplace/settlements/holds' || path === '/marketplace/settlements/reconciliation') return route.fulfill({ json: [] })
    if (path === '/marketplace/trust/cases' && method === 'GET') return route.fulfill({ json: cases.filter(item => item.status === 'OPEN' || item.status === 'UNDER_REVIEW') })
    if (path === '/marketplace/trust/restrictions' && method === 'GET') return route.fulfill({ json: restrictions })
    if (path === '/marketplace/trust/restrictions/restriction-1/revoke' && method === 'PATCH') {
      revocationBody = request.postDataJSON()
      restrictions = []
      return route.fulfill({ json: { id: 'restriction-1', status: 'REVOKED', reason: 'Reviewed evidence supports a Marketplace-wide restriction.' } })
    }
    if (path === '/marketplace/trust/cases/case-1/resolve' && method === 'PATCH') {
      decisionBody = request.postDataJSON()
      cases = [{ ...caseRow, status: 'RESOLVED', resolution: decisionBody.resolution }]
      restrictions = [{ id: 'restriction-1', userId: 'seller-1', scope: 'MARKETPLACE_ALL', status: 'ACTIVE', reason: decisionBody.resolution, expiresAt: null, user: { id: 'seller-1', name: 'Seller Under Review' } }]
      return route.fulfill({ json: { case: cases[0], restriction: restrictions[0] } })
    }
    if (path === '/farms/my' || path === '/crops' || path === '/livestock') return route.fulfill({ json: [] })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/marketplace')
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled({ timeout: 15_000 })
  await expect(page.getByText('Marketplace trust review queue (1)')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('complementary').getByRole('link', { name: 'Inventory' })).toHaveCount(1)
  await expect(page.getByRole('complementary').getByRole('link', { name: 'Finance' })).toHaveCount(1)
  await page.getByLabel('Decision reason case-1').fill('Reviewed evidence supports a permanent Marketplace-wide restriction.')
  await page.getByLabel('Restriction scope case-1').selectOption('MARKETPLACE_ALL')
  await page.getByLabel('Restriction duration in days case-1').fill('')
  await expect(page.getByText('Permanent blacklist until an Admin revokes it.')).toBeVisible()
  await page.getByRole('button', { name: 'Resolve case' }).click()

  await expect(page.getByText('Active Marketplace cautions & restrictions')).toBeVisible()
  await expect(page.getByText('Permanent blacklist until manually revoked')).toBeVisible()
  expect(decisionBody).toMatchObject({ status: 'RESOLVED', restrictionUserId: 'seller-1', restrictionScope: 'MARKETPLACE_ALL' })
  expect(decisionBody).not.toHaveProperty('restrictionDays')
  await page.getByLabel('Revocation reason restriction-1').fill('Appeal reviewed; restriction no longer required.')
  await page.getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByText('Active Marketplace cautions & restrictions')).toHaveCount(0)
  expect(revocationBody).toMatchObject({ reason: 'Appeal reviewed; restriction no longer required.' })

  await page.goto('/app/inventory')
  await expect(page).toHaveURL(/\/app\/inventory$/)
  await expect(page.getByText('Stock ledger')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Add inventory item' })).toBeVisible()

  await page.goto('/app/finance')
  await expect(page).toHaveURL(/\/app\/finance$/)
  await expect(page.getByRole('heading', { name: 'Financial history' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Add income or expense' })).toBeVisible()

  await page.goto('/app/marketplace?workspace=finance')
  await expect(page.getByText('Seller settlement statement')).toBeVisible()
  await expect(page.getByText('Jurisdiction-aware tax profiles')).toBeVisible()
  await expect(page.getByText('Marketplace fees & tax policy')).toBeVisible()

  await page.getByRole('tab', { name: /Marketplace/ }).click()
  await expect(page.getByPlaceholder('Listing title / generic name')).toBeVisible()
  await page.getByLabel('Resource type').selectOption('inventoryItem')
  await page.getByLabel('Owned resource').selectOption('inventory-1')
  await page.getByPlaceholder('Listing title / generic name').fill('Paddy seed')
  await page.getByPlaceholder('Quantity', { exact: true }).last().fill('4')
  await page.getByPlaceholder('Unit', { exact: true }).fill('kg')
  await page.getByPlaceholder('Price', { exact: true }).fill('30')
  await page.getByRole('button', { name: 'Create listing' }).click()
  await expect.poll(() => createdListingPayload?.resourceType).toBe('inventoryItem')
  expect(createdListingPayload).toMatchObject({ resourceType: 'inventoryItem', resourceId: 'inventory-1', quantity: 4 })

  await page.goto('/app/inventory')
  await expect(page).toHaveURL(/\/app\/inventory$/)
  await expect(page.getByText('Stock ledger')).toBeVisible()

})
