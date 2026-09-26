import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { FarmResourceLineageService } from './farm-resource-lineage.service';

describe('FarmResourceLineageService', () => {
  const authorization = { assertCan: jest.fn() } as any;
  const relationships = { createOwnerRelationship: jest.fn(), terminateResourceRelationships: jest.fn() } as any;
  const lineageResolver = { resolve: jest.fn() } as any;

  const tx = {
    farmAsset: {
      create: jest.fn(),
      update: jest.fn(),
    },
    resourceMovement: { create: jest.fn() },
    resourceLineage: { create: jest.fn() },
  } as any;

  const prisma = {
    farmAsset: { findUnique: jest.fn(), findMany: jest.fn() },
    resourceRelationship: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  let service: FarmResourceLineageService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: any) => Promise<unknown>) => callback(tx),
    );
    authorization.assertCan.mockResolvedValue(undefined);
    tx.farmAsset.create.mockResolvedValue({
      id: 'asset-2',
      farmId: 'farm-1',
      quantity: 25,
      unit: 'kg',
    });
    tx.farmAsset.update.mockResolvedValue({
      id: 'asset-1',
      quantity: 75,
      unit: 'kg',
    });
    tx.resourceMovement.create.mockResolvedValue({ id: 'movement-2' });
    tx.resourceLineage.create.mockResolvedValue({ id: 'lineage-1' });
    service = new FarmResourceLineageService(
      prisma,
      authorization,
      relationships,
      lineageResolver,
    );
  });

  it('splits a quantified farm asset with movement and lineage atomically', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      type: 'SEED_STOCK',
      name: 'Seed stock',
      quantity: 100,
      unit: 'kg',
      metadata: { lot: 'L1' },
      farm: { id: 'farm-1', ownerId: 'owner-1' },
    });
    prisma.resourceRelationship.findFirst.mockResolvedValue({
      userId: 'owner-1',
      id: 'relationship-1',
    });

    const result = await service.splitFarmAsset(
      'farm-1',
      'asset-1',
      {
        quantity: 25,
        name: 'Split seed stock',
        reason: 'Allocated to field block A',
      },
      'owner-1',
      UserRole.FARMER,
    );

    expect(authorization.assertCan).toHaveBeenCalledTimes(2);
    expect(tx.farmAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        farmId: 'farm-1',
        type: 'SEED_STOCK',
        quantity: 25,
        unit: 'kg',
      }),
    });
    expect(tx.resourceMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceType: 'farmAsset',
        resourceId: 'asset-2',
        movementType: 'SPLIT',
        sourceResourceId: 'asset-1',
        destinationResourceId: 'asset-2',
        quantity: 25,
        unit: 'kg',
      }),
    });
    expect(tx.resourceLineage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceResourceId: 'asset-1',
        targetResourceId: 'asset-2',
        lineageType: 'SPLIT_FROM',
        movementId: 'movement-2',
        quantity: 25,
      }),
    });
    expect(tx.farmAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { quantity: 75 },
    });
    expect(result.lineage).toEqual({ id: 'lineage-1' });
  });

  it('rejects splitting an unquantified asset before mutation', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      quantity: null,
      farm: { id: 'farm-1', ownerId: 'owner-1' },
    });

    await expect(
      service.splitFarmAsset(
        'farm-1',
        'asset-1',
        { quantity: 10 },
        'owner-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tx.farmAsset.create).not.toHaveBeenCalled();
  });

  it('resolves lineage history using the active temporal owner', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      farmId: 'farm-1',
      farm: { ownerId: 'legacy-owner' },
    });
    prisma.resourceRelationship.findFirst.mockResolvedValue({
      userId: 'temporal-owner',
    });
    lineageResolver.resolve.mockResolvedValue({ lineages: [] });

    await service.getFarmAssetLineageHistory(
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
    expect(lineageResolver.resolve).toHaveBeenCalledWith({
      resourceType: 'farmAsset',
      resourceId: 'asset-1',
      direction: 'BOTH',
    });
  });
  it('merges quantified farm assets into a new target with movement and lineage', async () => {
    prisma.farmAsset.findMany.mockResolvedValue([
      {
        id: 'asset-1', farmId: 'farm-1', type: 'SEED_STOCK', name: 'Lot A',
        quantity: 40, unit: 'kg', metadata: { lot: 'A' },
        farm: { id: 'farm-1', ownerId: 'owner-1' },
      },
      {
        id: 'asset-2', farmId: 'farm-1', type: 'SEED_STOCK', name: 'Lot B',
        quantity: 60, unit: 'kg', metadata: { lot: 'B' },
        farm: { id: 'farm-1', ownerId: 'owner-1' },
      },
    ]);
    prisma.resourceRelationship.findFirst
      .mockResolvedValueOnce({ userId: 'owner-1', id: 'relationship-1' })
      .mockResolvedValueOnce({ userId: 'owner-1', id: 'relationship-2' });
    tx.farmAsset.create.mockResolvedValue({ id: 'asset-3', quantity: 100, unit: 'kg' });
    tx.resourceMovement.create
      .mockResolvedValueOnce({ id: 'movement-1' })
      .mockResolvedValueOnce({ id: 'movement-2' });
    tx.resourceLineage.create
      .mockResolvedValueOnce({ id: 'lineage-1' })
      .mockResolvedValueOnce({ id: 'lineage-2' });
    relationships.createOwnerRelationship.mockResolvedValue({ id: 'relationship-3' });

    const result = await service.mergeFarmAssets(
      'farm-1',
      { sourceAssetIds: ['asset-1', 'asset-2'], name: 'Merged stock', reason: 'Consolidation' },
      'owner-1',
      UserRole.FARMER,
    );

    expect(authorization.assertCan).toHaveBeenCalledTimes(3);
    expect(tx.farmAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ farmId: 'farm-1', type: 'SEED_STOCK', quantity: 100, unit: 'kg' }),
    });
    expect(relationships.terminateResourceRelationships).toHaveBeenCalledTimes(2);
    expect(tx.resourceMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.resourceLineage.create).toHaveBeenCalledTimes(2);
    expect(result.target.id).toBe('asset-3');
    expect(result.movements).toHaveLength(2);
    expect(result.lineages).toHaveLength(2);
  });

});
