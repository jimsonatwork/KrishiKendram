import { BadRequestException } from '@nestjs/common';
import { IntakeTranslationService } from './intake-translation.service';

describe('IntakeTranslationService', () => {
  const textGeneration = { generate: jest.fn() };
  let service: IntakeTranslationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntakeTranslationService(textGeneration as any);
  });

  it('uses the governed text-generation path and always requires human confirmation', async () => {
    textGeneration.generate.mockResolvedValue({
      content: JSON.stringify({ translation: 'I planted paddy in 2 acres.', confidence: 0.93, reviewNotes: [] }),
      providerId: 'KK-AI-LLM-OLLAMA-LOCAL', modelId: 'qwen3:1.7b', modelVersion: 'digest',
      generatedAt: '2026-10-17T10:00:00.000Z',
    });
    const result = await service.translate('user-1', { sourceText: 'నేను 2 ఎకరాల్లో వరి నాటాను', sourceLanguage: 'te' });
    expect(textGeneration.generate).toHaveBeenCalledWith(expect.objectContaining({
      requestedBy: 'user-1', language: 'en-IN', task: 'CONVERSATION',
      content: expect.stringContaining('Telugu'), maxOutputTokens: 96,
    }));
    expect(result.englishTranslation).toBe('I planted paddy in 2 acres.');
    expect(result.belowConfidenceThreshold).toBe(false);
    expect(result.requiresUserConfirmation).toBe(true);
    expect(result.saved).toBe(false);
    expect(result.confidenceMethod).toBe('UNCALIBRATED_MODEL_ESTIMATE');
  });

  it('flags numeric drift and forces a low confidence review', async () => {
    textGeneration.generate.mockResolvedValue({
      content: JSON.stringify({ translation: 'I planted paddy in 3 acres.', confidence: 0.99, reviewNotes: [] }),
      providerId: 'local', modelId: 'qwen3:1.7b', modelVersion: 'digest', generatedAt: new Date().toISOString(),
    });
    const result = await service.translate('user-1', { sourceText: 'I planted paddy in 2 acres.', sourceLanguage: 'hi' });
    expect(result.numericMismatch).toBe(true);
    expect(result.confidence).toBe(0.5);
    expect(result.belowConfidenceThreshold).toBe(true);
    expect(result.reviewNotes[0]).toContain('digits or numeric values differ');
  });

  it('flags an acre-to-hectare mistranslation even when the model claims high confidence', async () => {
    textGeneration.generate.mockResolvedValue({
      content: JSON.stringify({ translation: 'I have 2 hectares of rice.', confidence: 0.99, reviewNotes: [] }),
      providerId: 'local', modelId: 'qwen3:1.7b', modelVersion: 'digest', generatedAt: new Date().toISOString(),
    });
    const result = await service.translate('user-1', { sourceText: 'నేను 2 ఎకరాల్లో వరి నాటాను', sourceLanguage: 'te' });
    expect(result.numericMismatch).toBe(false);
    expect(result.unitMismatch).toBe(true);
    expect(result.plantingActionMismatch).toBe(true);
    expect(result.confidence).toBe(0.5);
    expect(result.belowConfidenceThreshold).toBe(true);
    expect(result.reviewNotes.some((note) => note.includes('acre/hectare'))).toBe(true);
  });

  it('rejects unsupported languages without invoking a model', async () => {
    await expect(service.translate('user-1', { sourceText: 'hello', sourceLanguage: 'fr' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(textGeneration.generate).not.toHaveBeenCalled();
  });

  it('does not trust malformed confidence and still requires review', async () => {
    textGeneration.generate.mockResolvedValue({
      content: '{"translation":"I fed the cows.","confidence":"high"}',
      providerId: 'local', modelId: 'qwen3:1.7b', modelVersion: 'digest', generatedAt: new Date().toISOString(),
    });
    const result = await service.translate('user-1', { sourceText: 'ఆవులకు మేత వేశాను', sourceLanguage: 'te' });
    expect(result.confidence).toBeNull();
    expect(result.belowConfidenceThreshold).toBe(true);
    expect(result.requiresUserConfirmation).toBe(true);
  });
});
