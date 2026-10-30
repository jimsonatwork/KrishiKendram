import { CropStatus } from '@prisma/client';
import { isCropStatusTransitionAllowed } from './crop-lifecycle.policy';

describe('crop lifecycle policy', () => {
  it('allows forward progress while permitting skipped observations', () => {
    expect(isCropStatusTransitionAllowed(CropStatus.PLANNED, CropStatus.SOWN)).toBe(true);
    expect(isCropStatusTransitionAllowed(CropStatus.SOWN, CropStatus.FLOWERING)).toBe(true);
    expect(isCropStatusTransitionAllowed(CropStatus.FRUITING, CropStatus.HARVEST_READY)).toBe(true);
  });

  it('allows a crop to be marked failed from an active stage', () => {
    expect(isCropStatusTransitionAllowed(CropStatus.GROWING, CropStatus.FAILED)).toBe(true);
  });

  it('rejects backward movement and reopening terminal stages', () => {
    expect(isCropStatusTransitionAllowed(CropStatus.FLOWERING, CropStatus.GROWING)).toBe(false);
    expect(isCropStatusTransitionAllowed(CropStatus.HARVESTED, CropStatus.GROWING)).toBe(false);
    expect(isCropStatusTransitionAllowed(CropStatus.FAILED, CropStatus.SOWN)).toBe(false);
  });

  it('keeps archive status reserved for the archive lifecycle endpoint', () => {
    expect(isCropStatusTransitionAllowed(CropStatus.PLANNED, CropStatus.ARCHIVED)).toBe(false);
  });

  it('treats a repeated status as an idempotent no-op', () => {
    expect(isCropStatusTransitionAllowed(CropStatus.GROWING, CropStatus.GROWING)).toBe(true);
  });
});
