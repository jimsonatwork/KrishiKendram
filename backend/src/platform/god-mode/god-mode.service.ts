import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuthorityTier, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GodModeService implements OnModuleInit {
  private readonly logger = new Logger(GodModeService.name);
  static readonly GOD_EMAIL = 'jimson@jimson.jimson';

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

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
          credentialLocation: 'backend/config/god-mode/god-password.txt',
          password: '[REDACTED]',
          restartRotation: true,
        },
      });

      return updated;
    }, { timeout: 15000 });

    await this.writeCredentialFiles(password);
    this.logger.log(`God Mode initialized for ${result.email}; startup credential rotated and written to the protected development artifact directory.`);
  }

  async credentialStatus() {
    const directory = resolve(process.cwd(), 'config', 'god-mode');
    const passwordPath = join(directory, 'god-password.txt');
    const entries = await readdir(directory).catch(() => [] as string[]);
    const passwordStat = await stat(passwordPath).catch(() => null);
    return {
      enabled: true,
      directory: 'backend/config/god-mode',
      completePasswordFile: 'backend/config/god-mode/god-password.txt',
      passwordFilePresent: Boolean(passwordStat),
      patternFiles: entries.filter((entry) => entry.endsWith('.txt') && entry !== 'god-password.txt'),
      passwordLastModifiedAt: passwordStat?.mtime.toISOString() ?? null,
      passwordValueExposed: false,
    };
  }

  private generatePassword(): string {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    return `KK-GOD-${stamp}-${randomBytes(9).toString('base64url')}`;
  }

  private async writeCredentialFiles(password: string): Promise<void> {
    const directory = resolve(process.cwd(), 'config', 'god-mode');
    await mkdir(directory, { recursive: true });
    for (const entry of await readdir(directory)) {
      if (entry === 'god-password.txt' || /^\w{6}\.txt$/.test(entry)) {
        await rm(join(directory, entry), { recursive: true, force: true });
      }
    }
    const passwordPath = join(directory, 'god-password.txt');
    await writeFile(passwordPath, password + '\n', { encoding: 'utf8', mode: 0o600 });
    await chmod(passwordPath, 0o600);
    const pattern = password.slice(-6);
    const patternPath = join(directory, `${pattern}.txt`);
    await writeFile(patternPath, pattern + '\n', { encoding: 'utf8', mode: 0o600 });
    await chmod(patternPath, 0o600);
  }
}
