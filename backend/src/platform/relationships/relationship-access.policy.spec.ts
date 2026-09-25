import {
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';
import { RelationshipAccessPolicy } from './relationship-access.policy';

describe('RelationshipAccessPolicy', () => {
  let policy: RelationshipAccessPolicy;

  beforeEach(() => {
    policy = new RelationshipAccessPolicy();
  });

  function relationship(
    relationshipType: ResourceRelationshipType,
    status: ResourceRelationshipStatus,
  ) {
    return {
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationshipType,
      status,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    };
  }

  it('does not grant farm access from an ACTIVE relationship by default', () => {
    expect(
      policy.allowsFarmAccess(
        relationship(
          ResourceRelationshipType.LESSEE,
          ResourceRelationshipStatus.ACTIVE,
        ),
      ),
    ).toBe(false);
  });

  it('does not grant farm access from an inactive relationship', () => {
    const statuses = [
      ResourceRelationshipStatus.EXPIRED,
      ResourceRelationshipStatus.TRANSFERRED,
      ResourceRelationshipStatus.REVOKED,
      ResourceRelationshipStatus.TERMINATED,
      ResourceRelationshipStatus.SUSPENDED,
    ];

    for (const status of statuses) {
      expect(
        policy.allowsFarmAccess(
          relationship(ResourceRelationshipType.LESSEE, status),
        ),
      ).toBe(false);
    }
  });

  it('keeps every relationship type outside the access policy until explicitly approved', () => {
    const relationshipTypes = Object.values(ResourceRelationshipType);

    for (const relationshipType of relationshipTypes) {
      expect(
        policy.allowsFarmAccess(
          relationship(
            relationshipType,
            ResourceRelationshipStatus.ACTIVE,
          ),
        ),
      ).toBe(false);
    }
  });

  it('does not reinterpret relationship facts as authorization grants', () => {
    const relationshipFact = relationship(
      ResourceRelationshipType.MANAGER,
      ResourceRelationshipStatus.ACTIVE,
    );

    expect(relationshipFact.relationshipType).toBe(
      ResourceRelationshipType.MANAGER,
    );
    expect(policy.allowsFarmAccess(relationshipFact)).toBe(false);
  });
});
