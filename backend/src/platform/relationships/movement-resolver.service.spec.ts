import { ResourceMovementResolverService } from './movement-resolver.service';
import { ResourceMovementType } from './movement.types';

describe('ResourceMovementResolverService', () => {
  const findMany = jest.fn();
  const prisma = { resourceMovement: { findMany } } as any;
  let service: ResourceMovementResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResourceMovementResolverService(prisma);
  });

  it('resolves movement history in effective business order', async () => {
    const first = new Date('2026-01-01T00:00:00.000Z');
    const second = new Date('2026-06-01T00:00:00.000Z');

    findMany.mockResolvedValue([
      {
        resourceType: 'farm',
        resourceId: 'farm-001',
        movementType: ResourceMovementType.SALE,
        sourceUserId: 'user-001',
        destinationUserId: 'user-002',
        sourceResourceType: null,
        sourceResourceId: null,
        destinationResourceType: null,
        destinationResourceId: null,
        sourceRelationshipId: 'rel-001',
        destinationRelationshipId: 'rel-002',
        previousMovementId: null,
        quantity: 3,
        unit: 'acre',
        effectiveAt: first,
        reason: 'sale',
        transactionId: 'txn-001',
        evidenceId: 'evidence-001',
        metadata: null,
        createdBy: 'user-001',
        updatedBy: 'user-001',
      },
      {
        resourceType: 'farm',
        resourceId: 'farm-001',
        movementType: ResourceMovementType.PARTIAL_TRANSFER,
        sourceUserId: 'user-002',
        destinationUserId: 'user-003',
        sourceResourceType: null,
        sourceResourceId: null,
        destinationResourceType: null,
        destinationResourceId: null,
         sourceRelationshipId: 'rel-002',
        destinationRelationshipId: 'rel-003',
        previousMovementId: 'movement-001',
        quantity: 1,
        unit: 'acre',
        effectiveAt: second,
        recordedAt: second,
        reason: 'partial transfer',
        transactionId: 'txn-002',
        evidenceId: 'evidence-002',
        metadata: { portion: 'north' },
        createdBy: 'user-002',
        updatedBy: 'user-002',
      },
    ]);

    const result = await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-001',
    });

    expect(result.resourceType).toBe('farm');
    expect(result.movements).toHaveLength(2);
    expect(result.movements[1].previousMovementId).toBe('movement-001');
    expect(findMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'farm',
        resourceId: 'farm-001',
      },
      orderBy: [
        { effectiveAt: 'asc' },
        { recordedAt: 'asc' },
        { id: 'asc' },
      ],
    });

  });

   it('applies an explicit effective-date window', async () => {
    findMany.mockResolvedValue([]);
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-09-26T00:00:00.000Z');
    await service.resolve({ resourceType: 'farmAsset', resourceId: 'asset-001', from, to });
    expect(findMany).toHaveBeenCalledWith({ where: { resourceType: 'farmAsset', resourceId: 'asset-001', effectiveAt: { gte: from, lte: to } }, orderBy: [{ effectiveAt: 'asc' }, {recordedAt: 'asc' }, { id: 'asc' }]});
  });
});
