import { expect, test } from '@playwright/test'

test('Admin can create, restore and inspect user lifecycle records', async ({ page }) => {
  test.setTimeout(60_000)
  const payload = btoa(JSON.stringify({ userId: 'admin-1', role: 'SUPER_ADMIN' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  const admin = {
    id: 'admin-1', memberId: 'KK-ADMIN', name: 'Platform Admin', email: 'admin@example.com',
    mobile: null, role: 'SUPER_ADMIN', status: 'ACTIVE', preferredLanguage: 'en',
    preferredInputMethod: 'TEXT', profileCompletion: 100, isVerified: true,
    lastLoginAt: '2026-10-18T08:00:00.000Z', lastSeenAt: '2026-10-18T08:00:00.000Z',
    createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-18T08:00:00.000Z',
  }
  const pending = {
    id: 'user-pending-1', memberId: 'KK-PENDING', name: 'Pending Deletion User',
    email: 'pending@example.com', mobile: null, role: 'FARMER', status: 'PENDING_DELETE',
    preferredLanguage: 'en', preferredInputMethod: 'TEXT', profileCompletion: 25,
    isVerified: false, lastLoginAt: null, lastSeenAt: null,
    createdAt: '2026-10-02T08:00:00.000Z', updatedAt: '2026-10-18T08:00:00.000Z',
  }
  let users: any[] = [admin, pending]
  let createPayload: Record<string, unknown> | null = null
  let restoreCalls = 0

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (path === '/auth/me') return route.fulfill({ json: admin })
    if (path === '/ai/conversations/voice-intents') return route.fulfill({ json: {
      registryId: 'KK-AI-REGISTRY-001',
      manifestId: 'KK-AI-VOICE-INTENTS-001',
      manifestVersion: 1,
      navigationPrefixes: [],
      authorizationSource: 'TEST_FIXTURE',
      cropTerminology: null,
      privilegedIntentsAvailable: false,
      restrictedIntents: [],
      intents: [],
    } })
    if (path === '/ai/conversations/status') return route.fulfill({ json: {
      enabled: false, ready: false, canGenerate: false, productionReady: false,
      evaluationOnly: true, providerId: null, modelId: null, modelVersion: null,
      status: 'DISABLED', mode: 'LOCAL', cloudFallback: false,
      databaseWriteAllowed: false, runtime: { reachable: false, modelInstalled: false },
    } })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    if (path === '/users' && method === 'GET') return route.fulfill({ json: users })
    if (path === '/users' && method === 'POST') {
      createPayload = request.postDataJSON()
      const created = {
        ...admin, id: 'user-new-1', memberId: 'KK-NEW',
        name: String(createPayload?.name ?? ''), email: String(createPayload?.email ?? ''),
        mobile: null, role: 'FARMER', status: 'PENDING', preferredLanguage: null,
        preferredInputMethod: 'TEXT', profileCompletion: 0, isVerified: false,
        lastLoginAt: null, lastSeenAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      users = [...users, created]
      return route.fulfill({ json: created })
    }
    if (path === '/users/user-pending-1/restore' && method === 'POST') {
      restoreCalls += 1
      users = users.map((user) => user.id === 'user-pending-1'
        ? { ...user, status: 'ACTIVE', updatedAt: new Date().toISOString() }
        : user)
      return route.fulfill({ json: users.find((user) => user.id === 'user-pending-1') })
    }
    if (path === '/users/user-pending-1/activity') return route.fulfill({ json: [] })
    if (path === '/users/user-pending-1/relationships/history') return route.fulfill({ json: [] })
    return route.fulfill({ json: [] })
  })

  page.on('dialog', (dialog) => void dialog.accept())

  await page.goto('/app/users')
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Pending Deletion User')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Create user', exact: true }).first().click()
  const createDialog = page.getByRole('dialog', { name: 'Create user' })
  await createDialog.getByLabel('Name').fill('New Farmer')
  await createDialog.getByLabel('Email').fill('new-farmer@example.com')
  await createDialog.getByLabel('Password').fill('temporary123')
  await createDialog.getByRole('button', { name: 'Create user' }).click()
  await expect(page.getByText('User created successfully. The new user is currently PENDING.')).toBeVisible()
  await expect(page.getByText('New Farmer')).toBeVisible()
  expect(createPayload).toMatchObject({ name: 'New Farmer', email: 'new-farmer@example.com' })

  const pendingRow = page.getByRole('row').filter({ hasText: 'Pending Deletion User' })
  await expect(pendingRow.getByRole('button', { name: 'Restore' })).toBeVisible()
  await pendingRow.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText('Pending Deletion User restored successfully. Account status is ACTIVE.')).toBeVisible()
  await expect(pendingRow.getByText('Active', { exact: true })).toBeVisible()
  expect(restoreCalls).toBe(1)

  await pendingRow.getByRole('button', { name: 'Activity' }).click()
  await expect(page.getByRole('dialog', { name: 'User activity' })).toBeVisible()
  await expect(page.getByText('No resource relationships recorded for this user.')).toBeVisible()
  await expect(page.getByText('No recent activity')).toBeVisible()
})
