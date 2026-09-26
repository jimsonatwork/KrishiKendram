import { BadRequestException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { FarmResourceLifecycleService } from './farm-resource-lifecycle.service';

describe('FarmResourceLifecycleService', () => {
  const authorization = { assertCan: jest.fn() } as any;
  const relationships = { transferOwnerRelationship: jest.fn() } as any;
  const movementResolver = { resolve: jest.fn() } as any;
  const evidenceResolver = { resolve: jest.fn() } as any;

  const tx = {
    user: { findUnique: jest.fn() },
    farm: { update: jest.fn(), findUnique: jest.fn() },
    farmAsset: { findUnique: jest.fn() },
    resourceRelationship: { findFirst: jest.fn() },
  } as any;

  const prisma = {
    farm: { findUnique: jest.fn() },
    farmAsset: { findUnique: jest.fn() },
    resourceRelationship: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  let service: FarmResourceLifecycleService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: any) => Promise<unknown>) => callback(tx),
    );
    authorization.assertCan.mockResolvedValue(undefined);
    tx.user.findUnique.mockResolvedValue({
      id: 'destination-1',
      status: UserStatus.ACTIVE,
    });
    relationships.transferOwnerRelationship.mockResolvedValue({
      movement: { id: 'movement-1' },
      evidence: { id: 'evidence-1' },
    });
    tx.farm.update.mockResolvedValue({ id: 'farm-1', ownerId: 'destination-1' });
    tx.farmAsset.findUnique.mockResolvedValue({ id: 'asset-1' });

    service = new FarmResourceLifecycleService(
      prisma,
      authorization,
      relationships,
      movementResolver,
      evidenceResolver,
    );
  });

  it('transfers a farm through authorization, relationship, movement and persistence', async () => {
    const effectiveAt = '2026-09-26T10:00:00.000Z';
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.transferFarm(
      'farm-1',
      {
        destinationUserId: 'destination-1',
        effectiveAt,
        reason: 'Sale',
        transactionId: 'txn-1',
        evidenceReferenceType: 'SALE_DEED',
        evidenceReferenceValue: 'SD-42',
        evidenceDocumentNumber: 'DOC-42',
        evidenceIssuer: 'Registrar',
      },
      'owner-1',
      UserRole.FARMER,
    );

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: { userId: 'owner-1', role: UserRole.FARMER },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.UPDATE,
      resourceId: 'farm-1',
      ownerId: 'owner-1',
    });
    expect(relationships.transferOwnerRelationship).toHaveBeenCalledWith(
      tx,
      'farm',
      'farm-1',
      'owner-1',
      'destination-1',
      new Date(effectiveAt),
      'Sale',
      'txn-1',
      {
        referenceType: 'SALE_DEED',
        referenceValue: 'SD-42',
        documentNumber: 'DOC-42',
        issuer: 'Registrar',
      },
    );
    expect(tx.farm.update).toHaveBeenCalledWith({
      where: { id: 'farm-1' },
      data: { ownerId: 'destination-1' },
    });
    expect(result.movement).toEqual({ id: 'movement-1' });
  });

  it('rejects inactive transfer destinations before relationship mutation', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    tx.user.findUnique.mockResolvedValue({
      id: 'destination-1',
      status: UserStatus.DELETED,
    });

    await expect(
      service.transferFarm(
        'farm-1',
        { destinationUserId: 'destination-1' },
        'owner-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Destination user is not active.');

    expect(relationships.transferOwnerRelationship).not.toHaveBeenCalled();
    expect(tx.farm.update).not.toHaveBeenCalled();
  });

  it('requires evidence reference type and value together', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.transferFarm(
        'farm-1',
        {
          destinationUserId: 'destination-1',
          evidenceReferenceType: 'SALE_DEED',
        },
        'owner-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(relationships.transferOwnerRelationship).not.toHaveBeenCalled();
  });

  it('authorizes asset history using the active temporal owner', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      farmId: 'farm-1',
      farm: { ownerId: 'legacy-owner' },
    });
    prisma.resourceRelationship.findFirst.mockResolvedValue({
      userId: 'temporal-owner',
    });
    movementResolver.resolve.mockResolvedValue({ movements: [] });

    await service.getFarmAssetMovementHistory(
      'farm-1',
      'asset-1',
      'temporal-owner',
      UserRole.FARMER,
    );

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'temporal-owner',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.READ,
      resourceId: 'asset-1',
      farmId: 'farm-1',
      ownerId: 'temporal-owner',
    });
    expect(movementResolver.resolve).toHaveBeenCalledWith({
      resourceType: 'farmAsset',
      resourceId: 'asset-1',
    });
  });
});
