import { expect, test } from '@playwright/test'

test('farmer can inspect archived farms and restore through the explicit lifecycle action', async ({ page }) => {
  const payload = btoa(JSON.stringify({ userId: 'farmer-1', role: 'FARMER' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  const farm = {
    id: 'farm-1',
    name: 'Green Valley Farm',
    type: 'Crop Farm',
    location: 'Hyderabad',
    area: 2,
    unit: 'acres',
    ownerId: 'farmer-1',
  }
  let activeFarms: typeof farm[] = []
  let archivedFarms: typeof farm[] = [{ ...farm }]
  let restoreCalls = 0

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')

    if (path === '/auth/me') {
      return route.fulfill({ json: { id: 'farmer-1', name: 'Farm Owner', role: 'FARMER', status: 'ACTIVE' } })
    }
    if (path === '/auth/refresh') {
      return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    }
    if (path === '/farms/my') return route.fulfill({ json: activeFarms })
    if (path === '/farms/archived') return route.fulfill({ json: archivedFarms })
    if (path === '/crops') return route.fulfill({ json: [] })

    if (path === '/farms/farm-1/restore' && request.method() === 'POST') {
      restoreCalls += 1
      archivedFarms = []
      activeFarms = [{ ...farm }]
      return route.fulfill({ json: activeFarms[0] })
    }

    return route.fulfill({ json: [] })
  })

  await page.goto('/app/farms')
  await expect(page.getByText('No farms yet')).toBeVisible()

  await page.getByRole('button', { name: 'Archived farms' }).click()
  await expect(page.getByText('Green Valley Farm')).toBeVisible()
  await page.getByRole('button', { name: 'Restore' }).click()

  await expect.poll(() => restoreCalls).toBe(1)
  await expect(page.getByText('No archived farms')).toBeVisible()
  await page.getByRole('button', { name: 'Active farms' }).click()
  await expect(page.getByRole('heading', { name: 'Green Valley Farm' }).first()).toBeVisible()
  expect(restoreCalls).toBe(1)
})
