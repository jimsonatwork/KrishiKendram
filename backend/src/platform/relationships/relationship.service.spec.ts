import { ResourceRelationshipService } from './relationship.service';

describe('ResourceRelationshipService', () => {
  const create = jest.fn();
  const updateMany = jest.fn();
  const findMany = jest.fn();

  const prisma = {
    resourceRelationship: {
      findMany,
    },
  } as any;

  const tx = {
    resourceRelationship: {
      create,
      updateMany,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an active owner relationship with the 1000-year default horizon', async () => {
    const effectiveAt = new Date('2026-09-26T00:00:00Z');
    create.mockResolvedValue({ id: 'relationship-1' });

    const service = new ResourceRelationshipService(prisma);
    await service.createOwnerRelationship(
      tx,
      'farm',
      'farm-1',
      'user-1',
      effectiveAt,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        resourceType: 'farm',
        resourceId: 'farm-1',
        userId: 'user-1',
        relationshipType: 'OWNER',
        status: 'ACTIVE',
        validFrom: effectiveAt,
        validUntil: new Date('3026-09-26T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    });
  });

  it('terminates every open relationship when a resource lifecycle closes', async () => {
    const endedAt = new Date('2026-09-26T12:00:00Z');
    updateMany.mockResolvedValue({ count: 2 });

    const service = new ResourceRelationshipService(prisma);
    await service.terminateResourceRelationships(
      tx,
      'farm',
      'farm-1',
      endedAt,
      'Farm deleted',
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'farm',
        resourceId: 'farm-1',
        endedAt: null,
      },
      data: {
        status: 'TERMINATED',
        endedAt,
        validUntil: endedAt,
        endedReason: 'Farm deleted',
      },
    });
  });

  it('returns complete relationship history in effective order as domain facts', async () => {
    findMany.mockResolvedValue([
      {
        resourceType: 'crop',
        resourceId: 'crop-1',
        userId: 'user-1',
        relationshipType: 'OWNER',
        status: 'TERMINATED',
        validFrom: new Date('2026-01-01T00:00:00Z'),
        validUntil: new Date('2026-06-01T00:00:00Z'),
        endedAt: new Date('2026-06-01T00:00:00Z'),
        endedReason: 'Crop archived',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    ]);

    const service = new ResourceRelationshipService(prisma);
    const history = await service.listResourceRelationshipHistory(
      'crop',
      'crop-1',
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'crop',
        resourceId: 'crop-1',
      },
      orderBy: [{ validFrom: 'asc' }, { id: 'asc' }],
    });
    expect(history).toEqual([
      {
        resourceType: 'crop',
        resourceId: 'crop-1',
        userId: 'user-1',
        relationshipType: 'OWNER',
        status: 'TERMINATED',
        validFrom: new Date('2026-01-01T00:00:00Z'),
        validUntil: new Date('2026-06-01T00:00:00Z'),
        endedAt: new Date('2026-06-01T00:00:00Z'),
        endedReason: 'Crop archived',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    ]);
  });
});
