import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FinancialRecordType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { RegistryService } from '../platform/registry/registry.service';
import { AuditService } from '../platform/audit/audit.service';
import { CreateFinancialRecordDto } from './dto/create-financial-record.dto';
import { UpdateFinancialRecordDto } from './dto/update-financial-record.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly registry: RegistryService, private readonly audit: AuditService) {}
  private validate(field: string, value: unknown) {
    const result = this.registry.validateResourceField('financialRecord', field, value);
    if (!result.valid) throw new BadRequestException({ message: 'Invalid financial record ' + field + '.', errors: result.errors });
    return result.value;
  }
  private async context(id: string) {
    const record = await this.prisma.farmFinancialRecord.findFirst({ where: { id, deletedAt: null }, select: { id: true, farmId: true, farm: { select: { id: true, ownerId: true } } } });
    if (!record) throw new NotFoundException('Financial record not found.');
    return record;
  }
  private assertCan(userId: string, role: UserRole, action: AuthorizationAction, farmId: string, ownerId: string, resourceId?: string) {
    return this.authorization.assertCan({ user: { userId, role }, module: 'finance', resource: 'financialRecord', action, farmId, ownerId, resourceId });
  }
  async list(userId: string, role: UserRole) {
    const farms = await this.prisma.farm.findMany({ where: { ownerId: userId, deletedAt: null }, select: { id: true, ownerId: true } });
    const decisions = await Promise.all(farms.map(async (farm) => ({
      farmId: farm.id,
      allowed: await this.authorization.can({
        user: { userId, role }, module: 'finance', resource: 'financialRecord',
        action: AuthorizationAction.READ, farmId: farm.id, ownerId: farm.ownerId,
      }),
    })));
    const farmIds = decisions.filter((decision) => decision.allowed).map((decision) => decision.farmId);
    if (!farmIds.length) return [];
    return this.prisma.farmFinancialRecord.findMany({ where: { farmId: { in: farmIds }, deletedAt: null }, include: { farm: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } }, orderBy: { occurredAt: 'desc' } });
  }
  async create(userId: string, role: UserRole, dto: CreateFinancialRecordDto) {
    const farm = await this.prisma.farm.findFirst({ where: { id: dto.farmId, deletedAt: null }, select: { id: true, ownerId: true } });
    if (!farm) throw new NotFoundException('Farm not found.');
    await this.assertCan(userId, role, AuthorizationAction.CREATE, farm.id, farm.ownerId);
    const category = this.validate('category', dto.category) as string;
    const amount = this.validate('amount', dto.amount) as number;
    const currency = this.validate('currency', (dto.currency || 'INR').toUpperCase()) as string;
    const notes = dto.notes === undefined ? undefined : this.validate('notes', dto.notes) as string;
    const reference = dto.reference === undefined ? undefined : this.validate('reference', dto.reference) as string;
    return this.prisma.$transaction(async tx => {
      const record = await tx.farmFinancialRecord.create({ data: { farmId: farm.id, type: dto.type, category, amount, currency, occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(), reference, notes, createdBy: userId } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE', resourceType: 'financialRecord', resourceId: record.id, description: 'Farm financial record created', metadata: { farmId: farm.id, type: dto.type, amount, currency } });
      return record;
    });
  }
  async update(userId: string, role: UserRole, id: string, dto: UpdateFinancialRecordDto) {
    const context = await this.context(id);
    await this.assertCan(userId, role, AuthorizationAction.UPDATE, context.farmId, context.farm.ownerId, id);
    const data: Record<string, unknown> = {};
    for (const field of ['category', 'amount', 'currency', 'reference', 'notes'] as const) if (dto[field] !== undefined) data[field] = this.validate(field, field === 'currency' ? String(dto[field]).toUpperCase() : dto[field]);
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.occurredAt !== undefined) data.occurredAt = new Date(dto.occurredAt);
    return this.prisma.$transaction(async tx => {
      const record = await tx.farmFinancialRecord.update({ where: { id }, data });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPDATE', resourceType: 'financialRecord', resourceId: id, description: 'Farm financial record updated', metadata: { fields: Object.keys(data) } });
      return record;
    });
  }
  async archive(userId: string, role: UserRole, id: string) {
    const context = await this.context(id);
    await this.assertCan(userId, role, AuthorizationAction.DELETE, context.farmId, context.farm.ownerId, id);
    return this.prisma.$transaction(async tx => {
      const record = await tx.farmFinancialRecord.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'DELETE', resourceType: 'financialRecord', resourceId: id, description: 'Farm financial record archived' });
      return record;
    });
  }
}
