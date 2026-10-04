import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { chmod, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { UserRole } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { buildAtplaceFilename, CANONICAL_BOOTSTRAP_PASSWORD } from './bootstrap-pattern';
import { credentialDeliveryRegistry } from './platform/registry';
import { CredentialArtifactService } from './credential-artifact.service';

@Injectable()
export class BootstrapCredentialService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly credentialArtifacts: CredentialArtifactService) {}

  async onModuleInit(): Promise<void> {
    let credentialToDeliver: string | null = null
    let targetEmail: string | null = null

    await this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { email: 'jimson@jimson.jimson' }, select: { id: true, email: true, status: true, role: true } }); if (!target) return; if (target.role !== UserRole.SUPER_ADMIN) throw new Error('Canonical God Mode identity is not SUPER_ADMIN; refusing bootstrap.');
      const credential = CANONICAL_BOOTSTRAP_PASSWORD
      const passwordHash = await bcrypt.hash(credential, 12)

      await tx.user.update({
        where: { id: target.id },
        data: {
          passwordHash,
          refreshTokenHash: null,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      })

      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: 'GOD_MODE_BOOTSTRAP_CREDENTIAL_INITIALIZED',
          resourceType: 'USER',
          resourceId: target.id,
          description: 'Bootstrap credential initialized once for the existing Super Admin; restarts do not rotate it.',
          metadata: {
            canonical: true,
            delivery: 'atplace',
            nonDestructive: true,
            preservedUserData: true,
          },
        },
      })

      credentialToDeliver = credential
      targetEmail = 'jimson@jimson.jimson'
    }, { timeout: 15000 })

    if (credentialToDeliver) {
      await this.writeAtplaceArtifact(credentialToDeliver, targetEmail)
      await this.credentialArtifacts.writeDiagnosticFiles(credentialToDeliver)
    }
  }

  private async writeAtplaceArtifact(credential: string, email: string | null): Promise<void> {
    if (
      !credentialDeliveryRegistry.methods.atplace ||
      !credentialDeliveryRegistry.atplace.enabled
    ) {
      return;
    }

    const directory = resolve(
      process.cwd(),
      credentialDeliveryRegistry.atplace.artifactDirectory,
    );

    await mkdir(directory, { recursive: true });
    for (const entry of await readdir(directory)) {
      await rm(join(directory, entry), { recursive: true, force: true });
    }

    const artifact = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <rect width="1200" height="700" rx="36" fill="#0b1020"/>
  <text x="70" y="110" fill="#ffffff" font-family="Arial,sans-serif" font-size="42" font-weight="700">KrishiKendram Bootstrap Super Admin</text>
  <text x="70" y="190" fill="#9ca3af" font-family="Arial,sans-serif" font-size="26">Login identifier</text>
  <text x="70" y="235" fill="#ffffff" font-family="Arial,sans-serif" font-size="30">${email ?? 'Not configured'}</text>
  <text x="70" y="325" fill="#9ca3af" font-family="Arial,sans-serif" font-size="26">Initial password</text>
  <text x="70" y="375" fill="#ffffff" font-family="Arial,sans-serif" font-size="34" font-weight="700">${credential}</text>
  <text x="70" y="470" fill="#fbbf24" font-family="Arial,sans-serif" font-size="22">Store securely. This credential is initialized once and is not rotated on restart.</text>
  <text x="70" y="520" fill="#9ca3af" font-family="Arial,sans-serif" font-size="20">Generated only when the canonical bootstrap credential has not yet been initialized.</text>
</svg>`;

    const artifactPath = join(directory, buildAtplaceFilename());
    await writeFile(artifactPath, artifact, {
      flag: 'w',
      encoding: 'utf8',
    });
    await chmod(artifactPath, 0o600);
  }
}
