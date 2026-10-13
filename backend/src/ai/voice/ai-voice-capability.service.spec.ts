import { ForbiddenException } from '@nestjs/common';
import { AuthorityTier, UserRole, UserStatus } from '@prisma/client';
import { GodModeService } from '../../platform/god-mode/god-mode.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { AiVoiceCapabilityService } from './ai-voice-capability.service';

describe('AiVoiceCapabilityService', () => {
  const definitions = [
    { intentId: 'NAV-FARMS', label: 'Farms', phrases: ['farms'], path: '/app/farms', access: 'AUTHENTICATED' as const, moduleId: 'KK-FARM-001' },
    { intentId: 'NAV-GOD', label: 'God Mode', phrases: ['god mode'], path: '/app/god-mode', access: 'SYSTEM_GOD' as const, moduleId: 'KK-AI-CONVERSATION-001' },
  ];
  let prisma: { user: { findUnique: jest.Mock } };
  let registry: { getRegistryId: jest.Mock; getVoiceNavigationPrefixes: jest.Mock; getVoiceIntentDefinitions: jest.Mock };
  let service: AiVoiceCapabilityService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    registry = {
      getRegistryId: jest.fn().mockReturnValue('KK-AI-REGISTRY-001'),
      getVoiceNavigationPrefixes: jest.fn().mockReturnValue(['open ', 'show ']),
      getVoiceIntentDefinitions: jest.fn().mockReturnValue(definitions),
    };
    service = new AiVoiceCapabilityService(
      prisma as never,
      registry as unknown as AiRegistryService,
    );
  });

  it('returns only ordinary intents to an active non-God account and reports restricted intents', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'admin@example.test', role: UserRole.SUPER_ADMIN,
      authorityTier: AuthorityTier.ADMINISTRATIVE, status: UserStatus.ACTIVE,
    });

    const result = await service.getIntentsForUser('user-1');
    expect(result.intents.map((intent) => intent.intentId)).toEqual(['NAV-FARMS']);
    expect(result.restrictedIntents.map((intent) => intent.intentId)).toEqual(['NAV-GOD']);
    expect(result.privilegedIntentsAvailable).toBe(false);
  });

  it('returns privileged intents only for the canonical active SYSTEM_GOD identity', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'god-1', email: GodModeService.GOD_EMAIL, role: UserRole.SUPER_ADMIN,
      authorityTier: AuthorityTier.SYSTEM_GOD, status: UserStatus.ACTIVE,
    });

    const result = await service.getIntentsForUser('god-1');
    expect(result.intents.map((intent) => intent.intentId)).toEqual(['NAV-FARMS', 'NAV-GOD']);
    expect(result.restrictedIntents).toEqual([]);
    expect(result.privilegedIntentsAvailable).toBe(true);
  });

  it('fails closed for missing or inactive accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getIntentsForUser('missing')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.user.findUnique.mockResolvedValue({
      id: 'inactive', email: GodModeService.GOD_EMAIL, role: UserRole.SUPER_ADMIN,
      authorityTier: AuthorityTier.SYSTEM_GOD, status: UserStatus.SUSPENDED,
    });
    await expect(service.getIntentsForUser('inactive')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not grant privileged intents to a SYSTEM_GOD tier with the wrong canonical identity', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'imposter', email: 'other@example.test', role: UserRole.SUPER_ADMIN,
      authorityTier: AuthorityTier.SYSTEM_GOD, status: UserStatus.ACTIVE,
    });

    const result = await service.getIntentsForUser('imposter');
    expect(result.privilegedIntentsAvailable).toBe(false);
    expect(result.intents.map((intent) => intent.intentId)).toEqual(['NAV-FARMS']);
  });
});
