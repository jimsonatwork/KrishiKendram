import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { OllamaTextGenerationProvider } from './ollama-text-generation.provider';
import type { TextGenerationRequest } from '../contracts/text-generation-provider';

describe('OllamaTextGenerationProvider', () => {
  let provider: OllamaTextGenerationProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.KK_AI_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
    process.env.KK_AI_OLLAMA_MODEL = 'qwen3:1.7b';
    process.env.KK_AI_OLLAMA_MODEL_VERSION = 'sha256:test-digest';
    delete process.env.KK_AI_OLLAMA_TIMEOUT_MS;
    provider = new OllamaTextGenerationProvider();
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy?.mockRestore();
    delete process.env.KK_AI_OLLAMA_BASE_URL;
    delete process.env.KK_AI_OLLAMA_MODEL;
    delete process.env.KK_AI_OLLAMA_MODEL_VERSION;
    delete process.env.KK_AI_OLLAMA_TIMEOUT_MS;
  });

  const request = (overrides: Partial<TextGenerationRequest> = {}): TextGenerationRequest => ({
    content: 'Help me record my farm name.',
    conversationId: 'conversation-1',
    requestedBy: 'user-private-id',
    language: 'en-IN',
    ...overrides,
  });
  const jsonResponse = (payload: unknown, ok = true) => ({
    ok,
    json: async () => payload,
  }) as unknown as Response;

  it('generates a bounded local response with required provenance and confirmation flags', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3:1.7b', digest: 'sha256:observed-model-digest' }] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({ message: { role: 'assistant', content: 'What is your farm name?' } }));
    const result = await provider.generate(request());
    expect(fetchSpy).toHaveBeenCalledWith('http://127.0.0.1:11434/api/chat', expect.objectContaining({
      method: 'POST', signal: expect.any(AbortSignal),
    }));
    const body = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    expect(body.think).toBe(false);
    expect(body.keep_alive).toBe('5m');
    expect(result).toMatchObject({
      content: 'What is your farm name?', providerId: 'KK-AI-LLM-OLLAMA-LOCAL',
      modelId: 'qwen3:1.7b', modelVersion: 'sha256:observed-model-digest', mode: 'LOCAL',
      language: 'en-IN', requiresValidation: true, requiresUserConfirmation: true,
    });
  });

  it('uses the bounded 120-second default deadline for local CPU cold starts', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(new AbortController().signal);
    try {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3:1.7b', digest: 'sha256:test-digest' }] }));
      fetchSpy.mockResolvedValueOnce(jsonResponse({ message: { role: 'assistant', content: 'Ready.' } }));
      await provider.generate(request());
      expect(timeoutSpy).toHaveBeenCalledWith(120000);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it('uses only user/assistant messages from authorized context and does not send actor IDs', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3:1.7b', digest: 'sha256:test-digest' }] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({ message: { content: 'Understood.' } }));
    await provider.generate(request({
      context: {
        policy: { registryId: 'KK-AI-REGISTRY-001', authorizationBeforeContext: true, databaseWriteAllowed: false, userConfirmationRequired: true },
        actor: { userId: 'secret-user-id' },
        module: { moduleId: 'KK-AI-CONVERSATION-001', capability: 'CONVERSATION' },
        references: { userId: 'secret-user-id', moduleId: 'KK-AI-CONVERSATION-001' },
        fields: { messages: [{ role: 'USER', content: 'My farm is Green Acres.' }] },
      },
    }));
    const body = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    expect(body.messages).toHaveLength(3);
    expect(body.messages[1]).toEqual({ role: 'user', content: 'My farm is Green Acres.' });
    expect(body.messages[2]).toEqual({ role: 'user', content: 'Help me record my farm name.' });
    expect(JSON.stringify(body)).not.toContain('secret-user-id');
    expect(JSON.stringify(body)).toContain('My farm is Green Acres.');
  });

  it('rejects empty and oversized requests before calling the runtime', async () => {
    await expect(provider.generate(request({ content: '  ' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(provider.generate(request({ content: 'x'.repeat(6001) }))).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed when runtime is unavailable without attempting cloud fallback', async () => {
    fetchSpy.mockRejectedValue(new Error('connection refused'));
    await expect(provider.generate(request())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('127.0.0.1');
  });

  it('fails closed when the runtime is reachable but the configured model is not installed', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ models: [] }));
    await expect(provider.generate(request())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/tags');
  });

  it('rejects non-success and malformed/empty model responses', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3:1.7b', digest: 'sha256:test-digest' }] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, false));
    await expect(provider.generate(request())).rejects.toBeInstanceOf(ServiceUnavailableException);
    fetchSpy.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3:1.7b', digest: 'sha256:test-digest' }] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({ message: { content: '' } }));
    await expect(provider.generate(request())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reports runtime reachability and exact installed model digest', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ models: [{ name: 'qwen3:1.7b', digest: 'sha256:verified-model-digest' }] }));
    await expect(provider.checkHealth()).resolves.toMatchObject({
      reachable: true, modelInstalled: true, modelId: 'qwen3:1.7b',
      modelVersion: 'sha256:verified-model-digest', mode: 'LOCAL',
    });
  });

  it('does not permit arbitrary remote/cloud endpoints', () => {
    process.env.KK_AI_OLLAMA_BASE_URL = 'https://example.com';
    expect(() => new OllamaTextGenerationProvider()).toThrow(/cloud endpoints are prohibited/);
  });
});
