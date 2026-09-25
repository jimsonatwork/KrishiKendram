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

  it('allows explicitly approved active farm-access relationships', () => {
    const approvedTypes = [
      ResourceRelationshipType.CO_OWNER,
      ResourceRelationshipType.LESSEE,
      ResourceRelationshipType.MANAGER,
      ResourceRelationshipType.WORKER,
      ResourceRelationshipType.CUSTODIAN,
      ResourceRelationshipType.CARETAKER,
      ResourceRelationshipType.AUTHORIZED_OPERATOR,
    ];

    for (const relationshipType of approvedTypes) {
      expect(
        policy.allowsFarmAccess(
          relationship(
            relationshipType,
            ResourceRelationshipStatus.ACTIVE,
          ),
        ),
      ).toBe(true);
    }
  });

  it('does not grant farm access from inactive relationships', () => {
    const statuses = [
      ResourceRelationshipStatus.EXPIRED,
      ResourceRelationshipStatus.TRANSFERRED,
      ResourceRelationshipStatus.REVOKED,
      ResourceRelationshipStatus.TERMINATED,
      ResourceRelationshipStatus.SUSPENDED,
    ];

    for (const relationshipType of [
      ResourceRelationshipType.CO_OWNER,
      ResourceRelationshipType.LESSEE,
      ResourceRelationshipType.MANAGER,
      ResourceRelationshipType.WORKER,
      ResourceRelationshipType.CUSTODIAN,
      ResourceRelationshipType.CARETAKER,
      ResourceRelationshipType.AUTHORIZED_OPERATOR,
    ]) {
      for (const status of statuses) {
        expect(
          policy.allowsFarmAccess(
            relationship(relationshipType, status),
          ),
        ).toBe(false);
      }
    }
  });

  it('does not treat OWNER as a relationship-based farm access grant', () => {
    expect(
      policy.allowsFarmAccess(
        relationship(
          ResourceRelationshipType.OWNER,
          ResourceRelationshipStatus.ACTIVE,
        ),
      ),
    ).toBe(false);
  });

  it('does not grant blanket farm access to service-provider or advisory relationships', () => {
    const restrictedTypes = [
      ResourceRelationshipType.SERVICE_PROVIDER,
      ResourceRelationshipType.ADVISOR,
      ResourceRelationshipType.VETERINARIAN,
    ];

    for (const relationshipType of restrictedTypes) {
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

  it('keeps the relationship fact separate from authorization semantics', () => {
    const relationshipFact = relationship(
      ResourceRelationshipType.MANAGER,
      ResourceRelationshipStatus.ACTIVE,
    );

    expect(relationshipFact.relationshipType).toBe(
      ResourceRelationshipType.MANAGER,
    );
    expect(policy.allowsFarmAccess(relationshipFact)).toBe(true);
  });
});
