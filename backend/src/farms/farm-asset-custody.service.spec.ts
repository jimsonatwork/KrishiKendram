import { FarmAssetCustodyService } from './farm-asset-custody.service';

import { AuthorizationAction } from '../platform/authorization/authorization.types';


describe('FarmAssetCustodyService', () => {
  const findAsset = jest.fn();
  const findOwner = jest.fn();
  const assertCan = jest.fn();
  const transaction = jest.fn();
  const assignCustodian = jest.fn();
  const returnCustodian = jest.fn();
  const findDestination = jest.fn();

  const prisma = {
    farmAsset: { findUnique: findAsset },
    resourceRelationship: { findFirst: findOwner },
    $transaction: transaction,
  } as any;

  const authorization = {
    assertCan,
  } as any;

  const relationships = {
    assignCustodian,
    returnCustodian,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    assertCan.mockResolvedValue(undefined);
    findAsset.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      farm: { ownerId: 'owner-1' },
    });
    findOwner.mockResolvedValue({
      userId: 'owner-1',
      validFrom: new Date('2026-01-01T00:00:00Z'),
    });
    findDestination.mockResolvedValue({
      id: 'custodian-1',
      status: 'ACTIVE',
    });
    transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({ user: { findUnique: findDestination } }),
    );
    returnCustodian.mockResolvedValue({
      relationship: { userId: 'custodian-1' },
      owner: { userId: 'owner-1' },
      movement: { id: 'movement-return' },
      evidence: undefined,
    });
    assignCustodian.mockResolvedValue({
      previousRelationship: { userId: 'old-custodian' },
      destinationRelationship: { id: 'relationship-2', userId: 'custodian-1' },
      movement: { id: 'movement-1' },
      evidence: undefined,
    });
  });

  it('authorizes and delegates custody assignment as one transaction', async () => {
    const service = new FarmAssetCustodyService(
      prisma,
      authorization,
      relationships,
    );

    const result = await service.assignCustodian(
      'farm-1',
      'asset-1',
      {
        destinationUserId: 'custodian-1',
        reason: 'Equipment handed to operator',
      },
      'owner-1',
      'FARMER' as any,
    );

    expect(assertCan).toHaveBeenCalledWith({
      user: { userId: 'owner-1', role: 'FARMER' },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.ASSIGN,
      resourceId: 'asset-1',
      farmId: 'farm-1',
      ownerId: 'owner-1',
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(assignCustodian).toHaveBeenCalledWith(
      expect.anything(),
      'farmAsset',
      'asset-1',
      'custodian-1',
      expect.any(Date),
      'owner-1',
      'Equipment handed to operator',
      undefined,
      undefined,
    );
    expect(result.custodian).toBe('custodian-1');
    expect(result.movementType).toBe('CUSTODY_CHANGE');
  });

  it('returns custody to the owner through the canonical relationship service', async () => {
    const service = new FarmAssetCustodyService(
      prisma,
      authorization,
      relationships,
    );

    const result = await service.returnCustody(
      'farm-1',
      'asset-1',
      { reason: 'Equipment returned' },
      'owner-1',
      'FARMER' as any,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(returnCustodian).toHaveBeenCalledWith(
      expect.anything(),
      'farmAsset',
      'asset-1',
      'owner-1',
      expect.any(Date),
      'owner-1',
      'Equipment returned',
      undefined,
      undefined,
    );
    expect(result.owner).toBe('owner-1');
    expect(result.movementType).toBe('RETURN');
  });

  it('does not enter the transaction when authorization fails', async () => {
    assertCan.mockRejectedValue(new Error('Forbidden'));

    const service = new FarmAssetCustodyService(
      prisma,
      authorization,
      relationships,
    );

    await expect(
      service.assignCustodian(
        'farm-1',
        'asset-1',
        { destinationUserId: 'custodian-1' },
        'intruder-1',
        'FARMER' as any,
      ),
    ).rejects.toThrow('Forbidden');

    expect(transaction).not.toHaveBeenCalled();
    expect(assignCustodian).not.toHaveBeenCalled();
  });
});
