import { CropStatus } from '@prisma/client';

const CROP_PROGRESSION: readonly CropStatus[] = [
  CropStatus.PLANNED,
  CropStatus.SOWN,
  CropStatus.GERMINATED,
  CropStatus.GROWING,
  CropStatus.FLOWERING,
  CropStatus.FRUITING,
  CropStatus.HARVEST_READY,
  CropStatus.HARVESTED,
];

const TERMINAL_STATUSES = new Set<CropStatus>([
  CropStatus.HARVESTED,
  CropStatus.FAILED,
  CropStatus.ARCHIVED,
]);

/**
 * Farmers may record a later observed stage without entering every missed
 * intermediate stage, but the lifecycle cannot move backwards. FAILED is
 * reachable from any active stage. ARCHIVED remains a system lifecycle state
 * controlled by the archive endpoint, never by a status update payload.
 */
export function isCropStatusTransitionAllowed(
  current: CropStatus,
  next: CropStatus,
): boolean {
  if (current === next) return true;
  if (next === CropStatus.ARCHIVED) return false;
  if (current === CropStatus.ARCHIVED || TERMINAL_STATUSES.has(current)) {
    return false;
  }
  if (next === CropStatus.FAILED) return true;

  const currentIndex = CROP_PROGRESSION.indexOf(current);
  const nextIndex = CROP_PROGRESSION.indexOf(next);
  return currentIndex >= 0 && nextIndex > currentIndex;
}
