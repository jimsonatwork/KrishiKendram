import { NotFoundException } from '@nestjs/common';
import { assertFarmActive } from './farm-asset-active.guard';

describe('assertFarmActive', () => {
  it('checks the active-parent predicate in the supplied transaction', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'farm-1' });
    await expect(assertFarmActive({ farm: { findFirst } }, 'farm-1')).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'farm-1', deletedAt: null },
      select: { id: true },
    });
  });

  it('fails closed when the farm was archived before the write transaction', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    await expect(assertFarmActive({ farm: { findFirst } }, 'farm-1')).rejects.toThrow(NotFoundException);
  });
});
