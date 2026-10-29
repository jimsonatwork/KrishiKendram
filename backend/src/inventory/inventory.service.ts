import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { RegistryService } from '../platform/registry/registry.service';
import { AuditService } from '../platform/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
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
      // A user's legacy ownerId list can contain farms whose temporal
      // ownership relationship has ended. Filter inaccessible farms rather
      // than failing the entire inventory collection with a 403.
      const allowed = await this.authorization.can({
        user: { userId, role },
        module: 'inventory',
        resource: 'inventoryItem',
        action: AuthorizationAction.READ,
        farmId: farm.id,
        ownerId: farm.ownerId,
      });
      if (allowed) allowedFarmIds.push(farm.id);
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
      if (before > item.reorderLevel && after <= item.reorderLevel) await NotificationsService.createInTransaction(tx, { userId: context.farm.ownerId, type: 'LOW_STOCK', title: 'Inventory reorder alert', message: item.name + ' has reached ' + after + ' ' + item.unit + '.', href: '/app/marketplace?workspace=inventory', severity: after <= 0 ? 'CRITICAL' : 'WARNING', source: 'inventory', dedupeKey: 'inventory-low-stock:' + id + ':' + transaction.id });
      return { item: { id, quantityOnHand: after, unit: item.unit }, transaction };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /** Resolve a seller-owned inventory item for a Marketplace listing without exposing Inventory persistence to Marketplace. */
  async getMarketplaceListingSource(userId: string, role: UserRole, itemId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, deletedAt: null },
      select: { id: true, farmId: true, name: true, quantityOnHand: true, unit: true, farm: { select: { ownerId: true } } },
    });
    if (!item || item.farm.ownerId !== userId) throw new NotFoundException('Marketplace resource not found.');
    await this.assertCan(userId, role, AuthorizationAction.READ, item.farmId, item.farm.ownerId, item.id);
    return { id: item.id, ownerId: item.farm.ownerId, quantityOnHand: Number(item.quantityOnHand), name: item.name, unit: item.unit };
  }

  /**
   * Internal domain operation for a Marketplace sale. The caller supplies its
   * active Prisma transaction so stock, order state and audit commit together,
   * while Inventory retains ownership of its stock ledger and low-stock rules.
   */
  async decrementForMarketplaceSale(
    tx: Prisma.TransactionClient,
    input: { itemId: string; sellerId: string; actorId: string; role: UserRole; orderId: string; quantity: number },
  ) {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new BadRequestException('Marketplace stock quantity must be positive.');
    const item = await tx.inventoryItem.findFirst({
      where: { id: input.itemId, deletedAt: null },
      select: { id: true, farmId: true, name: true, quantityOnHand: true, reorderLevel: true, unit: true, farm: { select: { ownerId: true } } },
    });
    if (!item || item.farm.ownerId !== input.sellerId) throw new BadRequestException('The linked inventory item is unavailable or no longer owned by this seller.');
    await this.assertCan(input.actorId, input.role, AuthorizationAction.UPDATE, item.farmId, item.farm.ownerId, item.id);
    const before = Number(item.quantityOnHand);
    if (before < input.quantity) throw new BadRequestException('Insufficient inventory stock to complete this Marketplace order.');
    const changed = await tx.inventoryItem.updateMany({
      where: { id: item.id, deletedAt: null, quantityOnHand: { equals: before, gte: input.quantity } },
      data: { quantityOnHand: { decrement: input.quantity } },
    });
    if (changed.count !== 1) throw new BadRequestException('Inventory changed concurrently. Refresh and retry order completion.');
    const after = before - input.quantity;
    const transaction = await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id, actorId: input.actorId, type: InventoryTransactionType.STOCK_OUT,
        quantity: input.quantity, quantityBefore: before, quantityAfter: after,
        reference: 'marketplace-order:' + input.orderId, notes: 'Marketplace sale order ' + input.orderId,
      },
    });
    await this.audit.createInTransaction(tx, {
      actorId: input.actorId, action: 'STOCK_OUT', resourceType: 'inventoryItem', resourceId: item.id,
      description: 'Inventory stock decremented by completed Marketplace sale',
      metadata: { orderId: input.orderId, quantity: input.quantity, quantityBefore: before, quantityAfter: after, unit: item.unit },
    });
    if (before > item.reorderLevel && after <= item.reorderLevel) {
      await NotificationsService.createInTransaction(tx, {
        userId: item.farm.ownerId, type: 'LOW_STOCK', title: 'Marketplace sale reached reorder level',
        message: item.name + ' has ' + after + ' ' + item.unit + ' remaining after order ' + input.orderId + '.',
        href: '/app/inventory', severity: after <= 0 ? 'CRITICAL' : 'WARNING', source: 'inventory',
        dedupeKey: 'marketplace-inventory-low-stock:' + input.orderId + ':' + item.id,
      });
    }
    return { itemId: item.id, quantityBefore: before, quantityAfter: after, transaction };
  }

  async history(userId: string, role: UserRole, id: string) {
    const context = await this.itemContext(id);
    await this.assertCan(userId, role, AuthorizationAction.READ, context.farmId, context.farm.ownerId, id);
    return this.prisma.inventoryTransaction.findMany({ where: { inventoryItemId: id }, include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }
}
