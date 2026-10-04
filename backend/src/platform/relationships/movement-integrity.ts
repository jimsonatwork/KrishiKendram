import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ResourceMovementType } from './movement.types';
import { ResourceLineageType } from './lineage.types';

/**
 * Single write gate for movement and lineage records.
 * Temporal ordering remains enforced by the business workflow before this gate;
 * this gate prevents malformed source/destination/lineage facts from bypassing it.
 */
export async function createResourceMovement(
  tx: Prisma.TransactionClient,
  args: Prisma.ResourceMovementCreateArgs,
) {
  const data = args.data as Prisma.ResourceMovementUncheckedCreateInput;
  validateMovement(data);
  return tx.resourceMovement.create(args);
}

export async function createResourceLineage(
  tx: Prisma.TransactionClient,
  args: Prisma.ResourceLineageCreateArgs,
) {
  const data = args.data as Prisma.ResourceLineageUncheckedCreateInput;
  validateLineage(data);
  return tx.resourceLineage.create(args);
}

export function validateMovement(
  data: Prisma.ResourceMovementUncheckedCreateInput,
): void {
  if (!data.resourceType?.trim() || !data.resourceId?.trim()) {
    throw new BadRequestException('Movement resource identity is required.');
  }
  if (!(data.effectiveAt instanceof Date) || Number.isNaN(data.effectiveAt.getTime())) {
    throw new BadRequestException('Movement effectiveAt is invalid.');
  }
  if (data.quantity !== null && data.quantity !== undefined && data.quantity <= 0) {
    throw new BadRequestException('Movement quantity must be greater than zero.');
  }

  const type = data.movementType as ResourceMovementType;
  if (type === ResourceMovementType.SPLIT || type === ResourceMovementType.MERGE) {
    if (!data.sourceResourceType || !data.sourceResourceId || !data.destinationResourceType || !data.destinationResourceId) {
      throw new BadRequestException('Split/merge movement must identify source and destination resources.');
    }
    if (
      data.destinationResourceType !== data.resourceType ||
      data.destinationResourceId !== data.resourceId
    ) {
      throw new BadRequestException('Movement destination must match the movement resource.');
    }
  }

  if (type === ResourceMovementType.TRANSFER || type === ResourceMovementType.PARTIAL_TRANSFER) {
    if (!data.sourceUserId || !data.destinationUserId) {
      throw new BadRequestException('Transfer movement must identify source and destination users.');
    }
    if (!data.sourceRelationshipId || !data.destinationRelationshipId) {
      throw new BadRequestException('Transfer movement must identify source and destination relationships.');
    }
  }

  if (type === ResourceMovementType.CUSTODY_CHANGE || type === ResourceMovementType.LEASE) {
    if (!data.destinationUserId || !data.destinationRelationshipId) {
      throw new BadRequestException('Relationship movement must identify its destination user and relationship.');
    }
  }

  if (type === ResourceMovementType.LEASE_END && !data.sourceRelationshipId) {
    throw new BadRequestException('Lease-end movement must identify the ended relationship.');
  }

  if (type === ResourceMovementType.RETURN && (!data.sourceUserId || !data.destinationUserId)) {
    throw new BadRequestException('Return movement must identify source and destination users.');
  }
}

export function validateLineage(
  data: Prisma.ResourceLineageUncheckedCreateInput,
): void {
  if (!data.sourceResourceType?.trim() || !data.sourceResourceId?.trim()) {
    throw new BadRequestException('Lineage source resource identity is required.');
  }
  if (!data.targetResourceType?.trim() || !data.targetResourceId?.trim()) {
    throw new BadRequestException('Lineage target resource identity is required.');
  }
  if (data.sourceResourceType === data.targetResourceType && data.sourceResourceId === data.targetResourceId) {
    throw new BadRequestException('Lineage source and target cannot be the same resource.');
  }
  if (!data.movementId) {
    throw new BadRequestException('Lineage must be tied to a movement.');
  }
  if (!(data.effectiveAt instanceof Date) || Number.isNaN(data.effectiveAt.getTime())) {
    throw new BadRequestException('Lineage effectiveAt is invalid.');
  }
  if (data.quantity !== null && data.quantity !== undefined && data.quantity <= 0) {
    throw new BadRequestException('Lineage quantity must be greater than zero.');
  }

  const type = data.lineageType as ResourceLineageType;
  if (!Object.values(ResourceLineageType).includes(type)) {
    throw new BadRequestException('Lineage type is invalid.');
  }
}
