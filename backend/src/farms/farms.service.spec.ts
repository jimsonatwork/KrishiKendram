import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { FarmsService } from './farms.service';

describe('FarmsService', () => {
  let service: FarmsService;

  const prisma = {
    $transaction: jest.fn(),
    farm: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    farmAsset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    entity: {
      create: jest.fn(),
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

    service = new FarmsService(
      prisma,
      authorization,
      registry,
    );
  });

  it('uses the central Registry value when creating a farm', async () => {
    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Green Valley',
      errors: [],
    });

    const entity = {
      id: 'entity-1',
    };

    const createdFarm = {
      id: 'farm-1',
      name: 'Green Valley',
      ownerId: 'user-1',
      entityId: 'entity-1',
    };

    prisma.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          entity: {
            create: jest.fn().mockResolvedValue(entity),
          },
          farm: {
            create: jest.fn().mockResolvedValue(createdFarm),
          },
        }),
    );

    const result = await service.create(
      'user-1',
      UserRole.FARMER,
      {
        name: '  Green Valley  ',
      },
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farm',
      'name',
      '  Green Valley  ',
    );

    expect(result).toEqual(createdFarm);

    const transactionCallback =
      prisma.$transaction.mock.calls[0][0];

    const tx = {
      entity: {
        create: jest.fn().mockResolvedValue(entity),
      },
      farm: {
        create: jest.fn().mockResolvedValue(createdFarm),
      },
    };

    await transactionCallback(tx);

    expect(tx.farm.create).toHaveBeenCalledWith({
      data: {
        name: 'Green Valley',
        ownerId: 'user-1',
        entityId: 'entity-1',
      },
    });
  });

  it('uses the central Registry value when updating a farm name', async () => {
    const existingFarm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const updatedFarm = {
      ...existingFarm,
      name: 'Green Valley',
    };

    prisma.farm.findUnique.mockResolvedValue(existingFarm);
    prisma.farm.update.mockResolvedValue(updatedFarm);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Green Valley',
      errors: [],
    });

    const result = await service.update(
      'farm-1',
      'user-1',
      UserRole.FARMER,
      {
        name: '  Green Valley  ',
      },
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farm',
      'name',
      '  Green Valley  ',
    );

    expect(prisma.farm.update).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      data: {
        name: 'Green Valley',
      },
    });

    expect(result).toEqual(updatedFarm);
  });

  it('rejects a farm name when the central Registry rejects it', async () => {
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
          name: '   ',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses the central Registry value when updating a farm location', async () => {
    const existingFarm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const updatedFarm = {
      ...existingFarm,
      location: 'Hyderabad',
    };

    prisma.farm.findUnique.mockResolvedValue(existingFarm);
    prisma.farm.update.mockResolvedValue(updatedFarm);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Hyderabad',
      errors: [],
    });

    const result = await service.update(
      'farm-1',
      'user-1',
      UserRole.FARMER,
      {
        location: '  Hyderabad  ',
      },
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farm',
      'location',
      '  Hyderabad  ',
    );

    expect(prisma.farm.update).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      data: {
        location: 'Hyderabad',
      },
    });

    expect(result).toEqual(updatedFarm);
  });

  it('uses the central Registry value when creating a farm asset', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const createdAsset = {
      id: 'asset-1',
      farmId: 'farm-1',
      type: 'TRACTOR',
      name: 'Main Tractor',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmAsset.create.mockResolvedValue(createdAsset);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Main Tractor',
      errors: [],
    });

    const result = await service.addAsset(
      'farm-1',
      {
        type: 'TRACTOR',
        name: '  Main Tractor  ',
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'name',
      '  Main Tractor  ',
    );

    expect(prisma.farmAsset.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        type: 'TRACTOR',
        name: 'Main Tractor',
      },
    });

    expect(result).toEqual(createdAsset);
  });

  it('allows a farm asset without a name', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmAsset.create.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      type: 'TRACTOR',
    });

    await service.addAsset(
      'farm-1',
      {
        type: 'TRACTOR',
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).not.toHaveBeenCalled();

    expect(prisma.farmAsset.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        type: 'TRACTOR',
      },
    });
  });

  it('rejects a farm asset name when the central Registry rejects it', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);

    registry.validateResourceField.mockReturnValue({
      valid: false,
      value: 'x'.repeat(101),
      errors: [
        'Field must be at most 100 characters long.',
      ],
    });

    await expect(
      service.addAsset(
        'farm-1',
        {
          type: 'TRACTOR',
          name: 'x'.repeat(101),
        },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.farmAsset.create).not.toHaveBeenCalled();
  });

  it('uses the central Registry value when updating a farm asset name', async () => {
    const asset = {
      id: 'asset-1',
      farmId: 'farm-1',
      name: 'Old Tractor',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
    };

    const updatedAsset = {
      ...asset,
      name: 'Main Tractor',
    };

    prisma.farmAsset.findUnique.mockResolvedValue(asset);
    prisma.farmAsset.update.mockResolvedValue(updatedAsset);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Main Tractor',
      errors: [],
    });

    const result = await service.updateAsset(
      'farm-1',
      'asset-1',
      {
        type: 'TRACTOR',
        name: '  Main Tractor  ',
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'name',
      '  Main Tractor  ',
    );

    expect(prisma.farmAsset.update).toHaveBeenCalledWith({
      where: {
        id: 'asset-1',
      },
      data: {
        type: 'TRACTOR',
        name: 'Main Tractor',
      },
    });

    expect(result).toEqual(updatedAsset);
  });

  it('keeps authorization before farm asset name validation', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmAsset.create.mockResolvedValue({
      id: 'asset-1',
    });

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Main Tractor',
      errors: [],
    });

    await service.addAsset(
      'farm-1',
      {
        type: 'TRACTOR',
        name: '  Main Tractor  ',
      },
      'user-1',
      UserRole.FARMER,
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
      resource: 'farmAsset',
      action: AuthorizationAction.CREATE,
      farmId: 'farm-1',
      ownerId: 'user-1',
    });
  });

  it('keeps authorization before farm creation', async () => {
    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Green Valley',
      errors: [],
    });

    prisma.$transaction.mockResolvedValue({
      id: 'farm-1',
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        name: '  Green Valley  ',
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
      resource: 'farm',
      action: AuthorizationAction.CREATE,
      ownerId: 'user-1',
    });
  });
});
