import { BadRequestException } from '@nestjs/common';
import { LivestockRecordType, UserRole } from '@prisma/client';
import { LivestockRecordsService } from './livestock-records.service';

describe('LivestockRecordsService', () => {
  const prisma: any = { livestock: { findFirst: jest.fn() }, resourceRelationship: { findFirst: jest.fn() }, livestockRecord: { findMany: jest.fn(), create: jest.fn() } }; const transactionKey = String.fromCharCode(36) + 'transaction'; prisma[transactionKey] = jest.fn();
  const authorization: any = { assertCan: jest.fn() };
  const registry: any = { validateResourceField: jest.fn((_r: string, _f: string, value: unknown) => ({ valid: true, value })) };
  const audit: any = { createInTransaction: jest.fn() };
  const tx: any = { farm: { findFirst: jest.fn() }, livestockRecord: prisma.livestockRecord, notification: { create: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) } };
  let service: LivestockRecordsService;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma[transactionKey].mockImplementation((callback: (tx: any) => Promise<unknown>) => callback(tx));
    tx.farm.findFirst.mockResolvedValue({ id: 'farm-1' });
    prisma.livestock.findFirst.mockResolvedValue({ id: 'animal-1', farmId: 'farm-1', farm: { id: 'farm-1', ownerId: 'farmer-1', deletedAt: null } });
    prisma.resourceRelationship.findFirst.mockResolvedValue({ userId: 'farmer-1' });
    prisma.livestockRecord.create.mockResolvedValue({ id: 'record-1', type: 'VACCINATION', description: 'FMD vaccination', recordedAt: new Date() });
    registry.validateResourceField.mockImplementation((_r: string, _f: string, value: unknown) => ({ valid: true, value }));
    service = new LivestockRecordsService(prisma, authorization, registry, audit);
  });
  it('authorizes the animal before adding a permanent vaccination record', async () => {
    await service.create('farmer-1', UserRole.FARMER, 'animal-1', { type: LivestockRecordType.VACCINATION, description: 'FMD vaccination' });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ module: 'livestock', resource: 'livestockRecord', action: 'CREATE', farmId: 'farm-1', ownerId: 'farmer-1' }));
    expect(prisma.livestockRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ livestockId: 'animal-1', createdBy: 'farmer-1', description: 'FMD vaccination' }) });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE', resourceType: 'livestockRecord' }));
  });
  it('creates a follow-up notification with a dated health record', async () => {
    await service.create('farmer-1', UserRole.FARMER, 'animal-1', { type: LivestockRecordType.VACCINATION, description: 'Booster dose', nextDueAt: '2026-11-01T10:00:00.000Z' });
    expect(tx.notification.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'farmer-1', type: 'LIVESTOCK_FOLLOW_UP', severity: 'INFO', source: 'livestock', dedupeKey: 'livestock-follow-up:record-1', href: '/app/livestock' }), skipDuplicates: true });
  });
  it('does not append health or production records to livestock under an archived farm', async () => {
    prisma.livestock.findFirst.mockResolvedValueOnce({
      id: 'animal-1', farmId: 'farm-1',
      farm: { id: 'farm-1', ownerId: 'farmer-1', deletedAt: new Date('2026-10-01T00:00:00.000Z') },
    });

    await expect(service.create('farmer-1', UserRole.FARMER, 'animal-1', {
      type: LivestockRecordType.HEALTH, description: 'Check-up',
    })).rejects.toThrow('Farm not found or archived');

    expect(prisma.livestockRecord.create).not.toHaveBeenCalled();
  });

  it('uses the central Registry to reject invalid record descriptions', async () => {
    registry.validateResourceField.mockImplementation((_r: string, field: string) => field === 'description' ? { valid: false, errors: ['required'] } : { valid: true, value: 'x' });
    await expect(service.create('farmer-1', UserRole.FARMER, 'animal-1', { type: LivestockRecordType.HEALTH, description: '' })).rejects.toThrow(BadRequestException);
    expect(prisma.livestockRecord.create).not.toHaveBeenCalled();
  });
});
