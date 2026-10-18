import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { RegistryService } from '../platform/registry/registry.service';
import { AuditService } from '../platform/audit/audit.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly registry: RegistryService, private readonly audit: AuditService) {}

  private validate(field: string, value: unknown) {
    const result = this.registry.validateResourceField('inventoryItem', field, value);
    if (!result.valid) throw new BadRequestException({ message: 'Invalid inventory ' + field + '.', errors: result.errors });
    return result.value;
  }

  private async itemContext(id: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, deletedAt: null }, select: { id: true, farmId: true, farm: { select: { id: true, ownerId: true } } } });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return item;
  }

  private assertCan(userId: string, role: UserRole, action: AuthorizationAction, farmId: string, ownerId: string, resourceId?: string) {
    return this.authorization.assertCan({ user: { userId, role }, module: 'inventory', resource: 'inventoryItem', action, farmId, ownerId, resourceId });
  }

  async list(userId: string, role: UserRole) {
    const farms = await this.prisma.farm.findMany({ where: { deletedAt: null, ownerId: userId }, select: { id: true, ownerId: true } });
    const allowedFarmIds: string[] = [];
    for (const farm of farms) {
      await this.assertCan(userId, role, AuthorizationAction.READ, farm.id, farm.ownerId);
      allowedFarmIds.push(farm.id);
    }
    if (!allowedFarmIds.length) return [];
    return this.prisma.inventoryItem.findMany({ where: { farmId: { in: allowedFarmIds }, deletedAt: null }, include: { farm: { select: { id: true, name: true } } }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  async create(userId: string, role: UserRole, dto: CreateInventoryItemDto) {
    const farm = await this.prisma.farm.findFirst({ where: { id: dto.farmId, deletedAt: null }, select: { id: true, ownerId: true } });
    if (!farm) throw new NotFoundException('Farm not found.');
    await this.assertCan(userId, role, AuthorizationAction.CREATE, farm.id, farm.ownerId);
    const name = this.validate('name', dto.name) as string;
    const category = this.validate('category', dto.category) as string;
    const unit = this.validate('unit', dto.unit) as string;
    const reorderLevel = this.validate('reorderLevel', dto.reorderLevel ?? 0) as number;
    const initialQuantity = this.validate('quantityOnHand', dto.initialQuantity ?? 0) as number;
    const supplier = dto.supplier === undefined ? undefined : this.validate('supplier', dto.supplier) as string;
    const notes = dto.notes === undefined ? undefined : this.validate('notes', dto.notes) as string;
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({ data: { farmId: farm.id, name, category, unit, quantityOnHand: initialQuantity, reorderLevel, supplier, notes } });
      if (initialQuantity > 0) await tx.inventoryTransaction.create({ data: { inventoryItemId: item.id, actorId: userId, type: InventoryTransactionType.STOCK_IN, quantity: initialQuantity, quantityBefore: 0, quantityAfter: initialQuantity, notes: 'Opening stock' } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE', resourceType: 'inventoryItem', resourceId: item.id, description: 'Inventory item created', metadata: { farmId: farm.id, initialQuantity } });
      return item;
    });
  }

  async findOne(userId: string, role: UserRole, id: string) {
    const context = await this.itemContext(id);
    await this.assertCan(userId, role, AuthorizationAction.READ, context.farmId, context.farm.ownerId, id);
    return this.prisma.inventoryItem.findFirst({ where: { id, deletedAt: null }, include: { farm: { select: { id: true, name: true } } } });
  }

  async update(userId: string, role: UserRole, id: string, dto: UpdateInventoryItemDto) {
    const context = await this.itemContext(id);
    await this.assertCan(userId, role, AuthorizationAction.UPDATE, context.farmId, context.farm.ownerId, id);
    const data: Record<string, unknown> = {};
    for (const field of ['name', 'category', 'unit', 'reorderLevel', 'supplier', 'notes'] as const) {
      if (dto[field] !== undefined) data[field] = this.validate(field === 'reorderLevel' ? field : field, dto[field]);
    }
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({ where: { id }, data });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPDATE', resourceType: 'inventoryItem', resourceId: id, description: 'Inventory item updated', metadata: { fields: Object.keys(data) } });
      return item;
    });
  }

  async archive(userId: string, role: UserRole, id: string) {
    const context = await this.itemContext(id);
    await this.assertCan(userId, role, AuthorizationAction.DELETE, context.farmId, context.farm.ownerId, id);
    const outstanding = await this.prisma.inventoryItem.findFirst({ where: { id, deletedAt: null }, select: { quantityOnHand: true } });
    if (outstanding && outstanding.quantityOnHand > 0) throw new BadRequestException('Stock must be used or adjusted to zero before archiving this item.');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'DELETE', resourceType: 'inventoryItem', resourceId: id, description: 'Inventory item archived' });
      return item;
    });
  }

  async recordTransaction(userId: string, role: UserRole, id: string, dto: CreateInventoryTransactionDto) {
    const context = await this.itemContext(id);
    await this.assertCan(userId, role, AuthorizationAction.UPDATE, context.farmId, context.farm.ownerId, id);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true, quantityOnHand: true, reorderLevel: true, unit: true } });
      if (!item) throw new NotFoundException('Inventory item not found.');
      const before = item.quantityOnHand;
      const after = dto.type === InventoryTransactionType.STOCK_IN ? before + dto.quantity : dto.type === InventoryTransactionType.STOCK_OUT ? before - dto.quantity : dto.quantity;
      if (dto.type === InventoryTransactionType.STOCK_OUT && dto.quantity > before) throw new BadRequestException('Stock-out quantity exceeds current stock.');
      if (!Number.isFinite(after) || after < 0) throw new BadRequestException('Inventory quantity cannot be negative.');
      const changed = await tx.inventoryItem.updateMany({ where: { id, deletedAt: null, quantityOnHand: before }, data: { quantityOnHand: after } });
      if (changed.count !== 1) throw new BadRequestException('Inventory changed concurrently. Refresh and retry the transaction.');
      const transaction = await tx.inventoryTransaction.create({ data: { inventoryItemId: id, actorId: userId, type: dto.type, quantity: dto.quantity, quantityBefore: before, quantityAfter: after, unitCost: dto.unitCost, reference: dto.reference?.trim() || null, notes: dto.notes?.trim() || null } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: dto.type, resourceType: 'inventoryItem', resourceId: id, description: 'Inventory stock transaction recorded', metadata: { transactionId: transaction.id, quantityBefore: before, quantityAfter: after, unit: item.unit } });
      if (before > item.reorderLevel && after <= item.reorderLevel) await tx.notification.create({ data: { userId: context.farm.ownerId, type: 'LOW_STOCK', title: 'Inventory reorder alert', message: item.name + ' has reached ' + after + ' ' + item.unit + '.', href: '/app/marketplace?workspace=inventory' } });
      return { item: { id, quantityOnHand: after, unit: item.unit }, transaction };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async history(userId: string, role: UserRole, id: string) {
    const context = await this.itemContext(id);
    await this.assertCan(userId, role, AuthorizationAction.READ, context.farmId, context.farm.ownerId, id);
    return this.prisma.inventoryTransaction.findMany({ where: { inventoryItemId: id }, include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }
}
