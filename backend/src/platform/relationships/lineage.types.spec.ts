import { ResourceLineageType, ResourceLineage } from './lineage.types';

describe('ResourceLineage domain contract', () => {
  it('defines continuity relationships for split, merge and transfer', () => {
    expect(ResourceLineageType.DERIVED_FROM).toBe('DERIVED_FROM');
    expect(ResourceLineageType.SPLIT_FROM).toBe('SPLIT_FROM');
    expect(ResourceLineageType.MERGED_FROM).toBe('MERGED_FROM');
    expect(ResourceLineageType.TRANSFERRED_FROM).toBe('TRANSFERRED_FROM');
  });

  it('can represent a partial resource lineage with movement linkage', () => {
    const lineage: ResourceLineage = {
      sourceResourceType: 'farm',
      sourceResourceId: 'farm-001',
      targetResourceType: 'farm',
      targetResourceId: 'farm-002',
      lineageType: ResourceLineageType.SPLIT_FROM,
      movementId: 'movement-001',
      quantity: 2.5,
      unit: 'acre',
      effectiveAt: new Date('2026-09-26T00:00:00.000Z'),
      createdBy: 'admin-001',
      updatedBy: 'admin-001',
    };

    expect(lineage.lineageType).toBe(ResourceLineageType.SPLIT_FROM);
    expect(lineage.movementId).toBe('movement-001');
    expect(lineage.quantity).toBe(2.5);
  });
});
