import { AuthorityTier, UserRole } from '@prisma/client';
import { GodModeController } from './god-mode.controller';

describe('GodModeController governed AI configuration audit recovery', () => {
  const request = { user: { userId: 'god-user' } } as any;
  const result = { key: 'providerInventory', sha256: 'b'.repeat(64), byteLength: 42, snapshotFile: '/repo/.cto-backup/ai-registry-snapshots/pre-change.json', snapshotId: 'pre-change-providerInventory-a1b2c3.json' };
  let controller: GodModeController;
  let audit: { create: jest.Mock };
  let aiRegistry: { updateGovernedFile: jest.Mock; restoreGovernedSnapshot: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    audit = { create: jest.fn().mockResolvedValue({ id: 'audit-event' }) };
    aiRegistry = { updateGovernedFile: jest.fn().mockReturnValue(result), restoreGovernedSnapshot: jest.fn().mockReturnValue({ ...result, sha256: 'c'.repeat(64) }) };
    prisma = { user: { findUnique: jest.fn().mockResolvedValue({ email: 'jimson@jimson.jimson', role: UserRole.SUPER_ADMIN, authorityTier: AuthorityTier.SYSTEM_GOD }) } };
    controller = new GodModeController({} as any, {} as any, prisma as any, {} as any, audit as any, {} as any, {} as any, {} as any, aiRegistry as any);
  });

  it('records the completion audit and returns the audited update', async () => {
    const response = await controller.updateAiConfiguration(request, 'providerInventory', { value: { providers: [] }, expectedSha256: 'a'.repeat(64), reason: 'Approved provider inventory change' });
    expect(audit.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: 'GOD_MODE_AI_CONFIGURATION_CHANGE_REQUESTED' }));
    expect(audit.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ action: 'GOD_MODE_AI_CONFIGURATION_UPDATED' }));
    expect(response).toEqual({ ...result, audited: true });
    expect(aiRegistry.restoreGovernedSnapshot).not.toHaveBeenCalled();
  });

  it('restores the exact trusted pre-change snapshot when completion audit fails', async () => {
    const auditError = new Error('audit store unavailable');
    audit.create.mockResolvedValueOnce({ id: 'request-audit' }).mockRejectedValueOnce(auditError);
    await expect(controller.updateAiConfiguration(request, 'providerInventory', { value: { providers: [] }, expectedSha256: 'a'.repeat(64), reason: 'Approved provider inventory change' })).rejects.toBe(auditError);
    expect(aiRegistry.restoreGovernedSnapshot).toHaveBeenCalledTimes(1);
    expect(aiRegistry.restoreGovernedSnapshot).toHaveBeenCalledWith('providerInventory', result.snapshotId, result.sha256);
  });

  it('surfaces an explicit recovery failure if audit and automatic restoration both fail', async () => {
    audit.create.mockResolvedValueOnce({ id: 'request-audit' }).mockRejectedValueOnce(new Error('audit store unavailable'));
    aiRegistry.restoreGovernedSnapshot.mockImplementation(() => { throw new Error('restore failed'); });
    await expect(controller.updateAiConfiguration(request, 'providerInventory', { value: { providers: [] }, expectedSha256: 'a'.repeat(64), reason: 'Approved provider inventory change' })).rejects.toThrow('AI configuration audit failed and automatic recovery failed; inspect God Mode recovery snapshots immediately.');
    expect(aiRegistry.restoreGovernedSnapshot).toHaveBeenCalledWith('providerInventory', result.snapshotId, result.sha256);
  });

  it('does not mutate configuration if the change-request audit cannot be recorded', async () => {
    audit.create.mockRejectedValueOnce(new Error('audit store unavailable'));
    await expect(controller.updateAiConfiguration(request, 'providerInventory', { value: { providers: [] }, expectedSha256: 'a'.repeat(64), reason: 'Approved provider inventory change' })).rejects.toThrow('audit store unavailable');
    expect(aiRegistry.updateGovernedFile).not.toHaveBeenCalled();
  });
});
