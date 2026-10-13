import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthorityTier, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GodModeService } from '../../platform/god-mode/god-mode.service';
import { AiRegistryService } from '../registry/ai-registry.service';

@Injectable()
export class AiVoiceCapabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiRegistryService,
  ) {}

  /**
   * Intent discovery is not an authorization grant. It only exposes navigation
   * intents appropriate to the persisted, active account. Destination APIs
   * must still enforce their own permissions. Privileged intents are withheld
   * unless the canonical SYSTEM_GOD identity is verified from the database.
   */
  async getIntentsForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, authorityTier: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('An active authenticated account is required for voice capabilities.');
    }

    const isCanonicalGod =
      user.authorityTier === AuthorityTier.SYSTEM_GOD &&
      user.email?.toLowerCase() === GodModeService.GOD_EMAIL &&
      user.role === UserRole.SUPER_ADMIN;

    const definitions = this.registry.getVoiceIntentDefinitions();
    const intents = definitions.filter((intent) => {
      if (intent.access === 'AUTHENTICATED') return true;
      if (intent.access === 'SYSTEM_GOD') return isCanonicalGod;
      return false;
    });
    const restrictedIntents = isCanonicalGod ? [] : definitions
      .filter((intent) => intent.access === 'SYSTEM_GOD')
      .map(({ intentId, label, phrases, moduleId }) => ({ intentId, label, phrases, moduleId }));

    return {
      registryId: this.registry.getRegistryId(),
      manifestId: 'KK-AI-VOICE-INTENTS-001',
      manifestVersion: 1,
      navigationPrefixes: this.registry.getVoiceNavigationPrefixes(),
      authorizationSource: 'PERSISTED_ACCOUNT_AND_CANONICAL_GOD_AUTHORITY',
      intents,
      restrictedIntents,
      privilegedIntentsAvailable: isCanonicalGod,
      note: 'Intent discovery does not grant data access or permission to mutate records.',
    };
  }
}
