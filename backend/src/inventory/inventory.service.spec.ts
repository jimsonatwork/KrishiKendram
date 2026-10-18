import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionType, UserRole } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const prisma: any = {
    farm: { findMany: jest.fn(), findFirst: jest.fn() },
    inventoryItem: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    inventoryTransaction: { findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const authorization: any = { assertCan: jest.fn() };
  const registry: any = { validateResourceField: jest.fn((_resource: string, _field: string, value: unknown) => ({ valid: true, value })) };
  const audit: any = { createInTransaction: jest.fn() };
  let service: InventoryService;
  const farm = { id: 'farm-1', ownerId: 'farmer-1' };
  const item = { id: 'item-1', farmId: 'farm-1', name: 'Paddy seed', category: 'SEED', unit: 'kg', quantityOnHand: 10, reorderLevel: 2, farm };
  const tx: any = { inventoryItem: prisma.inventoryItem, inventoryTransaction: prisma.inventoryTransaction, notification: { create: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) } };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => Promise<unknown>) => callback(tx));
    registry.validateResourceField.mockImplementation((_resource: string, _field: string, value: unknown) => ({ valid: true, value }));
    prisma.inventoryItem.create.mockResolvedValue({ ...item, quantityOnHand: 10 });
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 'movement-1' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.inventoryItem.update.mockResolvedValue({ ...item, deletedAt: new Date() });
    service = new InventoryService(prisma, authorization, registry, audit);
  });

  it('authorizes farm access before validating and creating an item', async () => {
    prisma.farm.findFirst.mockResolvedValue(farm);
    await service.create('farmer-1', UserRole.FARMER, { farmId: 'farm-1', name: ' Paddy seed ', category: 'SEED', unit: 'kg', initialQuantity: 10, reorderLevel: 2 });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ module: 'inventory', resource: 'inventoryItem', action: 'CREATE', farmId: 'farm-1' }));
    expect(registry.validateResourceField).toHaveBeenCalledWith('inventoryItem', 'name', ' Paddy seed ');
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: InventoryTransactionType.STOCK_IN, quantityBefore: 0, quantityAfter: 10 }) }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceType: 'inventoryItem', action: 'CREATE' }));
  });

  it('records stock-out atomically with before/after balance and audit', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValueOnce({ id: 'item-1', farmId: 'farm-1', farm }).mockResolvedValueOnce({ id: 'item-1', name: 'Paddy seed', quantityOnHand: 10, reorderLevel: 2, unit: 'kg' });
    await service.recordTransaction('farmer-1', UserRole.FARMER, 'item-1', { type: InventoryTransactionType.STOCK_OUT, quantity: 3 });
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({ where: { id: 'item-1', deletedAt: null, quantityOnHand: 10 }, data: { quantityOnHand: 7 } });
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ quantityBefore: 10, quantityAfter: 7, quantity: 3 }) });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'STOCK_OUT' }));
  });

  it('prevents stock-out beyond the available quantity', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValueOnce({ id: 'item-1', farmId: 'farm-1', farm }).mockResolvedValueOnce({ id: 'item-1', name: 'Paddy seed', quantityOnHand: 2, reorderLevel: 2, unit: 'kg' });
    await expect(service.recordTransaction('farmer-1', UserRole.FARMER, 'item-1', { type: InventoryTransactionType.STOCK_OUT, quantity: 3 })).rejects.toThrow(BadRequestException);
    expect(prisma.inventoryItem.updateMany).not.toHaveBeenCalled();
    expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects a concurrent balance change rather than losing a stock update', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValueOnce({ id: 'item-1', farmId: 'farm-1', farm }).mockResolvedValueOnce({ id: 'item-1', name: 'Paddy seed', quantityOnHand: 10, reorderLevel: 2, unit: 'kg' });
    prisma.inventoryItem.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.recordTransaction('farmer-1', UserRole.FARMER, 'item-1', { type: InventoryTransactionType.STOCK_IN, quantity: 2 })).rejects.toThrow('changed concurrently');
    expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
  });

  it('notifies the farm owner when stock crosses below the reorder level', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValueOnce({ id: 'item-1', farmId: 'farm-1', farm }).mockResolvedValueOnce({ id: 'item-1', name: 'Paddy seed', quantityOnHand: 5, reorderLevel: 2, unit: 'kg' });
    await service.recordTransaction('farmer-1', UserRole.FARMER, 'item-1', { type: InventoryTransactionType.STOCK_OUT, quantity: 3 });
    expect(tx.notification.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'farmer-1', type: 'LOW_STOCK', severity: 'WARNING', source: 'inventory', dedupeKey: expect.stringContaining('inventory-low-stock:'), href: '/app/marketplace?workspace=inventory' }), skipDuplicates: true });
  });

  it('does not archive an item with remaining stock', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValueOnce({ id: 'item-1', farmId: 'farm-1', farm }).mockResolvedValueOnce({ quantityOnHand: 10 });
    await expect(service.archive('farmer-1', UserRole.FARMER, 'item-1')).rejects.toThrow('Stock must be used or adjusted to zero');
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
  });
});
