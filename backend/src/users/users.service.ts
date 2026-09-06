// ============================================================
// PART 01 - IMPORTS
// ============================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import {
  InputMethod,
  UserRole,
  UserStatus,
} from '@prisma/client'

import * as bcrypt from 'bcrypt'

import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../platform/audit/audit.service'

import { UpdateUserDto } from './dto/update-user.dto'

// ============================================================
// PART 01 END
// ============================================================

// ============================================================
// PART 02 - TYPES & CONSTANTS
// ============================================================

type UserSnapshot = {
  id: string
  name: string
  email: string | null
  mobile: string | null
  role: UserRole
  status: UserStatus
  preferredLanguage: string | null
  preferredInputMethod: InputMethod
  profileCompletion: number
  isVerified: boolean
  passwordHash?: string
}

type SafeUser = Omit<UserSnapshot, 'passwordHash'> & {
  lastLoginAt: Date | null
  lastSeenAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const USER_HISTORY_RETENTION = 3

// ============================================================
// PART 02 END
// ============================================================


// ============================================================
// PART 03 - USERS SERVICE
// ============================================================

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================
  // PART 03A - USER LIST
  // ==========================================================

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        preferredLanguage: true,
        preferredInputMethod: true,
        profileCompletion: true,
        isVerified: true,
        lastLoginAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // ==========================================================
  // PART 03A END
  // ==========================================================


  // ==========================================================
  // PART 03B - USER LOOKUP
  // ==========================================================

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        preferredLanguage: true,
        preferredInputMethod: true,
        profileCompletion: true,
        isVerified: true,
        lastLoginAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return user
  }

  async findByEmailOrMobile(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { mobile: identifier },
        ],
      },
    })
  }

  // ==========================================================
  // PART 03B END
  // ==========================================================


  // ==========================================================
  // PART 03C - CREATE USER
  // ==========================================================

  async create(
    data: {
      name: string
      email: string
      password: string
    },
    actorId?: string,
  ) {
    const name = data.name.trim()
    const email = data.email.trim().toLowerCase()

    if (!name) {
      throw new BadRequestException(
        'User name is required',
      )
    }

    if (!email) {
      throw new BadRequestException(
        'Email address is required',
      )
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        id: true,
      },
    })

    if (existing) {
      throw new BadRequestException(
        'Email address is already in use',
      )
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      12,
    )

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.FARMER,
      },
    })

    await this.auditService.create({
      actorId: actorId ?? null,
      action: 'USER_CREATED',
      resourceType: 'USER',
      resourceId: user.id,
      description: `User ${user.name} was created`,
      metadata: {
        email: user.email,
        role: user.role,
      },
    })

    const {
      passwordHash: _passwordHash,
      refreshTokenHash: _refreshTokenHash,
      ...safeUser
    } = user

    return safeUser
  }

  // ==========================================================
  // PART 03C END
  // ==========================================================


  // ==========================================================
  // PART 04 - UPDATE USER
  // ==========================================================

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id },
        })

        if (!currentUser) {
          throw new NotFoundException(
            'User not found',
          )
        }

        if (
          currentUser.status === UserStatus.DELETED &&
          dto.status !== undefined &&
          dto.status !== UserStatus.DELETED
        ) {
          throw new BadRequestException(
            'Deleted users cannot be changed through normal editing',
          )
        }

        const normalizedEmail =
          dto.email !== undefined
            ? dto.email.trim().toLowerCase()
            : undefined

        const normalizedMobile =
          dto.mobile !== undefined
            ? dto.mobile.trim() || null
            : undefined

        const normalizedName =
          dto.name !== undefined
            ? dto.name.trim()
            : undefined

        if (
          dto.name !== undefined &&
          !normalizedName
        ) {
          throw new BadRequestException(
            'User name cannot be empty',
          )
        }

        if (
          normalizedEmail !== undefined &&
          normalizedEmail !== currentUser.email
        ) {
          const existing =
            await tx.user.findFirst({
              where: {
                email: normalizedEmail,
                NOT: { id },
              },
              select: {
                id: true,
              },
            })

          if (existing) {
            throw new BadRequestException(
              'Email address is already in use',
            )
          }
        }

        if (
          normalizedMobile !== undefined &&
          normalizedMobile !== currentUser.mobile
        ) {
          const existing =
            normalizedMobile === null
              ? null
              : await tx.user.findFirst({
                  where: {
                    mobile: normalizedMobile,
                    NOT: { id },
                  },
                  select: {
                    id: true,
                  },
                })

          if (existing) {
            throw new BadRequestException(
              'Mobile number is already in use',
            )
          }
        }

        const removingLastActiveSuperAdmin =
          currentUser.role === UserRole.SUPER_ADMIN &&
          currentUser.status === UserStatus.ACTIVE &&
          (
            (
              dto.role !== undefined &&
              dto.role !== UserRole.SUPER_ADMIN
            ) ||
            (
              dto.status !== undefined &&
              dto.status !== UserStatus.ACTIVE
            )
          )

        if (removingLastActiveSuperAdmin) {
          await this.ensureAnotherActiveSuperAdmin(
            tx,
            id,
          )
        }

        const beforeData =
          this.createUserSnapshot(
            currentUser,
            true,
          )

        const updateData: Record<
          string,
          unknown
        > = {}

        if (normalizedName !== undefined) {
          updateData.name = normalizedName
        }

        if (normalizedEmail !== undefined) {
          updateData.email = normalizedEmail
        }

        if (normalizedMobile !== undefined) {
          updateData.mobile = normalizedMobile
        }

        if (dto.role !== undefined) {
          updateData.role = dto.role
        }

        if (dto.status !== undefined) {
          updateData.status = dto.status
        }

        if (
          dto.preferredLanguage !== undefined
        ) {
          updateData.preferredLanguage =
            dto.preferredLanguage.trim() || null
        }

        if (
          dto.preferredInputMethod !== undefined
        ) {
          updateData.preferredInputMethod =
            dto.preferredInputMethod
        }

        if (
          dto.profileCompletion !== undefined
        ) {
          if (
            dto.profileCompletion < 0 ||
            dto.profileCompletion > 100
          ) {
            throw new BadRequestException(
              'Profile completion must be between 0 and 100',
            )
          }

          updateData.profileCompletion =
            dto.profileCompletion
        }

        if (dto.isVerified !== undefined) {
          updateData.isVerified =
            dto.isVerified
        }

        if (dto.password !== undefined) {
          if (!dto.password.trim()) {
            throw new BadRequestException(
              'Password cannot be empty',
            )
          }

          updateData.passwordHash =
            await bcrypt.hash(
              dto.password,
              12,
            )

          updateData.refreshTokenHash = null
        }

        const updatedUser =
          await tx.user.update({
            where: { id },
            data: updateData,
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              role: true,
              status: true,
              preferredLanguage: true,
              preferredInputMethod: true,
              profileCompletion: true,
              isVerified: true,
              passwordHash: true,
              lastLoginAt: true,
              lastSeenAt: true,
              createdAt: true,
              updatedAt: true,
            },
          })

        const afterData =
          this.createUserSnapshot(
            updatedUser,
            true,
          )

        const changedFields =
          this.getChangedFields(
            beforeData,
            afterData,
          )

        if (changedFields.length > 0) {
          const action =
            dto.password !== undefined
              ? 'USER_UPDATED_PASSWORD'
              : 'USER_UPDATED'

          await this.createHistoryEntry(
            tx,
            {
              userId: id,
              actorId,
              action,
              beforeData,
              afterData,
              changedFields,
            },
          )

          await tx.auditEvent.create({
            data: {
              actorId: actorId ?? null,
              action,
              resourceType: 'USER',
              resourceId: id,
              description:
                `User ${updatedUser.name} was updated`,
              metadata: {
                changedFields,
              },
            },
          })
        }

        return this.toSafeUser(
          updatedUser,
        )
      },
    )
  }

  // ==========================================================
  // PART 04 END
  // ==========================================================


  // ==========================================================
  // PART 05 - USER HISTORY
  // ==========================================================

  async getHistory(
    id: string,
    limit = 10,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      })

    if (!user) {
      throw new NotFoundException(
        'User not found',
      )
    }

    const history =
      await this.prisma.userHistory.findMany({
        where: { userId: id },
        orderBy: {
          version: 'desc',
        },
        take: Math.min(
          Math.max(limit, 1),
          50,
        ),
        select: {
          id: true,
          userId: true,
          version: true,
          action: true,
          actorId: true,
          beforeData: true,
          afterData: true,
          changedFields: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

    return history.map(
      (entry) => ({
        ...entry,
        beforeData:
          this.removeSensitiveHistoryData(
            entry.beforeData,
          ),
        afterData:
          this.removeSensitiveHistoryData(
            entry.afterData,
          ),
      }),
    )
  }

  // ==========================================================
  // PART 05 END
  // ==========================================================


  // ==========================================================
  // PART 06 - RESTORE USER VERSION
  // ==========================================================

  async restoreVersion(
    id: string,
    version: number,
    actorId?: string,
  ) {
    if (
      !Number.isInteger(version) ||
      version < 1
    ) {
      throw new BadRequestException(
        'Invalid history version',
      )
    }

    return this.prisma.$transaction(
      async (tx) => {
        const current =
          await tx.user.findUnique({
            where: { id },
          })

        if (!current) {
          throw new NotFoundException(
            'User not found',
          )
        }

        const history =
          await tx.userHistory.findUnique({
            where: {
              userId_version: {
                userId: id,
                version,
              },
            },
          })

        if (!history) {
          throw new NotFoundException(
            'User history version not found',
          )
        }

        const snapshot =
          this.parseHistorySnapshot(
            history.beforeData,
          )

        if (!snapshot) {
          throw new BadRequestException(
            'This history entry cannot be restored',
          )
        }

        if (
          snapshot.role === UserRole.SUPER_ADMIN &&
          snapshot.status === UserStatus.ACTIVE
        ) {
          await this.ensureValidSuperAdminRestore(
            tx,
            id,
          )
        }

        const removingLastActiveSuperAdmin =
          current.role === UserRole.SUPER_ADMIN &&
          current.status === UserStatus.ACTIVE &&
          (
            snapshot.role !==
              UserRole.SUPER_ADMIN ||
            snapshot.status !==
              UserStatus.ACTIVE
          )

        if (
          removingLastActiveSuperAdmin
        ) {
          await this.ensureAnotherActiveSuperAdmin(
            tx,
            id,
          )
        }

        if (
          snapshot.email !== null &&
          snapshot.email !== current.email
        ) {
          const existing =
            await tx.user.findFirst({
              where: {
                email: snapshot.email,
                NOT: { id },
              },
              select: {
                id: true,
              },
            })

          if (existing) {
            throw new BadRequestException(
              'The historical email address is already in use',
            )
          }
        }

        if (
          snapshot.mobile !== null &&
          snapshot.mobile !== current.mobile
        ) {
          const existing =
            await tx.user.findFirst({
              where: {
                mobile: snapshot.mobile,
                NOT: { id },
              },
              select: {
                id: true,
              },
            })

          if (existing) {
            throw new BadRequestException(
              'The historical mobile number is already in use',
            )
          }
        }

        const beforeData =
          this.createUserSnapshot(
            current,
            true,
          )

        const updateData: Record<
          string,
          unknown
        > = {
          name: snapshot.name,
          email: snapshot.email,
          mobile: snapshot.mobile,
          role: snapshot.role,
          status: snapshot.status,
          preferredLanguage:
            snapshot.preferredLanguage,
          preferredInputMethod:
            snapshot.preferredInputMethod,
          profileCompletion:
            snapshot.profileCompletion,
          isVerified:
            snapshot.isVerified,
          deletionRequested:
            snapshot.status ===
            UserStatus.PENDING_DELETE,
          deletionRequestedAt:
            snapshot.status ===
            UserStatus.PENDING_DELETE
              ? current.deletionRequestedAt
              : null,
        }

        if (snapshot.passwordHash) {
          updateData.passwordHash =
            snapshot.passwordHash
          updateData.refreshTokenHash = null
        }

        const restored =
          await tx.user.update({
            where: { id },
            data: updateData,
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              role: true,
              status: true,
              preferredLanguage: true,
              preferredInputMethod: true,
              profileCompletion: true,
              isVerified: true,
              passwordHash: true,
              lastLoginAt: true,
              lastSeenAt: true,
              createdAt: true,
              updatedAt: true,
            },
          })

        const afterData =
          this.createUserSnapshot(
            restored,
            true,
          )

        const changedFields =
          this.getChangedFields(
            beforeData,
            afterData,
          )

        const latest =
          await tx.userHistory.findFirst({
            where: { userId: id },
            orderBy: {
              version: 'desc',
            },
            select: {
              version: true,
            },
          })

        const nextVersion =
          (latest?.version ?? 0) + 1

        await tx.userHistory.create({
          data: {
            userId: id,
            version: nextVersion,
            actorId: actorId ?? null,
            action:
              'USER_VERSION_RESTORED',
            beforeData:
              beforeData as object,
            afterData:
              afterData as object,
            changedFields:
              changedFields as object,
          },
        })

        await this.pruneHistory(
          tx,
          id,
        )

        await tx.auditEvent.create({
          data: {
            actorId: actorId ?? null,
            action:
              'USER_VERSION_RESTORED',
            resourceType: 'USER',
            resourceId: id,
            description:
              `User ${restored.name} was restored to history version ${version}`,
            metadata: {
              restoredVersion: version,
              changedFields,
            },
          },
        })

        return this.toSafeUser(
          restored,
        )
      },
    )
  }

  // ==========================================================
  // PART 06 END
  // ==========================================================


  // ==========================================================
  // PART 07 - BULK DELETE
  // ==========================================================

  async bulkDelete(
    userIds: string[],
    actorId?: string,
  ) {
    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          (id) =>
            typeof id === 'string' &&
            id.trim().length > 0,
        ),
      ),
    ]

    if (uniqueUserIds.length === 0) {
      throw new BadRequestException(
        'At least one user ID is required',
      )
    }

    if (
      actorId &&
      uniqueUserIds.includes(actorId)
    ) {
      throw new BadRequestException(
        'You cannot delete your own account through bulk deletion',
      )
    }

    const users =
      await this.prisma.user.findMany({
        where: {
          id: {
            in: uniqueUserIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          preferredLanguage: true,
          preferredInputMethod: true,
          profileCompletion: true,
          isVerified: true,
          passwordHash: true,
          lastLoginAt: true,
          lastSeenAt: true,
          createdAt: true,
          updatedAt: true,
        },
      })

    if (
      users.length !==
      uniqueUserIds.length
    ) {
      throw new NotFoundException(
        'One or more users were not found',
      )
    }

    const activeSuperAdmins =
      users.filter(
        (user) =>
          user.role === UserRole.SUPER_ADMIN &&
          user.status === UserStatus.ACTIVE,
      )

    if (
      activeSuperAdmins.length > 0
    ) {
      const total =
        await this.prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
          },
        })

      if (
        total -
          activeSuperAdmins.length <
        1
      ) {
        throw new BadRequestException(
          'Cannot delete the last active SUPER_ADMIN',
        )
      }
    }

    const now = new Date()

    const targets =
      users.filter(
        (user) =>
          user.status !== UserStatus.DELETED,
      )

    await this.prisma.$transaction(
      async (tx) => {
        for (const user of targets) {
          if (
            user.status ===
            UserStatus.PENDING_DELETE
          ) {
            continue
          }

          const beforeData =
            this.createUserSnapshot(
              user,
              true,
            )

          const updated =
            await tx.user.update({
              where: {
                id: user.id,
              },
              data: {
                status:
                  UserStatus.PENDING_DELETE,
                deletionRequested:
                  true,
                deletionRequestedAt:
                  now,
                refreshTokenHash:
                  null,
              },
              select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                preferredLanguage: true,
                preferredInputMethod: true,
                profileCompletion: true,
                isVerified: true,
                passwordHash: true,
                lastLoginAt: true,
                lastSeenAt: true,
                createdAt: true,
                updatedAt: true,
              },
            })

          const afterData =
            this.createUserSnapshot(
              updated,
              true,
            )

          const changedFields =
            this.getChangedFields(
              beforeData,
              afterData,
            )

          await this.createHistoryEntry(
            tx,
            {
              userId: user.id,
              actorId,
              action:
                'USER_DELETE_REQUESTED',
              beforeData,
              afterData,
              changedFields,
            },
          )

          await tx.auditEvent.create({
            data: {
              actorId: actorId ?? null,
              action:
                'USER_DELETE_REQUESTED',
              resourceType: 'USER',
              resourceId: user.id,
              description:
                `User ${user.name} was marked for deletion`,
              metadata: {
                changedFields,
              },
            },
          })
        }
      },
    )

    return {
      message:
        `${targets.filter(
          (user) =>
            user.status !==
            UserStatus.PENDING_DELETE,
        ).length} user(s) marked for deletion`,
      count:
        targets.filter(
          (user) =>
            user.status !==
            UserStatus.PENDING_DELETE,
        ).length,
    }
  }

  // ==========================================================
  // PART 07 END
  // ==========================================================


  // ==========================================================
  // PART 08 - DELETE RESTORE
  // ==========================================================

  async restore(
    id: string,
    actorId?: string,
  ) {
    const currentUser =
      await this.prisma.user.findUnique({
        where: { id },
      })

    if (!currentUser) {
      throw new NotFoundException(
        'User not found',
      )
    }

    if (
      currentUser.status !==
      UserStatus.PENDING_DELETE
    ) {
      throw new BadRequestException(
        'Only users pending deletion can be restored',
      )
    }

    return this.restoreToStatus(
      id,
      UserStatus.ACTIVE,
      actorId,
      'USER_RESTORED',
    )
  }

  private async restoreToStatus(
    id: string,
    status: UserStatus,
    actorId?: string,
    action = 'USER_RESTORED',
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const current =
          await tx.user.findUnique({
            where: { id },
          })

        if (!current) {
          throw new NotFoundException(
            'User not found',
          )
        }

        if (
          status === UserStatus.ACTIVE &&
          current.role === UserRole.SUPER_ADMIN
        ) {
          await this.ensureValidSuperAdminRestore(
            tx,
            id,
          )
        }

        const beforeData =
          this.createUserSnapshot(
            current,
            true,
          )

        const updated =
          await tx.user.update({
            where: { id },
            data: {
              status,
              deletionRequested:
                status ===
                UserStatus.PENDING_DELETE,
              deletionRequestedAt:
                status ===
                UserStatus.PENDING_DELETE
                  ? current.deletionRequestedAt
                  : null,
            },
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              role: true,
              status: true,
              preferredLanguage: true,
              preferredInputMethod: true,
              profileCompletion: true,
              isVerified: true,
              passwordHash: true,
              lastLoginAt: true,
              lastSeenAt: true,
              createdAt: true,
              updatedAt: true,
            },
          })

        const afterData =
          this.createUserSnapshot(
            updated,
            true,
          )

        const changedFields =
          this.getChangedFields(
            beforeData,
            afterData,
          )

        await this.createHistoryEntry(
          tx,
          {
            userId: id,
            actorId,
            action,
            beforeData,
            afterData,
            changedFields,
          },
        )

        await tx.auditEvent.create({
          data: {
            actorId: actorId ?? null,
            action,
            resourceType: 'USER',
            resourceId: id,
            description:
              `User ${updated.name} was restored`,
            metadata: {
              changedFields,
            },
          },
        })

        return this.toSafeUser(
          updated,
        )
      },
    )
  }

  // ==========================================================
  // PART 08 END
  // ==========================================================


  // ==========================================================
  // PART 09 - ACTIVITY
  // ==========================================================

  async getActivity(
    id: string,
    limit = 50,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      })

    if (!user) {
      throw new NotFoundException(
        'User not found',
      )
    }

    return this.auditService.getUserActivity(
      id,
      limit,
    )
  }

  async getRecentActivity(
    limit = 50,
  ) {
    return this.auditService.getRecentActivity(
      limit,
    )
  }

  // ==========================================================
  // PART 09 END
  // ==========================================================


  // ==========================================================
  // PART 10 - HISTORY HELPERS
  // ==========================================================

  private createUserSnapshot(
    user: {
      id: string
      name: string
      email: string | null
      mobile: string | null
      role: UserRole
      status: UserStatus
      preferredLanguage: string | null
      preferredInputMethod: InputMethod
      profileCompletion: number
      isVerified: boolean
      passwordHash?: string
    },
    includePasswordHash = false,
  ): UserSnapshot {
    const snapshot: UserSnapshot = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      preferredLanguage:
        user.preferredLanguage,
      preferredInputMethod:
        user.preferredInputMethod,
      profileCompletion:
        user.profileCompletion,
      isVerified:
        user.isVerified,
    }

    if (
      includePasswordHash &&
      user.passwordHash
    ) {
      snapshot.passwordHash =
        user.passwordHash
    }

    return snapshot
  }

  private getChangedFields(
    beforeData: UserSnapshot,
    afterData: UserSnapshot,
  ) {
    const fields = [
      'name',
      'email',
      'mobile',
      'role',
      'status',
      'preferredLanguage',
      'preferredInputMethod',
      'profileCompletion',
      'isVerified',
      'passwordHash',
    ] as const

    return fields.filter(
      (field) =>
        JSON.stringify(
          beforeData[field],
        ) !==
        JSON.stringify(
          afterData[field],
        ),
    )
  }

  private parseHistorySnapshot(
    data: unknown,
  ): UserSnapshot | null {
    if (
      !data ||
      typeof data !== 'object'
    ) {
      return null
    }

    const snapshot =
      data as Record<
        string,
        unknown
      >

    if (
      typeof snapshot.id !== 'string' ||
      typeof snapshot.name !== 'string' ||
      !Object.values(UserRole).includes(
        snapshot.role as UserRole,
      ) ||
      !Object.values(UserStatus).includes(
        snapshot.status as UserStatus,
      )
    ) {
      return null
    }

    return {
      id: snapshot.id,
      name: snapshot.name,
      email:
        snapshot.email === null
          ? null
          : String(snapshot.email),
      mobile:
        snapshot.mobile === null
          ? null
          : String(snapshot.mobile),
      role:
        snapshot.role as UserRole,
      status:
        snapshot.status as UserStatus,
      preferredLanguage:
        snapshot.preferredLanguage === null
          ? null
          : String(
              snapshot.preferredLanguage,
            ),
      preferredInputMethod:
        snapshot.preferredInputMethod as InputMethod,
      profileCompletion:
        Number(
          snapshot.profileCompletion ?? 0,
        ),
      isVerified:
        Boolean(
          snapshot.isVerified,
        ),
      ...(typeof snapshot.passwordHash ===
      'string'
        ? {
            passwordHash:
              snapshot.passwordHash,
          }
        : {}),
    }
  }

  private removeSensitiveHistoryData(
    data: unknown,
  ) {
    if (
      !data ||
      typeof data !== 'object'
    ) {
      return data
    }

    const sanitized = {
      ...(data as Record<
        string,
        unknown
      >),
    }

    delete sanitized.passwordHash

    return sanitized
  }

  private toSafeUser(
    user: UserSnapshot & {
      lastLoginAt?: Date | null
      lastSeenAt?: Date | null
      createdAt?: Date
      updatedAt?: Date
    },
  ): SafeUser {
    const {
      passwordHash: _passwordHash,
      ...safeUser
    } = user

    return safeUser as SafeUser
  }

  // ==========================================================
  // PART 10 END
  // ==========================================================


  // ==========================================================
  // PART 11 - HISTORY CREATION & RETENTION
  // ==========================================================

  private async createHistoryEntry(
    tx: any,
    data: {
      userId: string
      actorId?: string
      action: string
      beforeData: UserSnapshot
      afterData: UserSnapshot
      changedFields: string[]
    },
  ) {
    const latest =
      await tx.userHistory.findFirst({
        where: {
          userId: data.userId,
        },
        orderBy: {
          version: 'desc',
        },
        select: {
          version: true,
        },
      })

    const version =
      (latest?.version ?? 0) + 1

    await tx.userHistory.create({
      data: {
        userId: data.userId,
        version,
        actorId:
          data.actorId ?? null,
        action: data.action,
        beforeData:
          data.beforeData as object,
        afterData:
          data.afterData as object,
        changedFields:
          data.changedFields as object,
      },
    })

    await this.pruneHistory(
      tx,
      data.userId,
    )

    return version
  }

  private async pruneHistory(
    tx: any,
    userId: string,
  ) {
    const oldEntries =
      await tx.userHistory.findMany({
        where: {
          userId,
        },
        orderBy: {
          version: 'desc',
        },
        skip: USER_HISTORY_RETENTION,
        select: {
          id: true,
        },
      })

    if (oldEntries.length === 0) {
      return
    }

    await tx.userHistory.deleteMany({
      where: {
        id: {
          in: oldEntries.map(
            (entry: { id: string }) =>
              entry.id,
          ),
        },
      },
    })
  }

  // ==========================================================
  // PART 11 END
  // ==========================================================


  // ==========================================================
  // PART 12 - SUPER ADMIN PROTECTION
  // ==========================================================

  private async ensureAnotherActiveSuperAdmin(
    tx: any,
    excludedUserId: string,
  ) {
    const count =
      await tx.user.count({
        where: {
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          NOT: {
            id: excludedUserId,
          },
        },
      })

    if (count < 1) {
      throw new BadRequestException(
        'Cannot demote or disable the last active SUPER_ADMIN',
      )
    }
  }

  private async ensureValidSuperAdminRestore(
    tx: any,
    userId: string,
  ) {
    const user =
      await tx.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          role: true,
          status: true,
        },
      })

    if (!user) {
      throw new NotFoundException(
        'User not found',
      )
    }
  }

  // ==========================================================
  // PART 12 END
  // ==========================================================
}

// ============================================================
// PART 03 END
// ============================================================