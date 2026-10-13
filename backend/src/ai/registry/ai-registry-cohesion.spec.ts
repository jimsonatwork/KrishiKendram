import { resolve } from 'node:path';
import { AiRegistryService } from './ai-registry.service';

describe('AiRegistryService canonical cohesion manifests', () => {
  const registryPath = resolve(__dirname, '../../../../ai/registry/ai-platform-registry.json');
  let registry: AiRegistryService;

  beforeEach(() => {
    registry = new AiRegistryService(registryPath);
  });

  it('loads every voice intent from the canonical linked manifest and validates module ownership', () => {
    const intents = registry.getVoiceIntentDefinitions();
    expect(intents.length).toBeGreaterThan(10);
    expect(intents.map((intent) => intent.intentId)).toContain('NAV-FARMS');
    expect(intents.find((intent) => intent.intentId === 'NAV-FARMS')).toMatchObject({
      path: '/app/farms',
      moduleId: 'KK-FARM-001',
      access: 'AUTHENTICATED',
    });
    expect(intents.filter((intent) => intent.access === 'SYSTEM_GOD').length).toBeGreaterThan(0);
    expect(registry.getVoiceNavigationPrefixes()).toContain('open ');
  });

  it('keeps the cloud connection policy visible but disabled and fail-closed', () => {
    const policy = registry.getCloudConnectionPolicy();
    expect(policy).toMatchObject({
      inventoryId: 'KK-AI-CLOUD-CONNECTION-POLICY-001',
      enabled: false,
      mode: 'EXPLICIT_APPROVED_PRIMARY_ONLY',
    });
    expect((policy.policy as Record<string, unknown>).cloudFallbackAllowed).toBe(false);

    const validator = registry as unknown as {
      validateGovernedDocument: (key: string, value: unknown) => void;
    };
    expect(() => validator.validateGovernedDocument('cloudConnectionPolicy', {
      ...policy,
      enabled: true,
    })).toThrow('Cloud connection policy is invalid or attempts to enable an unverified cloud provider.');
  });
});
