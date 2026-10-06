import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuthorityTier, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import { CredentialArtifactService } from '../../credential-artifact.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GodModeService implements OnModuleInit {
  private readonly logger = new Logger(GodModeService.name);
  static readonly GOD_EMAIL = 'jimson@jimson.jimson';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly credentialArtifacts: CredentialArtifactService,
  ) {}

  async onModuleInit(): Promise<void> {
    const password = this.generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const god = await tx.user.findUnique({ where: { email: GodModeService.GOD_EMAIL } });
      if (!god) throw new Error('God Mode identity jimson@jimson.jimson does not exist. Refusing implicit identity creation.');
      if (god.role !== UserRole.SUPER_ADMIN) throw new Error('God Mode identity must remain SUPER_ADMIN.');

      const updated = await tx.user.update({
        where: { id: god.id },
        data: {
          authorityTier: AuthorityTier.SYSTEM_GOD,
          status: UserStatus.ACTIVE,
          isVerified: true,
          passwordHash,
          refreshTokenHash: null,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        select: { id: true, email: true },
      });

      await tx.user.updateMany({
        where: { authorityTier: AuthorityTier.SYSTEM_GOD, NOT: { id: god.id } },
        data: { authorityTier: AuthorityTier.ADMINISTRATIVE },
      });

      await this.audit.createInTransaction(tx, {
        actorId: null,
        action: 'GOD_MODE_CREDENTIAL_ROTATED',
        resourceType: 'USER',
        resourceId: god.id,
        description: 'God Mode startup credential rotated.',
        metadata: {
          canonical: true,
          authorityTier: AuthorityTier.SYSTEM_GOD,
          credentialLocation: 'backend/config/god-mode/rootpathss',
          password: '[REDACTED]',
          restartRotation: true,
        },
      });

      return updated;
    }, { timeout: 15000 });

    await this.credentialArtifacts.writeGodModeCredential(password);
    this.logger.log(`God Mode initialized for ${result.email}; startup credential rotated and written to the protected development artifact directory.`);
  }

  async credentialStatus() {
    return this.credentialArtifacts.status();
  }

  private generatePassword(): string {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    return `KK-GOD-${stamp}-${randomBytes(9).toString('base64url')}`;
  }


}
