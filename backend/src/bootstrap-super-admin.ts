// ============================================================
// KRISHIKENDRAM - FIRST SUPER ADMIN BOOTSTRAP
// ============================================================
//
// One-time operational bootstrap for a brand-new installation.
// Intentionally NOT exposed as an HTTP endpoint.
//
// Safety:
//   1. Refuses to run when any User already exists.
//   2. Prompts for credentials interactively.
//   3. Never logs the password or password hash.
//   4. Creates exactly one ACTIVE, verified SUPER_ADMIN.
//   5. Writes the existing USER_CREATED audit event.
//   6. Uses the same bcrypt cost and member-ID generator.
// ============================================================

import {
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createInterface } from 'node:readline/promises';
import {
  stdin as input,
  stdout as output,
} from 'node:process';

import { generateMemberId } from './platform/identity/member-id';

const prisma = new PrismaClient();

async function prompt(
  rl: ReturnType<typeof createInterface>,
  label: string,
): Promise<string> {
  const value = (
    await rl.question(label)
  ).trim();

  if (!value) {
    throw new Error(
      label.replace(/: $/, '') +
        ' is required.',
    );
  }

  return value;
}

async function promptPassword(): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    throw new Error(
      'Interactive password input is required. ' +
        'Run this command with a TTY.',
    );
  }

  output.write('Password: ');
  input.setRawMode(true);

  let password = '';

  await new Promise<void>((resolve) => {
    const onData = (chunk: Buffer) => {
      const value = chunk.toString();

      if (
        value === '\r' ||
        value === '\n'
      ) {
        input.off('data', onData);
        input.setRawMode(false);
        output.write('\n');
        resolve();
        return;
      }

      if (value === '\u0003') {
        input.off('data', onData);
        input.setRawMode(false);
        output.write('\n');
        process.exit(130);
      }

      if (value === '\u007f') {
        password = password.slice(0, -1);
        return;
      }

      password += value;
    };

    input.on('data', onData);
  });

  if (password.length < 8) {
    throw new Error(
      'Password must contain at least 8 characters.',
    );
  }

  return password;
}

async function main() {
  const userCount =
    await prisma.user.count();

  if (userCount !== 0) {
    throw new Error(
      'Bootstrap refused: the database already ' +
        'contains ' +
        userCount +
        ' user(s).',
    );
  }

  const rl = createInterface({
    input,
    output,
  });

  try {
    const name = await prompt(
      rl,
      'Super Admin name: ',
    );

    const email = (
      await prompt(
        rl,
        'Super Admin email: ',
      )
    ).toLowerCase();

    if (
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      throw new Error(
        'A valid email address is required.',
      );
    }

    const password =
      await promptPassword();

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    const user =
      await prisma.$transaction(
        async (tx) => {
          const count =
            await tx.user.count();

          if (count !== 0) {
            throw new Error(
              'Bootstrap refused: another user ' +
                'was created during bootstrap.',
            );
          }

          const created =
            await tx.user.create({
              data: {
                memberId:
                  generateMemberId(),
                name,
                email,
                passwordHash,
                role:
                  UserRole.SUPER_ADMIN,
                status:
                  UserStatus.ACTIVE,
                isVerified: true,
                profileCompletion: 100,
              },
            });

          await tx.auditEvent.create({
            data: {
              actorId: null,
              action: 'USER_CREATED',
              resourceType: 'USER',
              resourceId: created.id,
              description:
                'Initial Super Admin ' +
                created.name +
                ' was bootstrapped',
              metadata: {
                bootstrap: true,
                role: created.role,
              } satisfies
                Prisma.InputJsonValue,
            },
          });

          return created;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

    console.log('');
    console.log(
      'Initial Super Admin created successfully.',
    );
    console.log(
      'Member ID: ' +
        user.memberId,
    );
    console.log(
      'User ID: ' +
        user.id,
    );
    console.log(
      'Role: SUPER_ADMIN',
    );
    console.log(
      'Status: ACTIVE',
    );
    console.log(
      'Verified: true',
    );
    console.log('');
    console.log(
      'Bootstrap is now permanently blocked ' +
        'by the non-empty User table.',
    );
  } finally {
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Bootstrap failed.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
