# AI Intake — multilingual transcript and confirmation contract

Updated: 2026-10-16 22:27:40 IST

## Current implemented behavior

- frontend/src/pages/intake/AIIntakePage.tsx supports browser speech recognition for English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati and Punjabi where the browser exposes the selected locale.
- Speech recognition is transcription, not translation. For a non-English transcript, the user must review/enter the English meaning and explicitly confirm it before submit enables. The UI must never label a transcript as automatically translated.
- CreateIntakeDto validates optional originalContent, originalLanguage, englishTranslation and translationConfirmed fields while remaining compatible with older English-only callers.
- IntakeService repeats the confirmation check server-side before extraction. For non-English input, missing English meaning or false/missing confirmation raises BadRequestException; the extractor receives only the confirmed English meaning.
- Existing FarmRecord.data JSON retains the extractor output and adds intakeMetadata: original transcript, ISO-639-1 language code, English meaning, translation status, input method and capture timestamp. This uses the existing JSON field, so no schema migration is required and canonical Crop/FarmRecord write ownership is unchanged.
- Authorization still precedes extraction. AI interpretation remains separate from authorized business-service mutations, and Crop plus FarmRecord creation remains in the existing transaction.

## Safety and product rules

1. Never discard or silently replace the original transcript.
2. Never infer that browser speech recognition translated the utterance.
3. Preserve names, quantities, units, dates and negation across translation; ask a focused follow-up and stop the write if material meaning is uncertain.
4. A client checkbox is not trusted: backend validation is mandatory.
5. A user correction resets confirmation.
6. Keep the local provider evaluation-only until task/language quality, latency, concurrency, privacy, recovery and human acceptance gates pass. No cloud fallback.
7. Never allow a model to write directly to the database. Use the canonical module API/service, authorization, registry validation, audit and explicit confirmation.

## Verification checkpoint — 2026-10-16

- Frontend TypeScript/Vite production build: PASS.
- Focused Intake/Livestock/Marketplace backend suites: 3 suites, 33 tests PASS (Intake 11 tests; existing Livestock and Marketplace suites included).
- git diff --check: PASS.
- /api/v1/health: HTTP 200; frontend port 4000: HTTP 200.
- Automatic translation is NOT implemented by this UI patch. A replaceable, approved translation provider (for example locally hosted IndicTrans2), confidence/deviation handling and real browser/database acceptance remain open. Do not call this workflow fully complete until those gates pass.


## Local translation endpoint and confidence gate - 2026-10-17T17:37:15+05:30

- Authenticated POST /api/v1/intake/translate uses the existing registry-authorized TextGenerationService; no cloud provider or record write is used.
- Confidence is an explicitly uncalibrated model estimate with a 0.85 review threshold. Missing or low confidence is warned; user confirmation is always required.
- Deterministic checks compare visible numeric tokens, acre/hectare units, and preservation of planting/sowing action verbs. Any detected drift caps confidence at 0.5 and adds a review warning. These checks are conservative, not proof of correctness.
- The UI preserves the original transcript, shows confidence/review notes and drift warnings, never auto-confirms, and allows manual correction.
- Verification: 3 focused suites / 19 tests pass; backend build and frontend production build pass; mocked Intake translation browser E2E passes 1/1. Route is registered and unauthenticated request returns 401. Authenticated live-backend browser acceptance remains open.
- Synthetic Telugu smoke returned the English meaning 'I have 2 acres of rice' for a statement meaning 'I planted paddy in 2 acres'. The planting-action check flagged it and reduced confidence to 0.5. Local-model output is not production-quality; human review remains mandatory.
- A warm smoke took about 15 seconds; a later smoke took about 87 seconds during startup/model contention. Cold/warm latency and language-quality benchmarking remain open. Model stays evaluation-only and cloud fallback remains disabled.
