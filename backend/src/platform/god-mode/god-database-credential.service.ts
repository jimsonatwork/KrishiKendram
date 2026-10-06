import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type RotationResult = {
  username: string;
  host: string;
  database: string;
  changedAt: string;
  restartRequired: true;
};

@Injectable()
export class GodDatabaseCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async status() {
    const raw = process.env.DATABASE_URL ?? '';
    const url = this.parseUrl(raw);
    return {
      configured: Boolean(raw),
      provider: url?.protocol.replace(':', '') ?? 'postgresql',
      host: url?.hostname ?? '',
      port: url?.port ?? '',
      database: url?.pathname.replace(/^\//, '') ?? '',
      username: url?.username ?? '',
      restartRequiredForRotation: true,
      source: '.env / DATABASE_URL',
      password: 'MASKED',
    };
  }

  async rotatePassword(newPassword: string, actorId: string, reason?: string): Promise<RotationResult> {
    const password = newPassword?.trim();
    if (!password || password.length < 16) {
      throw new BadRequestException('Database password must be at least 16 characters.');
    }
    if (password.includes('\n') || password.includes('\r')) {
      throw new BadRequestException('Database password cannot contain newlines.');
    }

    const raw = process.env.DATABASE_URL ?? '';
    const url = this.parseUrl(raw);
    if (!url?.username) throw new BadRequestException('DATABASE_URL has no database username.');
    const oldPassword = decodeURIComponent(url.password);
    if (!oldPassword) throw new BadRequestException('Current database password is not configured.');

    const quotedUser = '"' + url.username.replace(/"/g, '""') + '"';
    const escapedPassword = password.replace(/'/g, "''");
    const escapedOldPassword = oldPassword.replace(/'/g, "''");
    const sql = 'ALTER ROLE ' + quotedUser + " WITH PASSWORD '" + escapedPassword + "'";

    await this.prisma.$executeRawUnsafe(sql);

    try {
      const nextUrl = new URL(url.toString());
      nextUrl.password = password;
      const nextDatabaseUrl = nextUrl.toString();
      await this.updateEnv(nextDatabaseUrl, password);
      process.env.DATABASE_URL = nextDatabaseUrl;

      await this.audit.create({
        actorId,
        action: 'GOD_DATABASE_PASSWORD_ROTATED',
        resourceType: 'DATABASE_CREDENTIAL',
        description: 'God Mode rotated the primary database password.',
        metadata: {
          username: url.username,
          host: url.hostname,
          database: url.pathname.replace(/^\//, ''),
          restartRequired: true,
          reason: reason?.trim() || null,
        },
      });

      return {
        username: url.username,
        host: url.hostname,
        database: url.pathname.replace(/^\//, ''),
        changedAt: new Date().toISOString(),
        restartRequired: true,
      };
    } catch (error) {
      try {
        await this.prisma.$executeRawUnsafe(
          'ALTER ROLE ' + quotedUser + " WITH PASSWORD '" + escapedOldPassword + "'",
        );
      } catch {
        throw new ServiceUnavailableException(
          'Database password changed but runtime configuration update failed; rollback of the database credential also failed. Do not restart the backend until the DATABASE_URL is reconciled.',
        );
      }
      throw new ServiceUnavailableException(
        'Database password rotation was rolled back because the runtime configuration could not be updated.',
      );
    }
  }

  private parseUrl(raw: string): URL | null {
    try {
      return new URL(raw);
    } catch {
      return null;
    }
  }

  private async updateEnv(databaseUrl: string, password: string): Promise<void> {
    const root = resolve(process.cwd(), '..');
    const envPath = resolve(root, '.env');
    const current = await readFile(envPath, 'utf8');
    const replaceKey = (source: string, key: string, value: string) => {
      const escaped = JSON.stringify(value);
      const line = key + '=' + escaped;
      const pattern = new RegExp('^' + key + '=.*$', 'm');
      return pattern.test(source) ? source.replace(pattern, line) : source + (source.endsWith('\n') ? '' : '\n') + line + '\n';
    };
    let next = replaceKey(current, 'DATABASE_URL', databaseUrl);
    next = replaceKey(next, 'POSTGRES_PASSWORD', password);
    const temp = envPath + '.god-rotation.tmp';
    await writeFile(temp, next, { mode: 0o600 });
    await rename(temp, envPath);
  }
}

