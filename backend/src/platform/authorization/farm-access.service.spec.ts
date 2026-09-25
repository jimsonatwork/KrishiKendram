import { FarmAccessService } from './farm-access.service';

describe('FarmAccessService', () => {
  const prisma = {
    farm: {
      findUnique: jest.fn(),
    },
  };

  let service: FarmAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FarmAccessService(prisma as any);
  });

  it('resolves current farm ownership as an allowed OWNER decision', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: true,
      source: 'OWNER',
    });

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        ownerId: true,
      },
    });
  });

  it('resolves a non-owner as denied without changing ownership data', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-2',
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: false,
      source: 'NONE',
    });
  });

  it('resolves a missing farm as denied', async () => {
    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.resolveAccess('user-1', 'missing-farm'),
    ).resolves.toEqual({
      allowed: false,
      source: 'NONE',
    });
  });

  it('preserves the existing boolean canAccess contract', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.canAccess('user-1', 'farm-1'),
    ).resolves.toBe(true);

    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-2',
    });

    await expect(
      service.canAccess('user-1', 'farm-1'),
    ).resolves.toBe(false);
  });
});
