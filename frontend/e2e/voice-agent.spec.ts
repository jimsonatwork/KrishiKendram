import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const apiPrefix = '**/api/v1/**'
const cropTerminology = {
  resourceId: 'KK-AI-CROP-TERMINOLOGY-001',
  version: 1,
  ownerModule: 'KK-CROP-001',
  plantingVerbs: ['planted', 'planting', 'sowed', 'sowing', 'sown', 'transplanted', 'transplanting', 'cultivated', 'cultivating'],
  cropRegistrationVerbs: ['register', 'record', 'add'],
  imperativeCropAction: 'plant',
  crops: [
    { name: 'Mango', aliases: ['mango', 'mangoes'] },
    { name: 'Paddy', aliases: ['paddy', 'paddy rice'] },
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
  const responseCalls: Array<{ body: Record<string, unknown> }> = []

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
        const testWindow = window as Window & { __kkFakeRecognition?: FakeRecognition; __kkFakeRecognitionStartCount?: number }
        testWindow.__kkFakeRecognition = this
        testWindow.__kkFakeRecognitionStartCount = (testWindow.__kkFakeRecognitionStartCount ?? 0) + 1
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
    if (route.request().method() === 'POST' && pathname === '/ai/conversations/conversation-test-1/respond') {
      responseCalls.push({ body: route.request().postDataJSON() as Record<string, unknown> })
      await route.fulfill({ json: {
        message: { id: 'assistant-response-' + responseCalls.length, content: 'Recording sowing dates helps you track crop age, plan irrigation and estimate harvest timing.' },
        requiresValidation: true,
        requiresUserConfirmation: true,
      } })
      return
    }
    if (route.request().method() === 'POST' && pathname === '/intake') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      intakeCalls.push({ body })
      await route.fulfill({ json: {
        id: 'farm-record-test-1',
        category: 'PLANTING',
        createdCrop: { id: 'crop-test-1', name: /paddy/i.test(String(body.content ?? '')) ? 'Paddy' : 'Mango' },
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
  return { intakeCalls, messageCalls, responseCalls }
}

async function typeCommand(page: Page, content: string) {
  await page.getByRole('textbox', { name: 'Type a voice command' }).fill(content)
  await page.getByRole('button', { name: 'Go' }).click()
}

test('opening Voice Agent starts recognition and keeps the planting conversation in one guided draft', async ({ page }) => {
  const { intakeCalls, messageCalls } = await setupVoiceAgent(page)
  await expect(page.getByText(/Listening… speak naturally/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop listening' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __kkFakeRecognition?: unknown }).__kkFakeRecognition))).toBe(true)

  await page.evaluate(() => {
    const recognition = (window as Window & { __kkFakeRecognition?: { onresult?: (event: unknown) => void } }).__kkFakeRecognition
    recognition?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'I have planted mango plants across one acre of my farm' } }],
    })
  })

  await expect(page.getByText(/When was this crop sown/).last()).toBeVisible()
  await expect(page.getByText(/You · \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)).toBeVisible()
  expect(intakeCalls).toHaveLength(0)
  await typeCommand(page, 'today')
  await expect(page.getByText(/Planting draft — nothing has been saved yet\./).last()).toBeVisible()
  await expect(page.getByText(/Farm: Green Valley/).last()).toBeVisible()
  await expect(page.getByText(/Crop: Mango/).last()).toBeVisible()
  await expect(page.getByText(/Area: 1 acre/).last()).toBeVisible()
  await expect(page.getByText(/Planting date: today/).last()).toBeVisible()

  await typeCommand(page, 'confirm')
  await expect(page.getByText(/Saved\. The Mango crop record was created/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(1)
  expect(intakeCalls[0].body).toMatchObject({ farmId: 'farm-1', inputMethod: 'VOICE' })
  expect(intakeCalls[0].body.content).toContain('I have planted mango plants across one acre of my farm')
  expect(intakeCalls[0].body.content).toContain('Sown today')
  expect(messageCalls.some(item => item.body.source === 'VOICE')).toBe(true)
})

test('missing planting details are asked one at a time and new answers merge into the existing draft', async ({ page }) => {
  const { intakeCalls } = await setupVoiceAgent(page)
  await typeCommand(page, 'Register a paddy crop')
  await expect(page.getByText(/How much land is planted with this crop/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(0)

  await typeCommand(page, 'two acres and sown five weeks ago using NPK fertilizer')
  await expect(page.getByText(/Crop: Paddy/).last()).toBeVisible()
  await expect(page.getByText(/Area: 2 acres/).last()).toBeVisible()
  await expect(page.getByText(/approximately 5 weeks ago/).last()).toBeVisible()
  await expect(page.getByText(/Fertilizer: NPK/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(0)

  await typeCommand(page, 'confirm')
  await expect(page.getByText(/Saved\. The Paddy crop record was created/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(1)
  expect(intakeCalls[0].body.content).toContain('2 acres')
  expect(intakeCalls[0].body.content).toContain('5 weeks ago')
  expect(intakeCalls[0].body.content).toContain('NPK')
})

test('crop/area corrections update the preview and cancellation never submits a mutation', async ({ page }) => {
  const { intakeCalls } = await setupVoiceAgent(page)
  await typeCommand(page, 'I have planted mango plants across one acre of my farm')
  await expect(page.getByText(/When was this crop sown/).last()).toBeVisible()
  await typeCommand(page, 'today')
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
  await expect(page.getByText(/When was this crop sown/).last()).toBeVisible()
  await typeCommand(page, 'today')
  await expect(page.getByText(/Farm: River Field/).last()).toBeVisible()
  await typeCommand(page, 'confirm')
  await expect(page.getByText(/Saved\. The Mango crop record was created for River Field/).last()).toBeVisible()
  expect(intakeCalls).toHaveLength(1)
  expect(intakeCalls[0].body.farmId).toBe('farm-2')
})

test('the voice panel has no serious or critical automated accessibility violations', async ({ page }) => {
  test.setTimeout(60_000)
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
  await expect(page.getByText(/When was this crop sown/).last()).toBeVisible()
  await typeCommand(page, 'today')
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
  await expect(page.getByText(/When was this crop sown/).last()).toBeVisible()
  await typeCommand(page, 'today')
  await expect(page.getByText(/Planting draft — nothing has been saved yet\./).last()).toBeVisible()
  await typeCommand(page, 'confirm')
  await expect(page.getByText(/could not verify the save result/i).last()).toBeVisible()
  expect(attempts).toBe(1)
})


test('typed general questions reach the conversation response API and render the returned local answer', async ({ page }) => {
  const { intakeCalls, responseCalls } = await setupVoiceAgent(page)
  await typeCommand(page, 'Why should I record sowing dates?')
  await expect(page.getByText(/Recording sowing dates helps you track crop age/).last()).toBeVisible()
  expect(responseCalls).toHaveLength(1)
  expect(responseCalls[0].body).toMatchObject({ content: 'Why should I record sowing dates?', language: 'en-IN' })
  expect(intakeCalls).toHaveLength(0)
})

test('voice session automatically listens again after Krishi finishes speaking', async ({ page }) => {
  const { responseCalls } = await setupVoiceAgent(page)
  await page.evaluate(() => {
    const synthesis = window.speechSynthesis as SpeechSynthesis & { speak: (utterance: SpeechSynthesisUtterance) => void }
    synthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      window.setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0)
    }
  })
  const startsBefore = await page.evaluate(() => (window as Window & { __kkFakeRecognitionStartCount?: number }).__kkFakeRecognitionStartCount ?? 0)
  await typeCommand(page, 'Why should I record sowing dates?')
  await expect(page.getByText(/Recording sowing dates helps you track crop age/).last()).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as Window & { __kkFakeRecognitionStartCount?: number }).__kkFakeRecognitionStartCount ?? 0)).toBeGreaterThan(startsBefore)
  expect(responseCalls).toHaveLength(1)
})

test('provider status clearly marks the local model as evaluation-only rather than production-approved', async ({ page }) => {
  await setupVoiceAgent(page)
  await expect(page.getByText('Local evaluation only - not production approved')).toBeVisible()
  await expect(page.getByText(/qwen3:1\.7b/)).toBeVisible()
})
