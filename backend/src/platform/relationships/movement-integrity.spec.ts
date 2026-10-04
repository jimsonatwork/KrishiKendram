import { BadRequestException } from '@nestjs/common';

import { createResourceLineage, createResourceMovement, validateLineage, validateMovement } from './movement-integrity';

describe('movement integrity gate', () => {
  it('rejects split movements whose destination does not match the movement resource', () => {
    expect(() => validateMovement({
      resourceType: 'farmAsset', resourceId: 'target-1', movementType: 'SPLIT',
      sourceResourceType: 'farmAsset', sourceResourceId: 'source-1',
      destinationResourceType: 'farmAsset', destinationResourceId: 'wrong-target',
      effectiveAt: new Date('2026-09-30T00:00:00Z'), createdBy: 'u1', updatedBy: 'u1',
    } as any)).toThrow(BadRequestException);
  });

  it('rejects transfers without both relationship endpoints', () => {
    expect(() => validateMovement({
      resourceType: 'farm', resourceId: 'farm-1', movementType: 'TRANSFER',
      sourceUserId: 'u1', destinationUserId: 'u2', sourceRelationshipId: 'rel-1',
      effectiveAt: new Date('2026-09-30T00:00:00Z'), createdBy: 'u1', updatedBy: 'u1',
    } as any)).toThrow('Transfer movement must identify source and destination relationships.');
  });

  it('rejects lineage that is not attached to a movement', () => {
    expect(() => validateLineage({
      sourceResourceType: 'farmAsset', sourceResourceId: 'source-1',
      targetResourceType: 'farmAsset', targetResourceId: 'target-1',
      lineageType: 'SPLIT_FROM', effectiveAt: new Date('2026-09-30T00:00:00Z'),
      createdBy: 'u1', updatedBy: 'u1',
    } as any)).toThrow('Lineage must be tied to a movement.');
  });

  it('routes movement and lineage writes through the transaction client', async () => {
    const movementCreate = jest.fn().mockResolvedValue({ id: 'movement-1' });
    const lineageCreate = jest.fn().mockResolvedValue({ id: 'lineage-1' });
    const tx = { resourceMovement: { create: movementCreate }, resourceLineage: { create: lineageCreate } } as any;

    await createResourceMovement(tx, { data: {
      resourceType: 'farmAsset', resourceId: 'asset-1', movementType: 'CUSTODY_CHANGE',
      destinationUserId: 'u2', destinationRelationshipId: 'rel-2',
      effectiveAt: new Date('2026-09-30T00:00:00Z'), createdBy: 'u1', updatedBy: 'u1',
    } } as any);
    await createResourceLineage(tx, { data: {
      sourceResourceType: 'farmAsset', sourceResourceId: 'asset-1',
      targetResourceType: 'farmAsset', targetResourceId: 'asset-2',
      lineageType: 'SPLIT_FROM', movementId: 'movement-1',
      effectiveAt: new Date('2026-09-30T00:00:00Z'), createdBy: 'u1', updatedBy: 'u1',
    } } as any);

    expect(movementCreate).toHaveBeenCalledTimes(1);
    expect(lineageCreate).toHaveBeenCalledTimes(1);
  });
});
