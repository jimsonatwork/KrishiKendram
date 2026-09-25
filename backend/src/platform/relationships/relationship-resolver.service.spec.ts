import { ResourceRelationshipResolverService } from './relationship-resolver.service';
import {
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';

describe('ResourceRelationshipResolverService', () => {
  const findMany = jest.fn();

  const prisma = {
    resourceRelationship: {
      findMany,
    },
  } as any;

  let service: ResourceRelationshipResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    service = new ResourceRelationshipResolverService(prisma);
  });

  it('resolves current relationships using the current time', async () => {
    const now = new Date('2026-09-25T10:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(now);

    findMany.mockResolvedValue([
      {
        id: 'relationship-001',
        resourceType: 'farm',
        resourceId: 'farm-001',
        userId: 'user-001',
        relationshipType: ResourceRelationshipType.OWNER,
        status: ResourceRelationshipStatus.ACTIVE,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: null,
        endedAt: null,
        endedReason: null,
        createdBy: 'user-001',
        updatedBy: 'user-001',
      },
    ]);

    const result = await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-001',
    });

    expect(result.resolvedAt).toEqual(now);
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]).toEqual({
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-001',
      relationshipType: ResourceRelationshipType.OWNER,
      status: ResourceRelationshipStatus.ACTIVE,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: undefined,
      endedAt: undefined,
      endedReason: undefined,
      createdBy: 'user-001',
      updatedBy: 'user-001',
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'farm',
        resourceId: 'farm-001',
        userId: 'user-001',
        validFrom: {
          lte: now,
        },
        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: now,
                },
              },
            ],
          },
          {
            OR: [
              {
                endedAt: null,
              },
              {
                endedAt: {
                  gte: now,
                },
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          validFrom: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  });

  it('resolves relationships at an explicit historical point in time', async () => {
    const at = new Date('2026-05-01T00:00:00.000Z');

    findMany.mockResolvedValue([]);

    const result = await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-002',
      at,
    });

    expect(result.resolvedAt).toEqual(at);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'farm',
        resourceId: 'farm-001',
        userId: 'user-002',
        validFrom: {
          lte: at,
        },
        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: at,
                },
              },
            ],
          },
          {
            OR: [
              {
                endedAt: null,
              },
              {
                endedAt: {
                  gte: at,
                },
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          validFrom: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  });

  it('returns multiple relationship facts without evaluating authorization', async () => {
    const at = new Date('2026-09-25T00:00:00.000Z');

    findMany.mockResolvedValue([
      {
        id: 'relationship-001',
        resourceType: 'farmAsset',
        resourceId: 'asset-001',
        userId: 'user-002',
        relationshipType: ResourceRelationshipType.CUSTODIAN,
        status: ResourceRelationshipStatus.ACTIVE,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: null,
        endedAt: null,
        endedReason: null,
        createdBy: 'admin-001',
        updatedBy: 'admin-001',
      },
      {
        id: 'relationship-002',
        resourceType: 'farmAsset',
        resourceId: 'asset-001',
        userId: 'user-002',
        relationshipType: ResourceRelationshipType.SERVICE_PROVIDER,
        status: ResourceRelationshipStatus.SUSPENDED,
        validFrom: new Date('2026-06-01T00:00:00.000Z'),
        validUntil: null,
        endedAt: null,
        endedReason: null,
        createdBy: 'admin-001',
        updatedBy: 'admin-002',
      },
    ]);

    const result = await service.resolve({
      resourceType: 'farmAsset',
      resourceId: 'asset-001',
      userId: 'user-002',
      at,
    });

    expect(result.relationships).toHaveLength(2);
    expect(
      result.relationships.map((relationship) => relationship.relationshipType),
    ).toEqual([
      ResourceRelationshipType.CUSTODIAN,
      ResourceRelationshipType.SERVICE_PROVIDER,
    ]);
    expect(result.relationships[1].status).toBe(
      ResourceRelationshipStatus.SUSPENDED,
    );
  });

  it('preserves historical end metadata in the resolved relationship fact', async () => {
    const at = new Date('2026-06-15T00:00:00.000Z');

    findMany.mockResolvedValue([
      {
        id: 'relationship-003',
        resourceType: 'farm',
        resourceId: 'farm-001',
        userId: 'user-003',
        relationshipType: ResourceRelationshipType.LESSEE,
        status: ResourceRelationshipStatus.TRANSFERRED,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: new Date('2026-12-31T00:00:00.000Z'),
        endedAt: new Date('2026-07-01T00:00:00.000Z'),
        endedReason: 'Lease transferred',
        createdBy: 'admin-001',
        updatedBy: 'admin-002',
      },
    ]);

    const result = await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-003',
      at,
    });

    expect(result.relationships[0]).toMatchObject({
      relationshipType: ResourceRelationshipType.LESSEE,
      status: ResourceRelationshipStatus.TRANSFERRED,
      validUntil: new Date('2026-12-31T00:00:00.000Z'),
      endedAt: new Date('2026-07-01T00:00:00.000Z'),
      endedReason: 'Lease transferred',
    });
  });

  it('uses inclusive temporal boundaries for validUntil and endedAt', async () => {
    const at = new Date('2026-07-01T00:00:00.000Z');

    findMany.mockResolvedValue([]);

    await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-003',
      at,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          validFrom: {
            lte: at,
          },
          AND: [
            {
              OR: [
                {
                  validUntil: null,
                },
                {
                  validUntil: {
                    gte: at,
                  },
                },
              ],
            },
            {
              OR: [
                {
                  endedAt: null,
                },
                {
                  endedAt: {
                    gte: at,
                  },
                },
              ],
            },
          ],
        }),
      }),
    );
  });

  it('returns no facts when persistence returns no applicable relationships', async () => {
    const at = new Date('2026-09-25T00:00:00.000Z');

    findMany.mockResolvedValue([]);

    const result = await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-missing',
      userId: 'user-missing',
      at,
    });

    expect(result).toEqual({
      resourceType: 'farm',
      resourceId: 'farm-missing',
      userId: 'user-missing',
      relationships: [],
      resolvedAt: at,
    });
  });
});
