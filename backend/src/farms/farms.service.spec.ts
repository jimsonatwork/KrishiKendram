import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { FarmsService } from './farms.service';

describe('FarmsService', () => {
  let service: FarmsService;

  const prisma = {
    $transaction: jest.fn(),
    farm: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    farmAsset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    entity: {
      create: jest.fn(),
    },
    farmRecord: {
      create: jest.fn(),
    },
  } as any;

  const authorization = {
    assertCan: jest.fn(),
  } as any;

  const registry = {
    validateResourceField: jest.fn(),
  } as any;

  const relationships = {
    createOwnerRelationship: jest.fn(),
    terminateResourceRelationships: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          entity: prisma.entity,
          farm: prisma.farm,
          farmAsset: prisma.farmAsset,
          farmRecord: prisma.farmRecord,
        }),
    );

    service = new FarmsService(
      prisma,
      authorization,
      registry,
      relationships,
    );
  });

  it('authorizes before reading the protected farm payload', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
      name: 'Green Valley',
      assets: [],
      records: [],
      owner: {
        id: 'user-1',
        name: 'Jimson',
        email: 'farmer@example.com',
      },
    };

    prisma.farm.findUnique
      .mockResolvedValueOnce({
        id: 'farm-1',
        ownerId: 'user-1',
      })
      .mockResolvedValueOnce(farm);

    const result = await service.findOne(
      'farm-1',
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farm.findUnique).toHaveBeenCalledTimes(2);

    expect(prisma.farm.findUnique.mock.calls[0][0]).toEqual({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      resourceId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(prisma.farm.findUnique.mock.calls[1][0]).toEqual({
      where: {
        id: 'farm-1',
      },
      include: {
        assets: true,
        records: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    expect(result).toEqual(farm);
  });

  it('does not load the protected farm payload when authorization is denied', async () => {
    prisma.farm.findUnique.mockResolvedValueOnce({
      id: 'farm-1',
      ownerId: 'owner-1',
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.findOne(
        'farm-1',
        'user-2',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(prisma.farm.findUnique).toHaveBeenCalledTimes(1);

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });
  });

  it('does not authorize or load a protected payload when the farm does not exist', async () => {
    prisma.farm.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.findOne(
        'missing-farm',
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Farm not found');

    expect(prisma.farm.findUnique).toHaveBeenCalledTimes(1);
    expect(authorization.assertCan).not.toHaveBeenCalled();

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'missing-farm',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });
  });

  it('authorizes before reading the current user farms', async () => {
    prisma.farm.findMany.mockResolvedValue([]);

    await service.findMyFarms(
      'user-1',
      UserRole.FARMER,
    );

    const authorizationOrder =
      authorization.assertCan.mock.invocationCallOrder[0];

    const queryOrder =
      prisma.farm.findMany.mock.invocationCallOrder[0];

    expect(authorizationOrder).toBeLessThan(queryOrder);

    expect(
      authorization.assertCan,
    ).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      ownerId: 'user-1',
    });
  });

  it('preserves the owner filter and farm response shape', async () => {
    const farms = [
      {
        id: 'farm-1',
        ownerId: 'user-1',
        assets: [],
        records: [],
      },
    ];

    prisma.farm.findMany.mockResolvedValue(farms);

    const result = await service.findMyFarms(
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farm.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'user-1',
      },
      include: {
        assets: true,
        records: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(result).toEqual(farms);
  });

  it('does not query farms when authorization denies access', async () => {
    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.findMyFarms(
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(prisma.farm.findMany).not.toHaveBeenCalled();
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
      createdAt: new Date('2026-09-26T00:00:00Z'),
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
    expect(relationships.createOwnerRelationship).toHaveBeenCalledWith(
      expect.anything(),
      'farm',
      'farm-1',
      'user-1',
      createdFarm.createdAt,
    );

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

  it('authorizes farm update using minimal context before validation and mutation', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    prisma.farm.update.mockResolvedValue({
      id: 'farm-1',
      name: 'Green Valley',
    });

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Green Valley',
      errors: [],
    });

    await service.update(
      'farm-1',
      'user-1',
      UserRole.FARMER,
      {
        name: 'Green Valley',
      },
    );

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.UPDATE,
      resourceId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(
      authorization.assertCan.mock.invocationCallOrder[0],
    ).toBeLessThan(
      registry.validateResourceField.mock.invocationCallOrder[0],
    );

    expect(
      registry.validateResourceField.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.farm.update.mock.invocationCallOrder[0],
    );
  });

  it('does not validate or mutate a farm when update authorization is denied', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.update(
        'farm-1',
        'user-2',
        UserRole.FARMER,
        {
          name: 'Unauthorized Farm',
        },
      ),
    ).rejects.toThrow('Forbidden');

    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farm.update).not.toHaveBeenCalled();
  });

  it('does not authorize or mutate when the farm does not exist during update', async () => {
    prisma.farm.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.update(
        'missing-farm',
        'user-1',
        UserRole.FARMER,
        {
          name: 'Missing Farm',
        },
      ),
    ).rejects.toThrow('Farm not found');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farm.update).not.toHaveBeenCalled();
  });

  it('authorizes farm removal using minimal context before deletion', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    const txDelete = jest.fn().mockResolvedValue({
      id: 'farm-1',
    });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<unknown>) =>
        callback({ farm: { delete: txDelete } }),
    );

    await service.remove(
      'farm-1',
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.DELETE,
      resourceId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(
      relationships.terminateResourceRelationships,
    ).toHaveBeenCalledWith(
      expect.anything(),
      'farm',
      'farm-1',
      expect.any(Date),
      'Farm deleted',
    );
    expect(txDelete).toHaveBeenCalledWith({
      where: { id: 'farm-1' },
    });
  });

  it('does not delete a farm when removal authorization is denied', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.remove(
        'farm-1',
        'user-2',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(prisma.farm.delete).not.toHaveBeenCalled();
  });

  it('does not authorize or delete when the farm does not exist during removal', async () => {
    prisma.farm.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.remove(
        'missing-farm',
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Farm not found');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(prisma.farm.delete).not.toHaveBeenCalled();
  });

  it('uses central Registry values for all farm asset fields when creating an asset', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const metadata = {
      year: 2025,
      model: '575 DI',
    };

    const createdAsset = {
      id: 'asset-1',
      farmId: 'farm-1',
      type: 'TRACTOR',
      name: 'Main Tractor',
      quantity: 1,
      unit: 'count',
      metadata,
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmAsset.create.mockResolvedValue(createdAsset);

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value:
          field === 'type'
            ? 'TRACTOR'
            : field === 'name'
              ? 'Main Tractor'
              : field === 'quantity'
                ? 1
                : field === 'unit'
                  ? 'count'
                  : metadata,
        errors: [],
      }),
    );

    const result = await service.addAsset(
      'farm-1',
      {
        type: '  TRACTOR  ',
        name: '  Main Tractor  ',
        quantity: 1,
        unit: '  count  ',
        metadata,
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'type',
      '  TRACTOR  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'name',
      '  Main Tractor  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'quantity',
      1,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'unit',
      '  count  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'metadata',
      metadata,
    );

    expect(prisma.farmAsset.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        type: 'TRACTOR',
        name: 'Main Tractor',
        quantity: 1,
        unit: 'count',
        metadata,
      },
    });

    expect(result).toEqual(createdAsset);
  });

  it('allows a farm asset without optional fields', async () => {
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

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'TRACTOR',
      errors: [],
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
    ).toHaveBeenCalledTimes(1);

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'type',
      'TRACTOR',
    );

    expect(prisma.farmAsset.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        type: 'TRACTOR',
      },
    });
  });

  it('rejects a farm asset when the central Registry rejects a field', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => {
        if (field === 'quantity') {
          return {
            valid: false,
            value,
            errors: [
              'Field must be a valid number.',
            ],
          };
        }

        return {
          valid: true,
          value,
          errors: [],
        };
      },
    );

    await expect(
      service.addAsset(
        'farm-1',
        {
          type: 'TRACTOR',
          quantity: Number.NaN,
        },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.farmAsset.create).not.toHaveBeenCalled();

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'quantity',
      Number.NaN,
    );
  });

  it('authorizes farm asset creation using minimal farm context before validation and creation', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value,
        errors: [],
      }),
    );

    prisma.farmAsset.create.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      type: 'TRACTOR',
      name: 'John Deere',
    });

    await service.addAsset(
      'farm-1',
      {
        type: 'TRACTOR',
        name: 'John Deere',
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
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

    expect(
      authorization.assertCan.mock.invocationCallOrder[0],
    ).toBeLessThan(
      registry.validateResourceField.mock.invocationCallOrder[0],
    );

    expect(
      registry.validateResourceField.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.farmAsset.create.mock.invocationCallOrder[0],
    );

    expect(prisma.farmAsset.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        type: 'TRACTOR',
        name: 'John Deere',
      },
    });
  });

  it('does not validate or create a farm asset when authorization denies access', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.addAsset(
        'farm-1',
        {
          type: 'TRACTOR',
          name: 'John Deere',
        },
        'user-2',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farmAsset.create).not.toHaveBeenCalled();

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });
  });

  it('does not authorize, validate, or create a farm asset when the farm does not exist', async () => {
    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.addAsset(
        'missing-farm',
        {
          type: 'TRACTOR',
          name: 'John Deere',
        },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Farm not found');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farmAsset.create).not.toHaveBeenCalled();

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'missing-farm',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });
  });

  it('authorizes farm asset update using minimal context before validation and mutation', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
    });

    prisma.farmAsset.update.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
    });

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'TRACTOR',
      errors: [],
    });

    await service.updateAsset(
      'farm-1',
      'asset-1',
      { type: 'TRACTOR' },
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farmAsset.findUnique).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      select: {
        id: true,
        farmId: true,
        farm: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.UPDATE,
      resourceId: 'asset-1',
      farmId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(
      authorization.assertCan.mock.invocationCallOrder[0],
    ).toBeLessThan(
      registry.validateResourceField.mock.invocationCallOrder[0],
    );

    expect(
      registry.validateResourceField.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.farmAsset.update.mock.invocationCallOrder[0],
    );
  });

  it('does not validate or mutate a farm asset when update authorization is denied', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.updateAsset(
        'farm-1',
        'asset-1',
        { type: 'TRACTOR' },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farmAsset.update).not.toHaveBeenCalled();
  });

  it('rejects cross-farm asset update before authorization or mutation', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-2',
      farm: {
        id: 'farm-2',
        ownerId: 'user-2',
      },
    });

    await expect(
      service.updateAsset(
        'farm-1',
        'asset-1',
        { type: 'TRACTOR' },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Asset not found');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farmAsset.update).not.toHaveBeenCalled();
  });

  it('authorizes farm asset removal using minimal context before deletion', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
    });

    prisma.farmAsset.delete.mockResolvedValue({
      id: 'asset-1',
    });

    await service.removeAsset(
      'farm-1',
      'asset-1',
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farmAsset.findUnique).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      select: {
        id: true,
        farmId: true,
        farm: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.DELETE,
      resourceId: 'asset-1',
      farmId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(
      authorization.assertCan.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.farmAsset.delete.mock.invocationCallOrder[0],
    );
  });

  it('does not delete a farm asset when removal authorization is denied', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-1',
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.removeAsset(
        'farm-1',
        'asset-1',
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(prisma.farmAsset.delete).not.toHaveBeenCalled();
  });

  it('rejects cross-farm asset removal before authorization or deletion', async () => {
    prisma.farmAsset.findUnique.mockResolvedValue({
      id: 'asset-1',
      farmId: 'farm-2',
      farm: {
        id: 'farm-2',
        ownerId: 'user-2',
      },
    });

    await expect(
      service.removeAsset(
        'farm-1',
        'asset-1',
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Asset not found');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(prisma.farmAsset.delete).not.toHaveBeenCalled();
  });

  it('uses central Registry values for farm asset fields when updating an asset', async () => {
    const asset = {
      id: 'asset-1',
      farmId: 'farm-1',
      type: 'TRACTOR',
      name: 'Old Tractor',
      quantity: 1,
      unit: 'count',
      metadata: {
        year: 2024,
      },
      farm: {
        id: 'farm-1',
        ownerId: 'user-1',
      },
    };

    const metadata = {
      year: 2025,
      model: '575 DI',
    };

    const updatedAsset = {
      ...asset,
      type: 'TRACTOR',
      name: 'Main Tractor',
      quantity: 2,
      unit: 'count',
      metadata,
    };

    prisma.farmAsset.findUnique.mockResolvedValue(asset);
    prisma.farmAsset.update.mockResolvedValue(updatedAsset);

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value:
          field === 'type'
            ? 'TRACTOR'
            : field === 'name'
              ? 'Main Tractor'
              : field === 'quantity'
                ? 2
                : field === 'unit'
                  ? 'count'
                  : metadata,
        errors: [],
      }),
    );

    const result = await service.updateAsset(
      'farm-1',
      'asset-1',
      {
        type: '  TRACTOR  ',
        name: '  Main Tractor  ',
        quantity: 2,
        unit: '  count  ',
        metadata,
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'type',
      '  TRACTOR  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'name',
      '  Main Tractor  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'quantity',
      2,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'unit',
      '  count  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmAsset',
      'metadata',
      metadata,
    );

    expect(prisma.farmAsset.update).toHaveBeenCalledWith({
      where: {
        id: 'asset-1',
      },
      data: {
        type: 'TRACTOR',
        name: 'Main Tractor',
        quantity: 2,
        unit: 'count',
        metadata,
      },
    });

    expect(result).toEqual(updatedAsset);
  });

  it('keeps authorization before farm asset validation', async () => {
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
        quantity: 1,
        unit: 'count',
        metadata: {
          year: 2025,
        },
      },
      'user-1',
      UserRole.FARMER,
    );

    const authorizationOrder =
      authorization.assertCan.mock.invocationCallOrder[0];

    const registryOrder =
      registry.validateResourceField.mock
        .invocationCallOrder[0];

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

  it('uses central Registry values for all farm record fields when creating a record', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const inputMethod = 'MANUAL' as any;

    const inputData = {
      source: 'field observation',
      moisture: 42,
    };

    const normalizedData = {
      source: 'field observation',
      moisture: 42,
    };

    const createdRecord = {
      id: 'record-1',
      farmId: 'farm-1',
      category: 'OBSERVATION',
      title: 'Soil Check',
      inputMethod,
      data: normalizedData,
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmRecord = {
      create: jest.fn().mockResolvedValue(createdRecord),
    };

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value:
          field === 'category'
            ? 'OBSERVATION'
            : field === 'title'
              ? 'Soil Check'
              : field === 'inputMethod'
                ? inputMethod
                : normalizedData,
        errors: [],
      }),
    );

    const result = await service.addRecord(
      'farm-1',
      {
        category: '  OBSERVATION  ',
        title: '  Soil Check  ',
        inputMethod,
        data: inputData,
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'category',
      '  OBSERVATION  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'title',
      '  Soil Check  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'inputMethod',
      inputMethod,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'data',
      inputData,
    );

    expect(
      prisma.farmRecord.create,
    ).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        category: 'OBSERVATION',
        title: 'Soil Check',
        inputMethod,
        data: normalizedData,
      },
    });

    expect(result).toEqual(createdRecord);
  });

  it('allows a farm record with an optional title omitted', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const inputMethod = 'MANUAL' as any;
    const inputData = {
      note: 'No title',
    };

    const createdRecord = {
      id: 'record-1',
      farmId: 'farm-1',
      category: 'OBSERVATION',
      inputMethod,
      data: inputData,
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmRecord = {
      create: jest.fn().mockResolvedValue(createdRecord),
    };

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value,
        errors: [],
      }),
    );

    const result = await service.addRecord(
      'farm-1',
      {
        category: 'OBSERVATION',
        inputMethod,
        data: inputData,
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledTimes(3);

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'category',
      'OBSERVATION',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'inputMethod',
      inputMethod,
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'data',
      inputData,
    );

    expect(
      prisma.farmRecord.create,
    ).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        category: 'OBSERVATION',
        title: undefined,
        inputMethod,
        data: inputData,
      },
    });

    expect(result).toEqual(createdRecord);
  });

  it('rejects a farm record when the central Registry rejects a field', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const inputMethod = 'MANUAL' as any;
    const inputData = {
      note: 'Invalid record',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmRecord = {
      create: jest.fn(),
    };

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => {
        if (field === 'data') {
          return {
            valid: false,
            value,
            errors: [
              'Field must be a valid object.',
            ],
          };
        }

        return {
          valid: true,
          value,
          errors: [],
        };
      },
    );

    await expect(
      service.addRecord(
        'farm-1',
        {
          category: 'OBSERVATION',
          inputMethod,
          data: inputData,
        },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.farmRecord.create,
    ).not.toHaveBeenCalled();

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'farmRecord',
      'data',
      inputData,
    );
  });

  it('authorizes farm record creation using minimal farm context before validation and creation', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value,
        errors: [],
      }),
    );

    prisma.farmRecord.create.mockResolvedValue({
      id: 'record-1',
      farmId: 'farm-1',
      category: 'ACTIVITY',
      inputMethod: 'MANUAL',
      data: { note: 'Irrigation completed' },
      title: 'Irrigation',
    });

    await service.addRecord(
      'farm-1',
      {
        category: 'ACTIVITY',
        inputMethod: 'MANUAL',
        data: { note: 'Irrigation completed' },
        title: 'Irrigation',
      },
      'user-1',
      UserRole.FARMER,
    );

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farmRecord',
      action: AuthorizationAction.CREATE,
      farmId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(
      authorization.assertCan.mock.invocationCallOrder[0],
    ).toBeLessThan(
      registry.validateResourceField.mock.invocationCallOrder[0],
    );

    expect(
      registry.validateResourceField.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.farmRecord.create.mock.invocationCallOrder[0],
    );

    expect(prisma.farmRecord.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        category: 'ACTIVITY',
        inputMethod: 'MANUAL',
        data: { note: 'Irrigation completed' },
        title: 'Irrigation',
      },
    });
  });

  it('does not validate or create a farm record when authorization denies access', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'owner-1',
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.addRecord(
        'farm-1',
        {
          category: 'ACTIVITY',
          inputMethod: 'MANUAL',
          data: { note: 'Unauthorized record' },
          title: 'Unauthorized',
        },
        'user-2',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Forbidden');

    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farmRecord.create).not.toHaveBeenCalled();

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });
  });

  it('does not authorize, validate, or create a farm record when the farm does not exist', async () => {
    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.addRecord(
        'missing-farm',
        {
          category: 'ACTIVITY',
          inputMethod: 'MANUAL',
          data: { note: 'Missing farm' },
          title: 'Missing',
        },
        'user-1',
        UserRole.FARMER,
      ),
    ).rejects.toThrow('Farm not found');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(registry.validateResourceField).not.toHaveBeenCalled();
    expect(prisma.farmRecord.create).not.toHaveBeenCalled();

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'missing-farm',
      },
      select: {
        id: true,
        ownerId: true,
      },
    });
  });

  it('keeps authorization before farm record validation', async () => {
    const farm = {
      id: 'farm-1',
      ownerId: 'user-1',
    };

    const inputMethod = 'MANUAL' as any;
    const inputData = {
      note: 'Observation',
    };

    prisma.farm.findUnique.mockResolvedValue(farm);
    prisma.farmRecord = {
      create: jest.fn().mockResolvedValue({
        id: 'record-1',
      }),
    };

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'OBSERVATION',
      errors: [],
    });

    await service.addRecord(
      'farm-1',
      {
        category: 'OBSERVATION',
        inputMethod,
        data: inputData,
      },
      'user-1',
      UserRole.FARMER,
    );

    const authorizationOrder =
      authorization.assertCan.mock.invocationCallOrder[0];

    const registryOrder =
      registry.validateResourceField.mock
        .invocationCallOrder[0];

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
      resource: 'farmRecord',
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
