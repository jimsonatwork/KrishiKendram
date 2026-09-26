import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ResourceTransferRequestService } from './transfer-request.service';

describe('ResourceTransferRequestService', () => {
  const relationships = { createOwnerRelationship: jest.fn(), transferOwnerRelationship: jest.fn() } as any;
  const tx = {
    resourceTransferRequest: { updateMany: jest.fn(), update: jest.fn() },
    resourceRelationship: { findFirst: jest.fn() },
    farmAsset: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    resourceMovement: { findFirst: jest.fn(), create: jest.fn() },
    resourceLineage: { create: jest.fn() },
    farm: { update: jest.fn() },
  } as any;
  const prisma = {
    resourceRelationship: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    resourceTransferRequest: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  let service: ResourceTransferRequestService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResourceTransferRequestService(prisma, relationships);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.resourceTransferRequest.updateMany.mockResolvedValue({ count: 1 });
    tx.resourceTransferRequest.update.mockResolvedValue({ id: 'request-1', status: 'COMPLETED' });
    tx.resourceRelationship.findFirst.mockResolvedValue({ id: 'owner-rel', userId: 'jim' });
    tx.resourceMovement.findFirst.mockResolvedValue(null);
    tx.resourceMovement.create.mockResolvedValue({ id: 'movement-1' });
    tx.resourceLineage.create.mockResolvedValue({ id: 'lineage-1' });
    relationships.createOwnerRelationship.mockResolvedValue({ id: 'target-owner-rel' });
    relationships.transferOwnerRelationship.mockResolvedValue({ id: 'transfer-movement' });
  });

  it('creates a pending partial farm-asset transfer request', async () => {
    prisma.resourceRelationship.findFirst.mockResolvedValue({ userId: 'jim' });
    prisma.user.findUnique.mockResolvedValue({ id: 'cto', status: 'ACTIVE' });
    prisma.resourceTransferRequest.create.mockResolvedValue({ id: 'request-1', quantity: 5 });
    jest.spyOn<any, any>(service, 'nextRequestNumber').mockResolvedValue('TR-20260926-123456');

    const result = await service.create({
      resourceType: 'farmAsset', resourceId: 'asset-1', destinationUserId: 'cto',
      quantity: 5, unit: 'head', reason: 'Transfer five hens',
    }, 'jim', UserRole.FARMER);

    expect(prisma.resourceTransferRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceType: 'farmAsset', resourceId: 'asset-1', sourceUserId: 'jim',
        destinationUserId: 'cto', quantity: 5, unit: 'head', status: 'PENDING',
      }),
    });
    expect(result).toEqual({ id: 'request-1', quantity: 5 });
  });

  it('atomically splits and transfers five of ten hens after acceptance', async () => {
    prisma.resourceTransferRequest.findUnique.mockResolvedValue({
      id: 'request-1', resourceType: 'farmAsset', resourceId: 'asset-1',
      sourceUserId: 'jim', destinationUserId: 'cto', quantity: 5, unit: 'head',
      status: 'PENDING', effectiveAt: null, expiresAt: null,
      reason: 'Transfer five hens', transactionId: 'TX-1',
    });
    tx.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1', farmId: 'farm-1', type: 'LIVESTOCK', name: 'Hens',
      quantity: 10, unit: 'head', metadata: { breed: 'mixed' },
    });
    tx.farmAsset.create.mockResolvedValue({
      id: 'asset-2', farmId: 'farm-1', type: 'LIVESTOCK', quantity: 5, unit: 'head',
    });

    const result = await service.accept('request-1', 'cto');

    expect(tx.farmAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ farmId: 'farm-1', type: 'LIVESTOCK', quantity: 5, unit: 'head' }),
    });
    expect(tx.farmAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' }, data: { quantity: 5 },
    });
    expect(tx.resourceMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceType: 'farmAsset', resourceId: 'asset-2', movementType: 'SPLIT',
        sourceResourceId: 'asset-1', destinationResourceId: 'asset-2', quantity: 5, unit: 'head',
      }),
    });
    expect(tx.resourceLineage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceResourceId: 'asset-1', targetResourceId: 'asset-2',
        lineageType: 'SPLIT_FROM', quantity: 5,
      }),
    });
    expect(relationships.transferOwnerRelationship).toHaveBeenCalledWith(
      tx, 'farmAsset', 'asset-2', 'jim', 'cto', expect.any(Date), 'Transfer five hens', 'TX-1',
    );
    expect(result).toEqual({ id: 'request-1', status: 'COMPLETED' });
  });

  it('rejects a partial transfer equal to the full source quantity', async () => {
    prisma.resourceTransferRequest.findUnique.mockResolvedValue({
      id: 'request-1', resourceType: 'farmAsset', resourceId: 'asset-1',
      sourceUserId: 'jim', destinationUserId: 'cto', quantity: 10, unit: 'head',
      status: 'PENDING', effectiveAt: null, expiresAt: null,
    });
    tx.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1', farmId: 'farm-1', type: 'LIVESTOCK', quantity: 10, unit: 'head', metadata: null,
    });

    await expect(service.accept('request-1', 'cto')).rejects.toThrow(BadRequestException);
    expect(tx.farmAsset.create).not.toHaveBeenCalled();
    expect(relationships.transferOwnerRelationship).not.toHaveBeenCalled();
  });
});
