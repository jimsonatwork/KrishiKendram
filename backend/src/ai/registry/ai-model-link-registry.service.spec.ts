import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ConflictException } from '@nestjs/common';
import { AiModelLinkRegistryService } from './ai-model-link-registry.service';

describe('AiModelLinkRegistryService', () => {
  let directory: string;
  let filePath: string;
  let service: AiModelLinkRegistryService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'kk-model-links-'));
    filePath = join(directory, 'model-link-registry.json');
    writeFileSync(filePath, readFileSync(resolve(process.cwd(), '../ai/providers/model-link-registry.json'), 'utf8'));
    const registry = { getLinkedFilePath: jest.fn(() => filePath), getRegistryId: jest.fn(() => 'KK-AI-REGISTRY-001') };
    service = new AiModelLinkRegistryService(registry as any);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  });

  it('uses the central registry active model without changing module contracts', () => {
    expect(service.getActiveModelId()).toBe('qwen3:1.7b');
  });

  it('links and unlinks a candidate without deleting its catalogue entry', () => {
    service.link('qwen3.5:0.8b');
    expect(JSON.parse(readFileSync(filePath, 'utf8')).models.find((model: any) => model.modelId === 'qwen3.5:0.8b').linked).toBe(true);
    service.unlink('qwen3.5:0.8b');
    const model = JSON.parse(readFileSync(filePath, 'utf8')).models.find((item: any) => item.modelId === 'qwen3.5:0.8b');
    expect(model.linked).toBe(false);
    expect(model.modelId).toBe('qwen3.5:0.8b');
  });

  it('blocks unlinking the active model and activation of an unlinked model', async () => {
    expect(() => service.unlink('qwen3:1.7b')).toThrow(ConflictException);
    await expect(service.activate('qwen3.5:0.8b')).rejects.toThrow(ConflictException);
    expect(service.getActiveModelId()).toBe('qwen3:1.7b');
  });

  it('activates only linked models installed in the local runtime', async () => {
    service.link('qwen3.5:0.8b');
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'qwen3.5:0.8b', digest: 'test' }] }), { status: 200 })) as any;
    const result = await service.activate('qwen3.5:0.8b');
    expect(result.activeModelId).toBe('qwen3.5:0.8b');
    expect(service.getActiveModelId()).toBe('qwen3.5:0.8b');
  });

  it('refuses activation when the local runtime is unavailable', async () => {
    service.link('qwen3.5:0.8b');
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(service.activate('qwen3.5:0.8b')).rejects.toThrow('Local Ollama is unavailable');
    expect(service.getActiveModelId()).toBe('qwen3:1.7b');
  });
});
