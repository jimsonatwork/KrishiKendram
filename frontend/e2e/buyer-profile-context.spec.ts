import { expect, test } from '@playwright/test'

test('Marketplace buyer context appears in selected Farm and Crop modules only', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'farmer-context-1', role: 'FARMER' }))
  await page.addInitScript((p) => { localStorage.setItem('accessToken', 'e30.' + p + '.sig') }, payload)
  const sharedContext = {
    available: true,
    context: {
      buyerType: 'FARMER', purchasePurpose: 'FARMING', businessName: null,
      regionLabel: 'Guntur District', operationScale: 'SMALL', cropInterests: ['Paddy', 'Chilli'],
    },
  }
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    if (path === '/auth/me') return route.fulfill({ json: { id: 'farmer-context-1', name: 'Context Farmer', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    if (path === '/marketplace/buyer-profile/context/farms' || path === '/marketplace/buyer-profile/context/crops') return route.fulfill({ json: sharedContext })
    if (path === '/farms/my') return route.fulfill({ json: [{ id: 'farm-1', name: 'Home Farm', ownerId: 'farmer-context-1', area: 2, unit: 'ACRE' }] })
    if (path === '/crops') return route.fulfill({ json: [{ id: 'crop-1', farmId: 'farm-1', name: 'Paddy', status: 'ACTIVE', area: 2, unit: 'ACRE' }] })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/farms')
  await expect(page.getByText('Your Marketplace profile is available here by consent')).toBeVisible()
  await expect(page.getByText('Region: Guntur District')).toBeVisible()
  await expect(page.getByText('Interests: Paddy, Chilli')).toBeVisible()

  await page.goto('/app/crops')
  await expect(page.getByText('Your Marketplace profile is available here by consent')).toBeVisible()
  await expect(page.getByText('Purpose: Farming')).toBeVisible()
})
