import { expect, test } from '@playwright/test'

test('Super Admin can inspect declared, missing and stale permission registry entries', async ({ page }) => {
  test.setTimeout(60_000)
  const payload = btoa(JSON.stringify({ userId: 'admin-1', role: 'SUPER_ADMIN' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  const admin = {
    id: 'admin-1',
    memberId: 'KK-ADMIN',
    name: 'Platform Admin',
    email: 'admin@example.com',
    mobile: null,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    preferredLanguage: 'en',
    preferredInputMethod: 'TEXT',
    profileCompletion: 100,
    isVerified: true,
    lastLoginAt: '2026-10-18T08:00:00.000Z',
    lastSeenAt: '2026-10-18T08:00:00.000Z',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-18T08:00:00.000Z',
  }

  const permissions = [{
    id: 'permission-read-own',
    module: 'farms',
    section: null,
    resource: 'farm',
    action: 'READ',
    scope: 'OWN',
    inherited: false,
    rolePermissions: [{ role: 'SUPER_ADMIN' }],
    fieldPermissions: [],
  }]

  const reconciliation = {
    summary: {
      declaredCount: 3,
      persistedResourcePermissionCount: 2,
      coveredCount: 1,
      missingCount: 2,
      staleCount: 1,
    },
    declared: [
      { module: 'farms', resource: 'farm', action: 'READ', scope: 'OWN', persisted: true, permissionId: 'permission-read-own' },
      { module: 'farms', resource: 'farm', action: 'READ', scope: 'FARM', persisted: false, permissionId: null },
      { module: 'farms', resource: 'farm', action: 'CREATE', scope: 'FARM', persisted: false, permissionId: null },
    ],
    stale: [
      { id: 'permission-stale', module: 'farms', resource: 'farm', action: 'DELETE', scope: 'FARM' },
    ],
  }

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')

    if (path === '/auth/me') return route.fulfill({ json: admin })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
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
    if (path === '/platform/permissions/reconciliation') return route.fulfill({ json: reconciliation })
    if (path === '/platform/permissions') return route.fulfill({ json: permissions })
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/permissions')
  await expect(page.getByRole('heading', { name: 'Permission Matrix' })).toBeVisible({ timeout: 15_000 })

  const reconciliationSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Registry reconciliation' }),
  })
  await expect(reconciliationSection).toBeVisible()
  await expect(reconciliationSection.getByText('Missing declarations', { exact: true }).first()).toBeVisible()
  await expect(reconciliationSection.getByText('Stale persisted', { exact: true })).toBeVisible()
  await expect(reconciliationSection.getByText('READ · FARM', { exact: true })).toBeVisible()
  await expect(reconciliationSection.getByText('CREATE · FARM', { exact: true })).toBeVisible()
  await expect(reconciliationSection.getByText('DELETE · FARM', { exact: true })).toBeVisible()
  await expect(reconciliationSection.getByText('permission-stale', { exact: true })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Persisted authorization' })).toBeVisible()
  await expect(page.getByText('SUPER_ADMIN', { exact: true })).toBeVisible()
})
