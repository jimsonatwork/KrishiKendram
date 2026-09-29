import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { RegistryService } from '../platform/registry/registry.service';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { AuditService } from '../platform/audit/audit.service';
import { CreateLivestockDto } from './dto/create-livestock.dto';
import { UpdateLivestockDto } from './dto/update-livestock.dto';

@Injectable()
export class LivestockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly registry: RegistryService,
    private readonly relationships: ResourceRelationshipService,
    private readonly audit: AuditService,
  ) {}

  private async context(id: string, includeArchived = false) {
    const item = await this.prisma.livestock.findFirst({
      where: { id, ...(includeArchived ? {} : { deletedAt: null }) },
      select: {
        id: true,
        farmId: true,
        deletedAt: true,
        farm: { select: { id: true, ownerId: true } },
      },
    });
    if (!item) throw new NotFoundException('Livestock not found.');
    return item;
  }

  private async owner(id: string, fallback: string) {
    const relationship = await this.prisma.resourceRelationship.findFirst({
      where: {
        resourceType: 'livestock',
        resourceId: id,
        relationshipType: 'OWNER',
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true },
    });
    return relationship?.userId ?? fallback;
  }

  private validate(input: Partial<CreateLivestockDto | UpdateLivestockDto>) {
    const data: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(input)) {
      if (value === undefined) continue;
      const result = this.registry.validateResourceField('livestock', field, value);
      if (!result.valid) {
        throw new BadRequestException({
          message: `Invalid livestock ${field}.`,
          errors: result.errors,
        });
      }
      data[field] = result.value;
    }
    if (data.count === undefined) data.count = 1;
    if (data.status === undefined) data.status = 'ACTIVE';
    return data;
  }

  private async assert(
    userId: string,
    role: UserRole,
    action: AuthorizationAction,
    item: { id: string; farmId: string; farm: { ownerId: string } },
  ) {
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'livestock',
      resource: 'livestock',
      action,
      resourceId: item.id,
      farmId: item.farmId,
      ownerId: await this.owner(item.id, item.farm.ownerId),
    });
  }
  async create(userId: string, role: UserRole, dto: CreateLivestockDto) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: dto.farmId },
      select: { id: true, ownerId: true },
    });
    if (!farm) throw new NotFoundException('Farm not found.');

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'livestock',
      resource: 'livestock',
      action: AuthorizationAction.CREATE,
      farmId: farm.id,
      ownerId: farm.ownerId,
    });

    const data = this.validate(dto);
    delete data.farmId;

    return this.prisma.$transaction(async (tx) => {
      const livestock = await tx.livestock.create({
        data: {
          farmId: farm.id,
          ...(data as any),
          acquiredAt: dto.acquiredAt ? new Date(dto.acquiredAt) : undefined,
        },
      });
      await this.relationships.createOwnerRelationship(
        tx, 'livestock', livestock.id, farm.ownerId, livestock.createdAt,
      );
      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'CREATE',
        resourceType: 'livestock',
        resourceId: livestock.id,
        description: 'Livestock created.',
      });
      return livestock;
    });
  }

  async findMine(userId: string, role: UserRole) {
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'livestock',
      resource: 'livestock',
      action: AuthorizationAction.READ,
      ownerId: userId,
    });
    return this.prisma.livestock.findMany({
      where: { deletedAt: null, farm: { ownerId: userId } },
      include: { farm: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, role: UserRole, id: string) {
    const item = await this.context(id);
    await this.assert(userId, role, AuthorizationAction.READ, item);
    return this.prisma.livestock.findFirst({
      where: { id, deletedAt: null },
      include: { farm: true },
    });
  }
  async relationshipHistory(userId: string, role: UserRole, id: string) {
    const item = await this.context(id);
    await this.assert(userId, role, AuthorizationAction.READ, item);
    return this.relationships.listResourceRelationshipHistory('livestock', id);
  }

  async update(
    userId: string,
    role: UserRole,
    id: string,
    dto: UpdateLivestockDto,
  ) {
    const item = await this.context(id);
    await this.assert(userId, role, AuthorizationAction.UPDATE, item);

    const data = this.validate(dto);
    delete data.farmId;
    delete data.acquiredAt;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.livestock.update({
        where: { id },
        data: {
          ...(data as any),
          ...(dto.acquiredAt !== undefined
            ? { acquiredAt: new Date(dto.acquiredAt) }
            : {}),
        },
      });
      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'UPDATE',
        resourceType: 'livestock',
        resourceId: id,
        description: 'Livestock updated.',
      });
      return updated;
    });
  }

  async archive(userId: string, role: UserRole, id: string) {
    const item = await this.context(id);
    await this.assert(userId, role, AuthorizationAction.DELETE, item);

    return this.prisma.$transaction(async (tx) => {
      const endedAt = new Date();
      await this.relationships.terminateResourceRelationships(
        tx, 'livestock', id, endedAt, 'Livestock archived',
      );
      const archived = await tx.livestock.update({
        where: { id },
        data: { deletedAt: endedAt },
      });
      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'DELETE',
        resourceType: 'livestock',
        resourceId: id,
        description: 'Livestock archived.',
      });
      return archived;
    });
  }

  async restore(userId: string, role: UserRole, id: string) {
    const item = await this.context(id, true);
    if (!item.deletedAt) throw new BadRequestException('Livestock is already active.');

    const ownerId = await this.owner(id, item.farm.ownerId);
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'livestock',
      resource: 'livestock',
      action: AuthorizationAction.RESTORE,
      resourceId: id,
      farmId: item.farmId,
      ownerId,
    });

    return this.prisma.$transaction(async (tx) => {
      const restored = await tx.livestock.update({
        where: { id },
        data: { deletedAt: null },
      });
      await this.relationships.createOwnerRelationship(
        tx, 'livestock', id, ownerId, new Date(),
      );
      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'RESTORE',
        resourceType: 'livestock',
        resourceId: id,
        description: 'Livestock restored.',
      });
      return restored;
    });
  }
}
