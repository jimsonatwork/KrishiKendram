import { FarmAssetLeaseService } from './farm-asset-lease.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';

describe('FarmAssetLeaseService', () => {
  const findAsset = jest.fn();
  const findOwner = jest.fn();
  const findDestination = jest.fn();
  const assertCan = jest.fn();
  const transaction = jest.fn();
  const assignLessee = jest.fn();
  const endLease = jest.fn();

  const prisma = {
    farmAsset: { findUnique: findAsset },
    resourceRelationship: { findFirst: findOwner },
    $transaction: transaction,
  } as any;

  const authorization = { assertCan } as any;
  const relationships = { assignLessee, endLease } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    assertCan.mockResolvedValue(undefined);
    findAsset.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      farm: { ownerId: 'owner-1' },
    });
    findOwner.mockResolvedValue({ userId: 'owner-1' });
    findDestination.mockResolvedValue({ id: 'lessee-1', status: 'ACTIVE' });
    transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({ user: { findUnique: findDestination } }),
    );
    assignLessee.mockResolvedValue({
      previousRelationship: { userId: 'old-lessee' },
      destinationRelationship: {
        userId: 'lessee-1',
        validFrom: new Date('2026-09-27T00:00:00Z'),
        validUntil: new Date('2027-09-27T00:00:00Z'),
      },
      movement: { id: 'movement-1' },
      evidence: undefined,
    });
    endLease.mockResolvedValue({
      relationship: {
        userId: 'lessee-1',
        endedAt: new Date('2026-10-01T00:00:00Z'),
      },
      movement: { id: 'movement-2' },
      evidence: undefined,
    });
  });

  it('authorizes and creates a bounded lease transactionally', async () => {
    const service = new FarmAssetLeaseService(prisma, authorization, relationships);

    const result = await service.leaseAsset(
      'farm-1',
      'asset-1',
      {
        destinationUserId: 'lessee-1',
        effectiveAt: '2026-09-27T00:00:00Z',
        validUntil: '2027-09-27T00:00:00Z',
        reason: 'Seasonal equipment lease',
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
    expect(assignLessee).toHaveBeenCalledWith(
      expect.anything(),
      'farmAsset',
      'asset-1',
      'lessee-1',
      new Date('2026-09-27T00:00:00Z'),
      new Date('2027-09-27T00:00:00Z'),
      'owner-1',
      'Seasonal equipment lease',
      undefined,
      undefined,
    );
    expect(result.movementType).toBe('LEASE');
    expect(result.lessee).toBe('lessee-1');
  });

  it('rejects an invalid lease window before opening a transaction', async () => {
    const service = new FarmAssetLeaseService(prisma, authorization, relationships);

    await expect(
      service.leaseAsset(
        'farm-1',
        'asset-1',
        {
          destinationUserId: 'lessee-1',
          effectiveAt: '2027-09-27T00:00:00Z',
          validUntil: '2027-09-26T00:00:00Z',
        },
        'owner-1',
        'FARMER' as any,
      ),
    ).rejects.toThrow('Lease validUntil must be after effectiveAt.');

    expect(transaction).not.toHaveBeenCalled();
  });

  it('ends the active lease through the canonical relationship service', async () => {
    const service = new FarmAssetLeaseService(prisma, authorization, relationships);

    const result = await service.endLease(
      'farm-1',
      'asset-1',
      { reason: 'Lease returned early' },
      'owner-1',
      'FARMER' as any,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(endLease).toHaveBeenCalledWith(
      expect.anything(),
      'farmAsset',
      'asset-1',
      'owner-1',
      expect.any(Date),
      'Lease returned early',
      undefined,
      undefined,
    );
    expect(result.movementType).toBe('LEASE_END');
    expect(result.lessee).toBe('lessee-1');
  });

  it('does not enter the transaction when authorization fails', async () => {
    assertCan.mockRejectedValue(new Error('Forbidden'));
    const service = new FarmAssetLeaseService(prisma, authorization, relationships);

    await expect(
      service.endLease(
        'farm-1',
        'asset-1',
        {},
        'intruder-1',
        'FARMER' as any,
      ),
    ).rejects.toThrow('Forbidden');

    expect(transaction).not.toHaveBeenCalled();
    expect(endLease).not.toHaveBeenCalled();
  });
});
