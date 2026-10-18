import { expect, test } from '@playwright/test'

test('local translation shows drift warnings and never auto-confirms Intake', async ({ page }) => {
  let translationCalls = 0
  let intakeSaveCalls = 0
  const teluguStatement = '\u0c28\u0c47\u0c28\u0c41\u0020\u0032\u0020\u0c0e\u0c15\u0c30\u0c3e\u0c32\u0c4d\u0c32\u0c4b\u0020\u0c35\u0c30\u0c3f\u0020\u0c28\u0c3e\u0c1f\u0c3e\u0c28\u0c41'

  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'translation-e2e-token')
    localStorage.removeItem('refreshToken')
  })

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace('/api/v1', '')

    if (pathname === '/auth/me') {
      await route.fulfill({ json: { id: 'farmer-translation-test', name: 'Test Farmer', role: 'FARMER', status: 'ACTIVE' } })
      return
    }
    if (pathname === '/farms/my') {
      await route.fulfill({ json: [{ id: 'farm-translation-test', name: 'Test Paddy Farm', location: 'Telangana' }] })
      return
    }
    if (pathname === '/intake/translate' && request.method() === 'POST') {
      translationCalls += 1
      const body = request.postDataJSON() as Record<string, unknown>
      expect(body.sourceLanguage).toBe('te')
      expect(String(body.sourceText)).toContain('\u0c0e\u0c15\u0c30')
      await route.fulfill({ json: {
        sourceText: String(body.sourceText),
        sourceLanguage: 'te',
        englishTranslation: 'I have 2 acres of rice',
        confidence: 0.5,
        confidenceThreshold: 0.85,
        confidenceMethod: 'UNCALIBRATED_MODEL_ESTIMATE',
        belowConfidenceThreshold: true,
        numericMismatch: false,
        unitMismatch: false,
        plantingActionMismatch: true,
        reviewNotes: ['The English meaning may have lost the planting/sowing action.'],
        providerId: 'KK-AI-LLM-OLLAMA-LOCAL',
        modelId: 'qwen3:1.7b',
        modelVersion: 'test-digest',
        generatedAt: '2026-10-17T12:00:00.000Z',
        requiresUserReview: true,
        requiresUserConfirmation: true,
        saved: false,
      } })
      return
    }
    if (pathname === '/intake' && request.method() === 'POST') {
      intakeSaveCalls += 1
      await route.fulfill({ json: { id: 'record-test-1', category: 'PLANTING' } })
      return
    }
    if (pathname === '/auth/refresh') {
      await route.fulfill({ status: 401, json: { message: 'No refresh token in test fixture.' } })
      return
    }
    await route.fulfill({ json: [] })
  })

  await page.goto('/app/intake')
  await expect(page.getByText(/Language analysis: automatic/)).toBeVisible()
  await page.getByLabel('What happened?').fill(teluguStatement)

  const processButton = page.getByRole('button', { name: 'Process intake' })
  await expect(processButton).toBeDisabled()
  await page.getByRole('button', { name: 'Translate with local AI' }).click()

  const englishMeaning = page.getByLabel('English meaning (review or correct)')
  await expect(englishMeaning).toHaveValue('I have 2 acres of rice')
  await expect(page.getByText(/Below the 85% review threshold/)).toBeVisible()
  await expect(page.getByText('The English meaning may have lost the planting/sowing action. Correct the meaning before continuing.')).toBeVisible()
  await expect(page.getByText(/AI confidence estimate: 50%/)).toBeVisible()
  const confirmation = page.getByRole('checkbox', { name: /I reviewed the English meaning/ })
  await expect(confirmation).not.toBeChecked()
  await expect(processButton).toBeDisabled()
  expect(translationCalls).toBe(1)
  expect(intakeSaveCalls).toBe(0)

  await englishMeaning.fill('I planted paddy in 2 acres')
  await expect(confirmation).not.toBeChecked()
  await confirmation.check()
  await expect(processButton).toBeEnabled()
  expect(intakeSaveCalls).toBe(0)
})
