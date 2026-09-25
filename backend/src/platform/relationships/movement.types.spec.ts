import {
  ResourceMovementType,
  ResourceMovement,
} from './movement.types';

describe('ResourceMovement domain contract', () => {
  it('defines the PMD movement vocabulary including partial transfers', () => {
    expect(ResourceMovementType.SALE).toBe('SALE');
    expect(ResourceMovementType.PARTIAL_SALE).toBe('PARTIAL_SALE');
    expect(ResourceMovementType.TRANSFER).toBe('TRANSFER');
    expect(ResourceMovementType.PARTIAL_TRANSFER).toBe('PARTIAL_TRANSFER');
    expect(ResourceMovementType.SPLIT).toBe('SPLIT');
    expect(ResourceMovementType.MERGE).toBe('MERGE');
  });

  it('keeps movement facts separate from authorization concepts', () => {
    const movement: ResourceMovement = {
      resourceType: 'farm',
      resourceId: 'farm-001',
      movementType: ResourceMovementType.PARTIAL_TRANSFER,
      sourceUserId: 'user-001',
      destinationUserId: 'user-002',
      quantity: 2.5,
      unit: 'acre',
      effectiveAt: new Date('2026-09-26T00:00:00.000Z'),
      recordedAt: new Date('2026-09-26T01:00:00.000Z'),
      transactionId: 'txn-001',
      evidenceId: 'evidence-001',
      previousMovementId: 'movement-000',
      createdBy: 'admin-001',
      updatedBy: 'admin-001',
    };

    expect(movement.movementType).toBe(
      ResourceMovementType.PARTIAL_TRANSFER,
    );
    expect(movement.quantity).toBe(2.5);
    expect(movement.previousMovementId).toBe('movement-000');
  });
});
