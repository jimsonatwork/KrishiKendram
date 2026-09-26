import {
  ResourceRelationshipResolution,
  ResourceRelationshipResolver,
  ResourceRelationshipQuery,
} from './relationship-resolution.types';
import {
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';

describe('ResourceRelationship resolution contract', () => {
  it('supports a current relationship resolution query', () => {
    const query: ResourceRelationshipQuery = {
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-001',
    };

    expect(query.resourceType).toBe('farm');
    expect(query.resourceId).toBe('farm-001');
    expect(query.userId).toBe('user-001');
    expect(query.at).toBeUndefined();
  });

  it('supports temporal relationship resolution', () => {
    const query: ResourceRelationshipQuery = {
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-002',
      at: new Date('2026-05-01T00:00:00.000Z'),
    };

    expect(query.at).toEqual(
      new Date('2026-05-01T00:00:00.000Z'),
    );
  });

  it('supports a resolution containing relationship facts', () => {
    const resolvedAt = new Date('2026-09-25T00:00:00.000Z');

    const resolution: ResourceRelationshipResolution = {
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-001',
      relationships: [
        {
          resourceType: 'farm',
          resourceId: 'farm-001',
          userId: 'user-001',
          relationshipType: ResourceRelationshipType.OWNER,
          status: ResourceRelationshipStatus.ACTIVE,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          createdBy: 'user-001',
          updatedBy: 'user-001',
        },
      ],
      resolvedAt,
    };

    expect(resolution.relationships).toHaveLength(1);
    expect(resolution.relationships[0].relationshipType).toBe(
      ResourceRelationshipType.OWNER,
    );
    expect(resolution.relationships[0].status).toBe(
      ResourceRelationshipStatus.ACTIVE,
    );
    expect(resolution.resolvedAt).toBe(resolvedAt);
  });

  it('supports multiple relationship facts without defining authorization behavior', () => {
    const resolution: ResourceRelationshipResolution = {
      resourceType: 'farmAsset',
      resourceId: 'asset-001',
      userId: 'user-002',
      relationships: [
        {
          resourceType: 'farmAsset',
          resourceId: 'asset-001',
          userId: 'user-002',
          relationshipType: ResourceRelationshipType.CUSTODIAN,
          status: ResourceRelationshipStatus.ACTIVE,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          createdBy: 'admin-001',
          updatedBy: 'admin-001',
        },
        {
          resourceType: 'farmAsset',
          resourceId: 'asset-001',
          userId: 'user-002',
          relationshipType: ResourceRelationshipType.SERVICE_PROVIDER,
          status: ResourceRelationshipStatus.ACTIVE,
          validFrom: new Date('2026-06-01T00:00:00.000Z'),
          createdBy: 'admin-001',
          updatedBy: 'admin-002',
        },
      ],
      resolvedAt: new Date('2026-09-25T00:00:00.000Z'),
    };

    expect(resolution.relationships).toHaveLength(2);
    expect(resolution.relationships.map(
      (relationship) => relationship.relationshipType,
    )).toEqual([
      ResourceRelationshipType.CUSTODIAN,
      ResourceRelationshipType.SERVICE_PROVIDER,
    ]);
  });

  it('defines a resolver boundary without requiring a persistence implementation', () => {
    const resolver: ResourceRelationshipResolver = {
      async resolve(
        query: ResourceRelationshipQuery,
      ): Promise<ResourceRelationshipResolution> {
        return {
          resourceType: query.resourceType,
          resourceId: query.resourceId,
          userId: query.userId,
          relationships: [],
          resolvedAt: new Date('2026-09-25T00:00:00.000Z'),
        };
      },
    };

    expect(resolver.resolve).toBeDefined();
  });
});
