import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const apiPrefix = '**/api/v1/**'
const cropTerminology = {
  resourceId: 'KK-AI-CROP-TERMINOLOGY-001',
  version: 1,
  ownerModule: 'KK-CROP-001',
  plantingVerbs: ['planted', 'planting', 'sowed', 'sowing', 'sown', 'transplanted', 'transplanting', 'cultivated', 'cultivating'],
  imperativeCropAction: 'plant',
  crops: [
    { name: 'Mango', aliases: ['mango', 'mangoes'] },
    { name: 'Rice', aliases: ['rice'] },
    { name: 'Maize', aliases: ['maize', 'corn'] },
    { name: 'Cotton', aliases: ['cotton'] },
  ],
  areaUnits: ['acre', 'acres', 'hectare', 'hectares', 'ha'],
  numberWords: { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 },
}

type FarmFixture = { id: string; name: string; location?: string }

async function setupVoiceAgent(page: Page, farms: FarmFixture[] = [{ id: 'farm-1', name: 'Green Valley', location: 'Hyderabad' }]) {
  const intakeCalls: Array<{ body: Record<string, unknown> }> = []
  const messageCalls: Array<{ body: Record<string, unknown> }> = []

  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'playwright-test-token')
    localStorage.removeItem('refreshToken')
    class FakeRecognition {
      lang = 'en-IN'
      continuous = false
      interimResults = true
      onresult: ((event: unknown) => void) | null = null
      onerror: ((event: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        ;(window as Window & { __kkFakeRecognition?: FakeRecognition }).__kkFakeRecognition = this
      }
      stop() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeRecognition })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel() {}, speak() {}, get speaking() { return false } },
    })
  })

  // Default safe response for nonessential dashboard data requests.
  await page.route(apiPrefix, async route => {
    const url = new URL(route.request().url())
    const pathname = url.pathname.replace('/api/v1', '')
    if (pathname === '/auth/me') {
      await route.fulfill({ json: { id: 'farmer-test-1', name: 'Test Farmer', role: 'FARMER', status: 'ACTIVE' } })
      return
    }
    if (pathname === '/ai/conversations/voice-intents') {
      await route.fulfill({ json: {
        registryId: 'KK-AI-REGISTRY-001',
        manifestId: 'KK-AI-VOICE-INTENTS-001',
        manifestVersion: 1,
        navigationPrefixes: [],
        authorizationSource: 'TEST_FIXTURE',
        cropTerminology,
        privilegedIntentsAvailable: false,
        restrictedIntents: [],
        intents: [],
      } })
      return
    }
    if (pathname === '/ai/conversations/status') {
      await route.fulfill({ json: {
        enabled: true, ready: true, canGenerate: true, productionReady: false, evaluationOnly: true,
        providerId: 'KK-AI-LLM-OLLAMA-LOCAL', modelId: 'qwen3:1.7b', modelVersion: 'test',
        status: 'EVALUATION_IN_PROGRESS', mode: 'LOCAL', cloudFallback: false, databaseWriteAllowed: false,
        runtime: { reachable: true, modelInstalled: true },
      } })
      return
    }
    if (pathname === '/farms/my') {
      await route.fulfill({ json: farms })
      return
    }
    if (route.request().method() === 'POST' && pathname === '/ai/conversations') {
      await route.fulfill({ json: { id: 'conversation-test-1' } })
      return
    }
    if (route.request().method() === 'POST' && pathname === '/ai/conversations/conversation-test-1/messages') {
      messageCalls.push({ body: route.request().postDataJSON() as Record<string, unknown> })
      await route.fulfill({ json: { id: 'message-' + messageCalls.length } })
      return
    }
    if (route.request().method() === 'POST' && pathname === '/intake') {
      intakeCalls.push({ body: route.request().postDataJSON() as Record<string, unknown> })
      await route.fulfill({ json: {
        id: 'farm-record-test-1',
        category: 'PLANTING',
        createdCrop: { id: 'crop-test-1', name: 'Mango' },
      } })
      return
    }
    if (pathname === '/auth/refresh') {
      await route.fulfill({ status: 401, json: { message: 'No refresh token in test fixture.' } })
      return
    }
    await route.fulfill({ json: [] })
  })

  await page.goto('/app/farms')
  await expect(page.getByRole('button', { name: 'Open voice assistant' })).toBeVisible()
  await page.getByRole('button', { name: 'Open voice assistant' }).click()
  await expect(page.getByRole('region', { name: 'KrishiKendram voice assistant' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Spoken language' })).toBeVisible()
  return { intakeCalls, messageCalls }
}

async function typeCommand(page: Page, content: string) {
  await page.getByRole('textbox', { name: 'Type a voice command' }).fill(content)
  await page.getByRole('button', { name: 'Go' }).click()
}

test('Speak starts recognition immediately and a spoken planting request is previewed before saving', async ({ page }) => {
  const { intakeCalls, messageCalls } = await setupVoiceAgent(page)
  await page.getByRole('button', { name: 'Speak' }).click()
  await expect(page.getByText('Listening… speak naturally.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __kkFakeRecognition?: unknown }).__kkFakeRecognition))).toBe(true)

  await page.evaluate(() => {
    const recognition = (window as Window & { __kkFakeRecognition?: { onresult?: (event: unknown) => void } }).__kkFakeRecognition
    recognition?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'I have planted mango plants across one acre of my farm' } }],
    })
  })

  await expect(page.getByText(/Planting draft — nothing has been saved yet\./).last()).toBeVisible()
  await expect(page.getByText(/Farm: Green Valley/).last()).toBeVisible()
  await expect(page.getByText(/Crop: Mango/).last()).toBeVisible()
  await expect(page.getByText(/Area: 1 acre/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(0)

  await typeCommand(page, 'confirm')
  await expect(page.getByText(/Saved\. The Mango crop record was created/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(1)
  expect(intakeCalls[0].body).toMatchObject({
    farmId: 'farm-1',
    inputMethod: 'VOICE',
    content: 'I have planted mango plants across one acre of my farm',
  })
  expect(messageCalls.some(item => item.body.source === 'VOICE')).toBe(true)
})

test('crop/area corrections update the preview and cancellation never submits a mutation', async ({ page }) => {
  const { intakeCalls } = await setupVoiceAgent(page)
  await typeCommand(page, 'I have planted mango plants across one acre of my farm')
  await expect(page.getByText(/Area: 1 acre/).last()).toBeVisible()

  await typeCommand(page, 'change area to two acres')
  await expect(page.getByText(/Area: 2 acres/).last()).toBeVisible()
  await typeCommand(page, 'change crop to rice')
  await expect(page.getByText(/Crop: Rice/).last()).toBeVisible()
  await typeCommand(page, 'cancel')
  await expect(page.getByText(/Planting draft discarded\. No crop or farm record was changed\./).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(0)
})

test('multiple farms require an explicit farm selection before preview and confirmation', async ({ page }) => {
  const { intakeCalls } = await setupVoiceAgent(page, [
    { id: 'farm-1', name: 'Green Valley' },
    { id: 'farm-2', name: 'River Field' },
  ])
  await typeCommand(page, 'I have planted mango plants across one acre')
  await expect(page.getByLabel('Live conversation subtitles').getByText(/Which farm should I use/)).toBeVisible()
  expect(intakeCalls).toHaveLength(0)

  await typeCommand(page, 'River Field')
  await expect(page.getByText(/Farm: River Field/).last()).toBeVisible()
  await typeCommand(page, 'confirm')
  await expect(page.getByText(/Saved\. The Mango crop record was created for River Field/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(1)
  expect(intakeCalls[0].body.farmId).toBe('farm-2')
})

test('the voice panel has no serious or critical automated accessibility violations', async ({ page }) => {
  await setupVoiceAgent(page)
  const results = await new AxeBuilder({ page })
    .include('section[aria-label="KrishiKendram voice assistant"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious')).toEqual([])
})


test('an ambiguous save response never claims that a crop record was created', async ({ page }) => {
  await setupVoiceAgent(page)
  let attempts = 0
  await page.route('**/api/v1/intake', async route => {
    attempts += 1
    await route.fulfill({ json: { id: 'farm-record-only', category: 'PLANTING' } })
  })
  await typeCommand(page, 'I have planted mango plants across one acre of my farm')
  await expect(page.getByText(/Planting draft — nothing has been saved yet\./).last()).toBeVisible()
  await typeCommand(page, 'confirm')
  await expect(page.getByText(/did not confirm a created crop record ID/).last()).toBeVisible()
  expect(attempts).toBe(1)
})

test('an uncertain network outcome is not automatically retried', async ({ page }) => {
  await setupVoiceAgent(page)
  let attempts = 0
  await page.route('**/api/v1/intake', async route => {
    attempts += 1
    await route.abort('failed')
  })
  await typeCommand(page, 'I have planted mango plants across one acre of my farm')
  await expect(page.getByText(/Planting draft — nothing has been saved yet\./).last()).toBeVisible()
  await typeCommand(page, 'confirm')
  await expect(page.getByText(/could not verify the save result/i).last()).toBeVisible()
  expect(attempts).toBe(1)
})
