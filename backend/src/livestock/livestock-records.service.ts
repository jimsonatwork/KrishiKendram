import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { RegistryService } from '../platform/registry/registry.service';
import { AuditService } from '../platform/audit/audit.service';
import { assertFarmActive } from '../farms/farm-asset-active.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLivestockRecordDto } from './dto/create-livestock-record.dto';

@Injectable()
export class LivestockRecordsService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly registry: RegistryService, private readonly audit: AuditService) {}
  private async context(id: string) {
    const animal = await this.prisma.livestock.findFirst({ where: { id, deletedAt: null }, select: { id: true, farmId: true, farm: { select: { id: true, ownerId: true, deletedAt: true } } } });
    if (!animal) throw new NotFoundException('Livestock not found.');
    const relationship = await this.prisma.resourceRelationship.findFirst({ where: { resourceType: 'livestock', resourceId: id, relationshipType: 'OWNER', endedAt: null }, orderBy: [{ validFrom: 'desc' }, { id: 'desc' }], select: { userId: true } });
    return { ...animal, ownerId: relationship?.userId ?? animal.farm.ownerId };
  }
  private async authorize(userId: string, role: UserRole, action: AuthorizationAction, animal: Awaited<ReturnType<LivestockRecordsService['context']>>) {
    await this.authorization.assertCan({ user: { userId, role }, module: 'livestock', resource: 'livestockRecord', action, resourceId: animal.id, farmId: animal.farmId, ownerId: animal.ownerId });
  }
  async list(userId: string, role: UserRole, livestockId: string) {
    const animal = await this.context(livestockId);
    await this.authorize(userId, role, AuthorizationAction.READ, animal);
    return this.prisma.livestockRecord.findMany({ where: { livestockId }, include: { creator: { select: { id: true, name: true } } }, orderBy: { recordedAt: 'desc' } });
  }
  async create(userId: string, role: UserRole, livestockId: string, dto: CreateLivestockRecordDto) {
    const animal = await this.context(livestockId);
    if (animal.farm.deletedAt) throw new NotFoundException('Farm not found or archived.');
    await this.authorize(userId, role, AuthorizationAction.CREATE, animal);
    const data: Record<string, unknown> = {};
    for (const field of ['type', 'description', 'quantity', 'unit', 'reference', 'notes'] as const) {
      if (dto[field] === undefined) continue;
      const result = this.registry.validateResourceField('livestockRecord', field, dto[field]);
      if (!result.valid) throw new BadRequestException({ message: 'Invalid livestock record ' + field + '.', errors: result.errors });
      data[field] = result.value;
    }
    return this.prisma.$transaction(async tx => {
      await assertFarmActive(tx, animal.farmId);
      const record = await tx.livestockRecord.create({ data: { livestockId, createdBy: userId, type: dto.type, description: data.description as string, quantity: data.quantity as number | undefined, unit: data.unit as string | undefined, reference: data.reference as string | undefined, notes: data.notes as string | undefined, recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(), nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE', resourceType: 'livestockRecord', resourceId: record.id, description: 'Livestock operational record added', metadata: { livestockId, type: dto.type, recordedAt: record.recordedAt.toISOString() } });
      if (dto.nextDueAt) await NotificationsService.createInTransaction(tx, { userId: animal.ownerId, type: 'LIVESTOCK_FOLLOW_UP', title: 'Livestock follow-up scheduled', message: dto.description + ' · due ' + new Date(dto.nextDueAt).toLocaleDateString(), href: '/app/livestock', severity: 'INFO', source: 'livestock', dedupeKey: 'livestock-follow-up:' + record.id });
      return record;
    });
  }
}
