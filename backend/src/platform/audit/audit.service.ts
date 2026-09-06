import { Injectable } from '@nestjs/common';

import { Prisma, AuditEvent } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type CreateAuditEventInput = {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  description?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    input: CreateAuditEventInput,
  ): Promise<AuditEvent> {
    return this.prisma.auditEvent.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        description: input.description ?? null,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async getUserActivity(
    userId: string,
    limit = 50,
  ) {
    return this.prisma.auditEvent.findMany({
      where: {
        actorId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 100),
    });
  }

  async getRecentActivity(limit = 50) {
    return this.prisma.auditEvent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 100),
    });
  }
}