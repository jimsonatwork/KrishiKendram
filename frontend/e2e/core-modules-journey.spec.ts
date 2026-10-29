import { expect, test } from '@playwright/test'

test('core farm workflows connect inventory ledger, finance records, notifications and reports', async ({ page }) => {
  test.setTimeout(60_000)
  const payload = btoa(JSON.stringify({ userId: 'farmer-1', role: 'FARMER' }))
  await page.addInitScript((tokenPayload) => {
    localStorage.setItem('accessToken', 'e30.' + tokenPayload + '.sig')
    localStorage.removeItem('refreshToken')
  }, payload)

  const farm = { id: 'farm-1', name: 'Jinse Agro Farm', area: 2, unit: 'ACRE', ownerId: 'farmer-1' }
  let inventory: any[] = []
  let movements: any[] = []
  let finances: any[] = []
  let notifications: any[] = [{ id: 'notice-1', userId: 'farmer-1', type: 'LOW_STOCK', title: 'Seed reorder alert', message: 'Paddy seed is running low.', href: '/app/inventory', severity: 'WARNING', source: 'inventory', expiresAt: '2027-04-16T08:00:00.000Z', readAt: null, createdAt: '2026-10-18T08:00:00.000Z' }]
  let inventoryCreateCalls = 0
  let movementCalls = 0
  let financeCreateCalls = 0

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (path === '/auth/me') return route.fulfill({ json: { id: 'farmer-1', name: 'Farm Owner', role: 'FARMER', status: 'ACTIVE' } })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'No refresh token in fixture.' } })
    if (path === '/farms/my') return route.fulfill({ json: [farm] })
    if (path === '/crops' || path === '/livestock') return route.fulfill({ json: [] })
    if (path === '/marketplace/listings') return route.fulfill({ json: [] })
    if (path === '/reports/overview') return route.fulfill({ json: { generatedAt: new Date().toISOString(), filters: { farmId: null, fromDate: null, toDate: null }, availableFarms: [farm], totals: { farmCount: 1, cropRecords: 0, livestockRecords: 0, inventoryItems: inventory.length, lowStockItems: inventory.filter(item => Number(item.quantityOnHand || 0) <= Number(item.reorderLevel || 0)).length, listingCount: 0, publishedListings: 0, financeByCurrency: [{ currency: 'INR', income: finances.filter(item => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount || 0), 0), expense: finances.filter(item => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount || 0), 0), net: finances.filter(item => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount || 0), 0) - finances.filter(item => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount || 0), 0) }] }, farms: [{ farmId: farm.id, name: farm.name, area: farm.area, unit: farm.unit, cropRecords: 0, livestockRecords: 0, inventoryItems: inventory.length, lowStockItems: inventory.filter(item => Number(item.quantityOnHand || 0) <= Number(item.reorderLevel || 0)).length, financeByCurrency: [{ currency: 'INR', income: finances.filter(item => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount || 0), 0), expense: finances.filter(item => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount || 0), 0), net: finances.filter(item => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount || 0), 0) - finances.filter(item => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount || 0), 0) }] }], financialDetails: finances.map(item => ({ id: item.id, farmId: item.farmId, farmName: farm.name, type: item.type, category: item.category || '', amount: Number(item.amount || 0), currency: item.currency || 'INR', occurredAt: item.occurredAt || null, reference: item.reference || '', notes: item.notes || '' })), warnings: [], notes: { financialTotals: 'Amounts are grouped by currency; no foreign-exchange conversion is applied.', marketplaceListings: 'Listing totals are seller-wide.', source: 'Aggregated from authorized module services.' } } })

    if (path === '/inventory/items' && method === 'GET') return route.fulfill({ json: inventory })
    if (path === '/inventory/items' && method === 'POST') {
      inventoryCreateCalls += 1
      const body = request.postDataJSON()
      const item = { id: 'inventory-1', farmId: body.farmId, name: body.name, category: body.category, unit: body.unit, quantityOnHand: body.initialQuantity, reorderLevel: body.reorderLevel, supplier: body.supplier, notes: body.notes, farm: { id: farm.id, name: farm.name } }
      inventory = [item]
      if (body.initialQuantity > 0) movements = [{ id: 'movement-opening', type: 'STOCK_IN', quantity: body.initialQuantity, quantityBefore: 0, quantityAfter: body.initialQuantity, createdAt: new Date().toISOString(), actor: { name: 'Farm Owner' } }]
      return route.fulfill({ json: item })
    }
    if (path === '/inventory/items/inventory-1/transactions' && method === 'POST') {
      movementCalls += 1
      const body = request.postDataJSON()
      const item = inventory[0]
      const before = Number(item.quantityOnHand)
      const after = body.type === 'STOCK_IN' ? before + body.quantity : body.type === 'STOCK_OUT' ? before - body.quantity : body.quantity
      inventory = [{ ...item, quantityOnHand: after }]
      movements = [{ id: 'movement-2', type: body.type, quantity: body.quantity, quantityBefore: before, quantityAfter: after, createdAt: new Date().toISOString(), actor: { name: 'Farm Owner' } }, ...movements]
      return route.fulfill({ json: { item: { id: item.id, quantityOnHand: after, unit: item.unit }, transaction: movements[0] } })
    }
    if (path === '/inventory/items/inventory-1/transactions' && method === 'GET') return route.fulfill({ json: movements })

    if (path === '/finance/records' && method === 'GET') return route.fulfill({ json: finances })
    if (path === '/finance/records' && method === 'POST') {
      financeCreateCalls += 1
      const body = request.postDataJSON()
      const record = { id: 'finance-1', farmId: body.farmId, type: body.type, category: body.category, amount: body.amount, currency: body.currency || 'INR', occurredAt: body.occurredAt, reference: body.reference, notes: body.notes, farm: { id: farm.id, name: farm.name } }
      finances = [record, ...finances]
      return route.fulfill({ json: record })
    }

    if (path === '/notifications' && method === 'GET') {
      let result = [...notifications]
      const severity = url.searchParams.get('severity')
      const type = url.searchParams.get('type')
      const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
      const limit = Number(url.searchParams.get('limit') || 100)
      if (severity) result = result.filter(item => item.severity === severity)
      if (type) result = result.filter(item => item.type === type)
      if (unreadOnly) result = result.filter(item => !item.readAt)
      return route.fulfill({ json: result.slice(0, limit) })
    }
    if (path === '/notifications/unread-count') return route.fulfill({ json: { unreadCount: notifications.filter(item => !item.readAt).length } })
    if (path === '/notifications/read-all' && method === 'POST') {
      const readAt = new Date().toISOString()
      const markedRead = notifications.filter(item => !item.readAt).length
      notifications = notifications.map(item => ({ ...item, readAt: item.readAt || readAt }))
      return route.fulfill({ json: { markedRead } })
    }
    if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PATCH') {
      const id = path.split('/')[2]
      notifications = notifications.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)
      return route.fulfill({ json: notifications.find(item => item.id === id) })
    }
    return route.fulfill({ json: [] })
  })

  await page.goto('/app/inventory')
  await expect(page.getByRole('combobox', { name: 'Farm' })).toHaveValue('farm-1')
  await page.getByLabel('Item name').fill('Paddy seed')
  await page.getByLabel('Opening quantity').fill('10')
  await page.getByLabel('Reorder level').fill('2')
  await page.getByRole('button', { name: 'Save inventory item' }).click()
  await expect(page.getByText('Paddy seed', { exact: true })).toBeVisible()
  expect(inventoryCreateCalls).toBe(1)

  await page.getByLabel('Movement type for Paddy seed').selectOption('STOCK_IN')
  await page.getByLabel('Movement quantity for Paddy seed').fill('3')
  await page.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText('13 kg')).toBeVisible()
  expect(movementCalls).toBe(1)
  await page.getByRole('button', { name: 'View history' }).click()
  await expect(page.getByText('10 → 13')).toBeVisible()

  await page.goto('/app/finance')
  await expect(page.getByRole('heading', { name: 'Add income or expense' })).toBeVisible()
  await page.getByLabel('Finance type').selectOption('INCOME')
  await page.getByLabel('Finance category').fill('Tomato sale')
  await page.getByLabel('Finance amount').fill('1250')
  await page.getByRole('button', { name: 'Save record' }).click()
  await expect(page.getByText('Tomato sale')).toBeVisible()
  await expect(page.getByText('₹1,250.00').first()).toBeVisible()
  expect(financeCreateCalls).toBe(1)

  await page.goto('/app/notifications')
  await expect(page.getByText('Seed reorder alert')).toBeVisible()
  await page.getByLabel('Notification severity filter').selectOption('CRITICAL')
  await expect(page.getByText('No notifications match these filters')).toBeVisible()
  await page.getByLabel('Notification severity filter').selectOption('WARNING')
  await page.getByLabel('Unread notifications only').check()
  await expect(page.getByText('Seed reorder alert')).toBeVisible()
  await page.getByRole('button', { name: 'Mark all read (1)' }).click()
  await expect(page.getByRole('button', { name: 'Mark all read (0)' })).toBeDisabled()
  await expect(page.getByText('New')).toHaveCount(0)
  await expect(page.getByText('No notifications match these filters')).toBeVisible()

  await page.goto('/app/reports')
  await expect(page.getByText('Farm Reports')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Jinse Agro Farm' }).first()).toBeVisible()
  await expect(page.getByText('Farm operational summary')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
})
