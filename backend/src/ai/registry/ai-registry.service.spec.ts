import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AiRegistryService } from './ai-registry.service';
import { cpSync, mkdtempSync, rmSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('AiRegistryService', () => {
  let service: AiRegistryService;

  beforeEach(() => {
    service = new AiRegistryService();
  });

  it('loads the canonical KK AI registry', () => {
    expect(service.getRegistryId()).toBe('KK-AI-REGISTRY-001');
    expect(service.isCanonical()).toBe(true);
  });

  it('exposes a linked AI control-plane inventory for God Mode', () => {
    const overview = service.getControlPlaneOverview() as {
      registryId: string;
      moduleContracts: Array<{ moduleId: string; manifestPath: string }>;
      inventories: { providers: { providers: Array<{ providerId: string }> } };
      safety: { directDatabaseWritesAllowed: boolean; secretValuesExposed: boolean };
    };

    expect(overview.registryId).toBe('KK-AI-REGISTRY-001');
    expect(overview.moduleContracts).toHaveLength(6);
    expect(overview.moduleContracts.some(
      (item) => item.moduleId === 'KK-AI-CONVERSATION-001',
    )).toBe(true);
    expect(overview.moduleContracts.every((item) => item.manifestPath.startsWith('../modules/'))).toBe(true);
    expect(overview.inventories.providers.providers[0].providerId).toBe('KK-AI-ASR-INDIC-CONFORMER');
    expect(overview.safety.directDatabaseWritesAllowed).toBe(false);
    expect(overview.safety.secretValuesExposed).toBe(false);
  });

  it('resolves owner-scoped livestock and marketplace intents from the central manifest', () => {
    expect(service.resolveDataContextIntent('show my livestock')).toMatchObject({
      intentId: 'KK-AI-CONTEXT-LIVESTOCK-001',
      moduleId: 'KK-LIVESTOCK-001',
      resolver: 'USER_OWNED_LIVESTOCK',
      fields: ['animal', 'species', 'breed', 'ownership'],
    });
    expect(service.resolveDataContextIntent('show my marketplace listings')).toMatchObject({
      intentId: 'KK-AI-CONTEXT-MARKETPLACE-001',
      moduleId: 'KK-MARKETPLACE-001',
      resolver: 'USER_OWNED_MARKETPLACE_LISTINGS',
      fields: ['listing', 'product', 'availability', 'quantity', 'price', 'seller', 'service', 'rental'],
    });
  });

  it('loads the canonical effective policy and keeps unsafe capabilities disabled', () => {
    expect(service.getEffectivePolicy()).toMatchObject({
      registryId: 'KK-AI-REGISTRY-001',
      inventoryId: 'KK-AI-POLICIES-001',
      authorizationBeforeContext: true,
      centralRegistryValidationRequired: true,
      explicitUserConfirmationRequired: true,
      directAiDatabaseWriteAllowed: false,
      rawConversationTrainingAllowed: false,
      cloudFallbackAllowedByDefault: false,
    });
  });

  it('accepts the actual canonical policy document format for governed updates', () => {
    const policy = service.getGovernedFile('policyIndex');
    expect(() =>
      service['validateGovernedDocument']('policyIndex', policy.value),
    ).not.toThrow();
  });

  it('provides revision tokens only for allowlisted AI JSON files', () => {
    const revision = service.getGovernedFileRevision('providerInventory');
    expect(revision.key).toBe('providerInventory');
    expect(revision.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(revision.byteLength).toBeGreaterThan(0);
    expect(() => service.getGovernedFileRevision('../../.env')).toThrow(NotFoundException);
  });

  it('rejects a stale AI configuration revision before writing', () => {
    expect(() => service.updateGovernedFile('providerInventory', { providers: [] }, 'a'.repeat(64))).toThrow(ConflictException);
    expect(service.getGovernedFileRevision('providerInventory').sha256).not.toBe('a'.repeat(64));
  });

  it('rejects an invalid inventory document without changing the source file', () => {
    const revision = service.getGovernedFileRevision('providerInventory');
    expect(() => service.updateGovernedFile('providerInventory', { providers: 'not-an-array' }, revision.sha256)).toThrow(BadRequestException);
    expect(service.getGovernedFileRevision('providerInventory').sha256).toBe(revision.sha256);
  });

  it('round-trips save and rollback using an isolated registry copy', () => {
    const root = mkdtempSync(join(tmpdir(), 'kk-ai-registry-test-'));
    try {
      cpSync(resolve(process.cwd(), '../ai'), join(root, 'ai'), { recursive: true });
      cpSync(resolve(process.cwd(), '../docs'), join(root, 'docs'), { recursive: true });
      cpSync(resolve(process.cwd(), 'scripts'), join(root, 'backend/scripts'), { recursive: true });
      const isolated = new AiRegistryService(join(root, 'ai/registry/ai-platform-registry.json'));
      const before = isolated.getGovernedFile('providerInventory');
      const value = before.value as { providers: Array<Record<string, unknown>> };
      value.providers.push({ providerId: 'KK-TEST-RECOVERY', displayName: 'Temporary test provider' });
      const saved = isolated.updateGovernedFile('providerInventory', value, before.sha256);
      expect(isolated.getGovernedFileRevision('providerInventory').sha256).toBe(saved.sha256);
      const rolledBack = isolated.restoreGovernedSnapshot('providerInventory', saved.snapshotId, saved.sha256);
      expect(isolated.getGovernedFileRevision('providerInventory').sha256).toBe(before.sha256);
      expect(rolledBack.snapshotId).not.toBe(saved.snapshotId);
      expect(isolated.listGovernedSnapshots('providerInventory').length).toBeGreaterThanOrEqual(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects snapshot path traversal before reading or writing', () => {
    const revision = service.getGovernedFileRevision('providerInventory');
    expect(() => service.restoreGovernedSnapshot('providerInventory', '../.env', revision.sha256)).toThrow(BadRequestException);
    expect(service.getGovernedFileRevision('providerInventory').sha256).toBe(revision.sha256);
  });

  it('rejects a symlinked governed AI configuration target', () => {
    const root = mkdtempSync(join(tmpdir(), 'kk-ai-registry-symlink-test-'));
    try {
      cpSync(resolve(process.cwd(), '../ai'), join(root, 'ai'), { recursive: true });
      cpSync(resolve(process.cwd(), '../docs'), join(root, 'docs'), { recursive: true });
      cpSync(resolve(process.cwd(), 'scripts'), join(root, 'backend/scripts'), { recursive: true });
      const registryPath = join(root, 'ai/registry/ai-platform-registry.json');
      const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as { linkedFiles: Record<string, string> };
      const target = resolve(join(root, 'ai/registry'), registry.linkedFiles.providerInventory);
      const outside = join(root, 'outside-provider-inventory.json');
      writeFileSync(outside, JSON.stringify({ providers: [] }));
      unlinkSync(target);
      symlinkSync(outside, target);
      const isolated = new AiRegistryService(registryPath);
      expect(() => isolated.getGovernedFileRevision('providerInventory')).toThrow(BadRequestException);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports static diagnostics without claiming runtime health', () => {
    const diagnostics = service.getHealthDiagnostics() as any;
    expect(diagnostics.probeMode).toBe('STATIC_FILE_AND_PATH_CHECK_ONLY');
    expect(diagnostics.executedProviderCode).toBe(false);
    expect(diagnostics.networkChecksPerformed).toBe(false);
    expect(diagnostics.secretValuesExposed).toBe(false);
    // The deterministic intent router is ready without an LLM; model-backed providers remain gated by runtime and approval evidence.
    expect(diagnostics.providers).toHaveLength(5);
    expect(diagnostics.providers.find((provider) => provider.providerId === 'KK-AI-INTENT-ROUTER-LOCAL')?.ready).toBe(true);
    expect(diagnostics.providers.find((provider) => provider.providerId === 'KK-AI-CLOUD-TEXT-CONNECTION-CANDIDATE')?.ready).toBe(false);
    expect(diagnostics.runtimes).toHaveLength(3);
    expect(diagnostics.providers.filter((provider) => provider.providerId !== 'KK-AI-INTENT-ROUTER-LOCAL').every((provider) => provider.ready === false)).toBe(true);
    expect(diagnostics.runtimes.every((runtime) => runtime.ready === false)).toBe(true);
  });

  it('recognizes the canonical conversation module', () => {
    expect(service.getConversationModuleId()).toBe('KK-AI-CONVERSATION-001');
  });

  it('accepts registered modules', () => {
    expect(() => service.assertModuleRegistered('KK-USER-001')).not.toThrow();

    expect(() => service.assertModuleRegistered('KK-FARM-001')).not.toThrow();
  });

  it('rejects unknown modules', () => {
    expect(() => service.assertModuleRegistered('KK-NOT-REGISTERED')).toThrow(
      NotFoundException,
    );
  });

  it('accepts an allowed capability', () => {
    expect(() =>
      service.assertCapabilityAllowed('KK-USER-001', 'CONVERSATION'),
    ).not.toThrow();
  });

  it('rejects an unknown capability', () => {
    expect(() =>
      service.assertCapabilityAllowed('KK-USER-001', 'NOT_A_REAL_CAPABILITY'),
    ).toThrow(BadRequestException);
  });

  it('rejects a capability not assigned to a module', () => {
    expect(() =>
      service.assertCapabilityAllowed('KK-USER-001', 'RECOMMENDATION'),
    ).toThrow(ForbiddenException);
  });

  it('accepts permitted context references', () => {
    expect(() =>
      service.assertContextAllowed({
        moduleId: 'KK-USER-001',
        capability: 'CONVERSATION',
        references: ['userId', 'screenId'],
        fields: ['identity'],
      }),
    ).not.toThrow();
  });

  it('blocks globally known references that are not allowed by the requesting module', () => {
    // farmId exists in the platform-wide conversation vocabulary, but not in the user contract.
    expect(() => service.assertContextAllowed({ moduleId: 'KK-USER-001', references: ['farmId'] }))
      .toThrow(ForbiddenException);
  });

  it('rejects forbidden context fields', () => {
    expect(() =>
      service.assertContextAllowed({
        moduleId: 'KK-USER-001',
        fields: ['passwordHash'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects fields outside the module contract', () => {
    expect(() =>
      service.assertContextAllowed({
        moduleId: 'KK-USER-001',
        fields: ['paymentCredentials'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('keeps canonical database writes forbidden', () => {
    expect(() => service.assertCanonicalWriteForbidden()).not.toThrow();

    expect(service.requiresRegistryValidation()).toBe(true);
    expect(service.requiresUserConfirmation()).toBe(true);
  });
});
