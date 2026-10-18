import { NotFoundException } from '@nestjs/common';

/** Fail closed when a farm is archived, including inside composite write transactions. */
export async function assertFarmActive(tx: any, farmId: string): Promise<void> {
  const farm = await tx.farm.findFirst({
    where: { id: farmId, deletedAt: null },
    select: { id: true },
  });
  if (!farm) throw new NotFoundException('Farm not found or archived');
}
