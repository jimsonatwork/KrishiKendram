import { BadRequestException } from '@nestjs/common';
import { FinancialRecordType, UserRole } from '@prisma/client';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const transactionKey = String.fromCharCode(36) + 'transaction';
  const prisma: any = { farm: { findMany: jest.fn(), findFirst: jest.fn() }, farmFinancialRecord: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() } };
  prisma[transactionKey] = jest.fn();
  const authorization: any = { assertCan: jest.fn(), can: jest.fn() };
  const registry: any = { validateResourceField: jest.fn((_resource: string, _field: string, value: unknown) => ({ valid: true, value })) };
  const audit: any = { createInTransaction: jest.fn() };
  const tx: any = { farmFinancialRecord: prisma.farmFinancialRecord };
  let service: FinanceService;
  const farm = { id: 'farm-1', ownerId: 'farmer-1' };
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.can.mockResolvedValue(true);
    prisma[transactionKey].mockImplementation((callback: (tx: any) => Promise<unknown>) => callback(tx));
    registry.validateResourceField.mockImplementation((_resource: string, _field: string, value: unknown) => ({ valid: true, value }));
    prisma.farmFinancialRecord.create.mockResolvedValue({ id: 'record-1', type: 'EXPENSE', amount: 250 });
    prisma.farmFinancialRecord.update.mockResolvedValue({ id: 'record-1', deletedAt: new Date() });
    service = new FinanceService(prisma, authorization, registry, audit);
  });
  it('lists only farms with an explicit READ decision and skips inaccessible legacy owner rows', async () => {
    prisma.farm.findMany.mockResolvedValue([
      { id: 'farm-1', ownerId: 'farmer-1' },
      { id: 'farm-2', ownerId: 'farmer-1' },
    ]);
    authorization.can.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    prisma.farmFinancialRecord.findMany.mockResolvedValue([]);

    await expect(service.list('farmer-1', UserRole.FARMER)).resolves.toEqual([]);

    expect(authorization.can).toHaveBeenCalledTimes(2);
    expect(prisma.farmFinancialRecord.findMany).toHaveBeenCalledWith({
      where: { farmId: { in: ['farm-1'] }, deletedAt: null },
      include: { farm: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  });
  it('authorizes the farm before creating and audit-records an expense', async () => {
    prisma.farm.findFirst.mockResolvedValue(farm);
    await service.create('farmer-1', UserRole.FARMER, { farmId: 'farm-1', type: FinancialRecordType.EXPENSE, category: 'Fertilizer', amount: 250 });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ module: 'finance', resource: 'financialRecord', action: 'CREATE', farmId: 'farm-1' }));
    expect(prisma.farmFinancialRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ farmId: 'farm-1', createdBy: 'farmer-1', currency: 'INR', amount: 250 }) });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceType: 'financialRecord', action: 'CREATE' }));
  });
  it('rejects a missing farm without persistence', async () => {
    prisma.farm.findFirst.mockResolvedValue(null);
    await expect(service.create('farmer-1', UserRole.FARMER, { farmId: 'missing', type: FinancialRecordType.INCOME, category: 'Sale', amount: 100 })).rejects.toThrow('Farm not found.');
    expect(prisma.farmFinancialRecord.create).not.toHaveBeenCalled();
  });
  it('validates financial amounts through the central Registry', async () => {
    prisma.farm.findFirst.mockResolvedValue(farm);
    registry.validateResourceField.mockImplementation((_resource: string, field: string, value: unknown) => field === 'amount' ? { valid: false, errors: ['min'] } : { valid: true, value });
    await expect(service.create('farmer-1', UserRole.FARMER, { farmId: 'farm-1', type: FinancialRecordType.EXPENSE, category: 'Labour', amount: -1 })).rejects.toThrow(BadRequestException);
    expect(prisma.farmFinancialRecord.create).not.toHaveBeenCalled();
  });
  it('updates an authorized record and records audit history', async () => {
    prisma.farmFinancialRecord.findFirst.mockResolvedValue({ id: 'record-1', farmId: 'farm-1', farm });
    await service.update('farmer-1', UserRole.FARMER, 'record-1', { amount: 300, category: 'Labour' });
    expect(prisma.farmFinancialRecord.update).toHaveBeenCalledWith({ where: { id: 'record-1' }, data: { category: 'Labour', amount: 300 } });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'UPDATE', resourceType: 'financialRecord' }));
  });
});
