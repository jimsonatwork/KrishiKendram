import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { CropsService } from './crops.service';

describe('CropsService', () => {
  let service: CropsService;

  const prisma = {
    farm: {
      findUnique: jest.fn(),
    },
    crop: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const authorization = {
    assertCan: jest.fn(),
  } as any;

  const registry = {
    validateResourceField: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new CropsService(
      prisma,
      authorization,
      registry,
    );
  });

  it('uses the central Registry value when creating a crop', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const createdCrop = {
      id: 'crop-1',
      farmId: 'farm-1',
      name: 'Rice',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.crop.create.mockResolvedValue(createdCrop);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Rice',
      errors: [],
    });

    const result = await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        name: '  Rice  ',
        season: 'KHARIF' as any,
      },
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'crop',
      'name',
      '  Rice  ',
    );

    expect(prisma.crop.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        farmId: 'farm-1',
        name: 'Rice',
      }),
    });

    expect(result).toEqual(createdCrop);
  });

  it('uses the central Registry value when updating a crop name', async () => {
    const crop = {
      id: 'crop-1',
      farmId: 'farm-1',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
      deletedAt: null,
    };

    const updatedCrop = {
      ...crop,
      name: 'Rice',
    };

    prisma.crop.findFirst.mockResolvedValue(crop);
    prisma.crop.update.mockResolvedValue(updatedCrop);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Rice',
      errors: [],
    });

    const result = await service.update(
      'user-1',
      UserRole.FARMER,
      'crop-1',
      {
        name: '  Rice  ',
      },
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'crop',
      'name',
      '  Rice  ',
    );

    expect(prisma.crop.update).toHaveBeenCalledWith({
      where: {
        id: 'crop-1',
      },
      data: expect.objectContaining({
        name: 'Rice',
      }),
    });

    expect(result).toEqual(updatedCrop);
  });

  it('rejects a crop name when the central Registry rejects it', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);

    registry.validateResourceField.mockReturnValue({
      valid: false,
      value: '',
      errors: [
        'Field must be at least 1 characters long.',
      ],
    });

    await expect(
      service.create(
        'user-1',
        UserRole.FARMER,
        {
          farmId: 'farm-1',
          name: '   ',
          season: 'KHARIF' as any,
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.crop.create).not.toHaveBeenCalled();
  });

  it('does not validate the name when updating unrelated crop fields', async () => {
    const crop = {
      id: 'crop-1',
      farmId: 'farm-1',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
      deletedAt: null,
    };

    prisma.crop.findFirst.mockResolvedValue(crop);
    prisma.crop.update.mockResolvedValue({
      ...crop,
      variety: 'IR64',
    });

    await service.update(
      'user-1',
      UserRole.FARMER,
      'crop-1',
      {
        variety: 'IR64',
      },
    );

    expect(
      registry.validateResourceField,
    ).not.toHaveBeenCalled();

    expect(prisma.crop.update).toHaveBeenCalledWith({
      where: {
        id: 'crop-1',
      },
      data: expect.objectContaining({
        variety: 'IR64',
      }),
    });
  });

  it('keeps authorization before crop name validation', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.crop.create.mockResolvedValue({
      id: 'crop-1',
    });

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Rice',
      errors: [],
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        name: '  Rice  ',
        season: 'KHARIF' as any,
      },
    );

    const authorizationOrder =
      authorization.assertCan.mock.invocationCallOrder[0];

    const registryOrder =
      registry.validateResourceField.mock.invocationCallOrder[0];

    expect(authorizationOrder).toBeLessThan(
      registryOrder,
    );

    expect(
      authorization.assertCan,
    ).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.CREATE,
      farmId: 'farm-1',
      ownerId: 'user-1',
    });
  });
});
