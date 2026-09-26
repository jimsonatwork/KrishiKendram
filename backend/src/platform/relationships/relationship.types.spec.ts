import {
  ResourceRelationship,
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';

describe('ResourceRelationship contract', () => {
  it('exposes the supported relationship types', () => {
    expect(ResourceRelationshipType).toEqual({
      OWNER: 'OWNER',
      CO_OWNER: 'CO_OWNER',
      LESSEE: 'LESSEE',
      MANAGER: 'MANAGER',
      WORKER: 'WORKER',
      CUSTODIAN: 'CUSTODIAN',
      CARETAKER: 'CARETAKER',
      SERVICE_PROVIDER: 'SERVICE_PROVIDER',
      ADVISOR: 'ADVISOR',
      VETERINARIAN: 'VETERINARIAN',
      AUTHORIZED_OPERATOR: 'AUTHORIZED_OPERATOR',
    });
  });

  it('exposes the supported relationship lifecycle statuses', () => {
    expect(ResourceRelationshipStatus).toEqual({
      ACTIVE: 'ACTIVE',
      EXPIRED: 'EXPIRED',
      TRANSFERRED: 'TRANSFERRED',
      REVOKED: 'REVOKED',
      TERMINATED: 'TERMINATED',
      SUSPENDED: 'SUSPENDED',
    });
  });

  it('supports an active relationship with no end date', () => {
    const relationship: ResourceRelationship = {
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-001',
      relationshipType: ResourceRelationshipType.OWNER,
      status: ResourceRelationshipStatus.ACTIVE,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      createdBy: 'user-001',
      updatedBy: 'user-001',
    };

    expect(relationship.resourceType).toBe('farm');
    expect(relationship.relationshipType).toBe(
      ResourceRelationshipType.OWNER,
    );
    expect(relationship.status).toBe(ResourceRelationshipStatus.ACTIVE);
    expect(relationship.validUntil).toBeUndefined();
    expect(relationship.endedAt).toBeUndefined();
  });

  it('supports a historical relationship with lifecycle end data', () => {
    const relationship: ResourceRelationship = {
      resourceType: 'farm',
      resourceId: 'farm-001',
      userId: 'user-002',
      relationshipType: ResourceRelationshipType.LESSEE,
      status: ResourceRelationshipStatus.TERMINATED,
      validFrom: new Date('2025-06-01T00:00:00.000Z'),
      validUntil: new Date('2026-05-31T23:59:59.999Z'),
      endedAt: new Date('2026-05-31T23:59:59.999Z'),
      endedReason: 'Lease ended',
      createdBy: 'admin-001',
      updatedBy: 'admin-002',
    };

    expect(relationship.status).toBe(
      ResourceRelationshipStatus.TERMINATED,
    );
    expect(relationship.endedReason).toBe('Lease ended');
    expect(relationship.createdBy).toBe('admin-001');
    expect(relationship.updatedBy).toBe('admin-002');
  });
});
