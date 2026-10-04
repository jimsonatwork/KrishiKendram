// ============================================================
// KRISHIKENDRAM - BREAK-GLASS SUPER ADMIN RECOVERY
// ============================================================
//
// Local-only recovery route.
// Credentials are supplied by the protected workstation vault;
// they are never accepted over HTTP and never printed.
//
// This command can recover the canonical Super Admin when the
// normal account lifecycle or UI authentication is unavailable.
// ============================================================

import {
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { generateMemberId } from './platform/identity/member-id';
import { CredentialArtifactService } from './credential-artifact.service';

const prisma = new PrismaClient();

const CANONICAL_NAME = 'jimson';
const CANONICAL_EMAIL = 'jimson@jimson.jimson';
const CANONICAL_MOBILE = '0123456789';

type SnapshotUser = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: UserRole;
  status: UserStatus;
  preferredLanguage: string | null;
  preferredInputMethod: string;
  profileCompletion: number;
  isVerified: boolean;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      'Required recovery variable is missing: ' + name,
    );
  }

  return value;
}

function snapshot(user: SnapshotUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    status: user.status,
    preferredLanguage: user.preferredLanguage,
    preferredInputMethod: user.preferredInputMethod,
    profileCompletion: user.profileCompletion,
    isVerified: user.isVerified,
  };
}

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL?.trim() || CANONICAL_EMAIL).toLowerCase();

  if (email !== CANONICAL_EMAIL) {
    throw new Error('Break-glass recovery is restricted to the canonical Super Admin identity.');
  }
  const password = requiredEnv('SUPER_ADMIN_PASSWORD');

  if (password.length < 8) {
    throw new Error(
      'Recovery password must contain at least 8 characters.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(
    async (tx) => {
      let existing = await tx.user.findUnique({
        where: { email },
        select: {
          id: true, name: true, email: true, mobile: true,
          role: true, status: true, preferredLanguage: true,
          preferredInputMethod: true, profileCompletion: true,
          isVerified: true,
        },
      });

      if (existing && existing.role !== UserRole.SUPER_ADMIN) {
        throw new Error(
          'Recovery email belongs to a non-Super-Admin account.',
        );
      }

      if (existing) {
        const beforeData = snapshot(existing);
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            name: CANONICAL_NAME,
            email: CANONICAL_EMAIL,
            role: UserRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
            isVerified: true,
            passwordHash,
            refreshTokenHash: null,
          },
          select: {
            id: true, name: true, email: true, mobile: true,
            role: true, status: true, preferredLanguage: true,
            preferredInputMethod: true, profileCompletion: true,
            isVerified: true,
          },
        });

        const afterData = snapshot(updated);
        const changedFields = Object.keys(afterData).filter(
          (key) =>
            JSON.stringify(beforeData[key as keyof typeof beforeData]) !==
            JSON.stringify(afterData[key as keyof typeof afterData]),
        );

        const latest = await tx.userHistory.findFirst({
          where: { userId: existing.id },
          orderBy: { version: 'desc' },
          select: { version: true },
        });

        await tx.userHistory.create({
          data: {
            userId: existing.id,
            version: (latest?.version ?? 0) + 1,
            actorId: null,
            action: 'SUPER_ADMIN_BREAK_GLASS_RECOVERY',
            beforeData: beforeData as Prisma.InputJsonValue,
            afterData: afterData as Prisma.InputJsonValue,
            changedFields: changedFields as Prisma.InputJsonValue,
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: null,
            action: 'SUPER_ADMIN_BREAK_GLASS_RECOVERY',
            resourceType: 'USER',
            resourceId: existing.id,
            description:
              'Canonical Super Admin recovered through local break-glass procedure',
            metadata: { recovery: true, email, changedFields } satisfies Prisma.InputJsonValue,
          },
        });

        return { action: 'RECOVERED', user: updated };
      }

      const created = await tx.user.create({
        data: {
          memberId: generateMemberId(),
          name: CANONICAL_NAME,
          email: CANONICAL_EMAIL,
          mobile: CANONICAL_MOBILE,
          passwordHash,
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          isVerified: true,
          profileCompletion: 100,
        },
        select: {
          id: true, name: true, email: true, mobile: true,
          role: true, status: true, preferredLanguage: true,
          preferredInputMethod: true, profileCompletion: true,
          isVerified: true,
        },
      });

      await tx.userHistory.create({
        data: {
          userId: created.id,
          version: 1,
          actorId: null,
          action: 'SUPER_ADMIN_BREAK_GLASS_CREATED',
          beforeData: Prisma.JsonNull,
          afterData: snapshot(created) as Prisma.InputJsonValue,
          changedFields: ['id', 'name', 'email', 'role', 'status', 'isVerified'],
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: 'SUPER_ADMIN_BREAK_GLASS_CREATED',
          resourceType: 'USER',
          resourceId: created.id,
          description:
            'Canonical Super Admin created through local break-glass procedure',
          metadata: { recovery: true, email } satisfies Prisma.InputJsonValue,
        },
      });

      return { action: 'CREATED', user: created };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await new CredentialArtifactService().writeDiagnosticFiles(password);

  console.log(
    'Break-glass recovery ' + result.action.toLowerCase() + ' successfully.',
  );
  console.log('Super Admin email: ' + result.user.email);
  console.log('User ID: ' + result.user.id);
  console.log('Status: ACTIVE');
  console.log('Verified: true');
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Break-glass recovery failed.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
