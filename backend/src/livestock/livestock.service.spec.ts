import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { LivestockService } from './livestock.service';

describe('LivestockService', () => {
  let service: LivestockService;

  const prisma = {
    farm: { findUnique: jest.fn(), findFirst: jest.fn() },
    livestock: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    resourceRelationship: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  const authorization = { assertCan: jest.fn() } as any;

  const registry = {
    validateResourceField: jest.fn(),
  } as any;

  const relationships = {
    createOwnerRelationship: jest.fn(),
    terminateResourceRelationships: jest.fn(),
    listResourceRelationshipHistory: jest.fn(),
  } as any;

  const audit = {
    createInTransaction: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          farm: prisma.farm,
          livestock: prisma.livestock,
        }),
    );

    authorization.assertCan.mockResolvedValue(undefined);
    prisma.farm.findFirst.mockResolvedValue({ id: 'farm-1' });
    relationships.createOwnerRelationship.mockResolvedValue(undefined);
    relationships.terminateResourceRelationships.mockResolvedValue(undefined);
    audit.createInTransaction.mockResolvedValue(undefined);

    registry.validateResourceField.mockImplementation(
      (_resource: string, _field: string, value: unknown) => ({
        valid: true,
        value:
          typeof value === 'string'
            ? value.trim()
            : value,
        errors: [],
      }),
    );

    service = new LivestockService(
      prisma,
      authorization,
      registry,
      relationships,
      audit,
    );
  });

  it('creates livestock through Registry validation and records ownership/audit', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    const created = {
      id: 'livestock-1',
      farmId: 'farm-1',
      species: 'Cattle',
      name: '  Lakshmi  ',
      count: 2,
      status: 'ACTIVE',
      createdAt: new Date('2026-10-01T08:00:00.000Z'),
    };

    prisma.livestock.create.mockResolvedValue(created);

    const result = await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        species: '  Cattle  ',
        name: '  Lakshmi  ',
        count: 2,
      },
    );

    expect(result).toEqual(created);

    expect(authorization.assertCan).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { userId: 'user-1', role: UserRole.FARMER },
        module: 'livestock',
        resource: 'livestock',
        action: AuthorizationAction.CREATE,
        farmId: 'farm-1',
        ownerId: 'user-1',
      }),
    );

    expect(registry.validateResourceField).toHaveBeenCalledWith(
      'livestock',
      'species',
      '  Cattle  ',
    );

    expect(prisma.livestock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        farmId: 'farm-1',
        species: 'Cattle',
        name: 'Lakshmi',
        count: 2,
        status: 'ACTIVE',
      }),
    });

    expect(relationships.createOwnerRelationship).toHaveBeenCalledWith(
      expect.anything(),
      'livestock',
      'livestock-1',
      'user-1',
      expect.any(Date),
    );

    expect(audit.createInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'user-1',
        action: 'CREATE',
        resourceType: 'livestock',
        resourceId: 'livestock-1',
      }),
    );
  });

  it('rejects creation under an archived farm', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1', ownerId: 'user-1', deletedAt: new Date('2026-10-01T00:00:00.000Z'),
    });

    await expect(service.create('user-1', UserRole.FARMER, {
      farmId: 'farm-1', species: 'Cattle',
    })).rejects.toThrow('Farm not found or archived');

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(prisma.livestock.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the farm does not exist', async () => {
    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.create('user-1', UserRole.FARMER, {
        farmId: 'missing-farm',
        species: 'Cattle',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(prisma.livestock.create).not.toHaveBeenCalled();
  });

  it('rejects invalid Registry values before persistence', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    registry.validateResourceField.mockReturnValue({
      valid: false,
      value: '',
      errors: ['Field must be at least 1 characters long.'],
    });

    await expect(
      service.create('user-1', UserRole.FARMER, {
        farmId: 'farm-1',
        species: '   ',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.livestock.create).not.toHaveBeenCalled();
    expect(relationships.createOwnerRelationship).not.toHaveBeenCalled();
  });

  it('reads only active livestock after authorization', async () => {
    const item = {
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: null,
      farm: { ownerId: 'user-1' },
    };

    prisma.livestock.findFirst
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce({
        id: 'livestock-1',
        farmId: 'farm-1',
        species: 'Cattle',
        deletedAt: null,
        farm: { id: 'farm-1', ownerId: 'user-1' },
      });

    const result = await service.findOne(
      'user-1',
      UserRole.FARMER,
      'livestock-1',
    );

    expect(result).toEqual(
      expect.objectContaining({ id: 'livestock-1' }),
    );

    expect(authorization.assertCan).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuthorizationAction.READ,
        resourceId: 'livestock-1',
        farmId: 'farm-1',
        ownerId: 'user-1',
      }),
    );

    expect(prisma.livestock.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 'livestock-1',
        deletedAt: null,
      },
      include: { farm: true },
    });
  });

  it('updates livestock without allowing farm reassignment', async () => {
    prisma.livestock.findFirst.mockResolvedValue({
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: null,
      farm: { ownerId: 'user-1' },
    });

    const updated = {
      id: 'livestock-1',
      farmId: 'farm-1',
      species: 'Buffalo',
      name: 'Ganga',
      count: 3,
    };

    prisma.livestock.update.mockResolvedValue(updated);

    const result = await service.update(
      'user-1',
      UserRole.FARMER,
      'livestock-1',
      {
        farmId: 'farm-999',
        species: ' Buffalo ',
        count: 3,
      },
    );

    expect(result).toEqual(updated);

    expect(prisma.livestock.update).toHaveBeenCalledWith({
      where: { id: 'livestock-1' },
      data: expect.not.objectContaining({
        farmId: expect.anything(),
      }),
    });

    expect(audit.createInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'UPDATE',
        resourceType: 'livestock',
        resourceId: 'livestock-1',
      }),
    );
  });

  it('does not reset herd count or lifecycle status during a sparse update', async () => {
    prisma.livestock.findFirst.mockResolvedValue({
      id: 'livestock-1', farmId: 'farm-1', deletedAt: null,
      farm: { ownerId: 'user-1', deletedAt: null },
    });
    prisma.livestock.update.mockResolvedValue({ id: 'livestock-1', notes: 'Checked' });

    await service.update('user-1', UserRole.FARMER, 'livestock-1', { notes: 'Checked' });

    expect(prisma.livestock.update).toHaveBeenCalledWith({
      where: { id: 'livestock-1' },
      data: { notes: 'Checked' },
    });
  });

  it('archives livestock and terminates its active relationships atomically', async () => {
    prisma.livestock.findFirst.mockResolvedValue({
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: null,
      farm: { ownerId: 'user-1' },
    });

    const archived = {
      id: 'livestock-1',
      deletedAt: new Date('2026-10-02T00:00:00.000Z'),
    };

    prisma.livestock.update.mockResolvedValue(archived);

    const result = await service.archive(
      'user-1',
      UserRole.FARMER,
      'livestock-1',
    );

    expect(result).toEqual(archived);

    expect(relationships.terminateResourceRelationships).toHaveBeenCalledWith(
      expect.anything(),
      'livestock',
      'livestock-1',
      expect.any(Date),
      'Livestock archived',
    );

    expect(prisma.livestock.update).toHaveBeenCalledWith({
      where: { id: 'livestock-1' },
      data: { deletedAt: expect.any(Date) },
    });

    expect(audit.createInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'DELETE',
        resourceType: 'livestock',
        resourceId: 'livestock-1',
      }),
    );
  });

  it('restores archived livestock and recreates ownership', async () => {
    prisma.livestock.findFirst.mockResolvedValue({
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: new Date('2026-10-01T00:00:00.000Z'),
      farm: { ownerId: 'user-1' },
    });

    prisma.resourceRelationship.findFirst.mockResolvedValue({
      userId: 'user-1',
    });

    const restored = {
      id: 'livestock-1',
      deletedAt: null,
    };

    prisma.livestock.update.mockResolvedValue(restored);

    const result = await service.restore(
      'user-1',
      UserRole.FARMER,
      'livestock-1',
    );

    expect(result).toEqual(restored);

    expect(relationships.createOwnerRelationship).toHaveBeenCalledWith(
      expect.anything(),
      'livestock',
      'livestock-1',
      'user-1',
      expect.any(Date),
    );

    expect(audit.createInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'RESTORE',
        resourceType: 'livestock',
        resourceId: 'livestock-1',
      }),
    );
  });

  it('rejects restoring already-active livestock', async () => {
    prisma.livestock.findFirst.mockResolvedValue({
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: null,
      farm: { ownerId: 'user-1' },
    });

    await expect(
      service.restore(
        'user-1',
        UserRole.FARMER,
        'livestock-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(authorization.assertCan).not.toHaveBeenCalled();
    expect(prisma.livestock.update).not.toHaveBeenCalled();
  });

  it('uses the current resource owner relationship for authorization', async () => {
    prisma.livestock.findFirst.mockResolvedValue({
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: null,
      farm: { ownerId: 'farm-owner' },
    });

    prisma.resourceRelationship.findFirst.mockResolvedValue({
      userId: 'relationship-owner',
    });

    prisma.livestock.findFirst.mockResolvedValueOnce({
      id: 'livestock-1',
      farmId: 'farm-1',
      deletedAt: null,
      farm: { ownerId: 'farm-owner' },
    }).mockResolvedValueOnce({
      id: 'livestock-1',
      farmId: 'farm-1',
      species: 'Cattle',
      deletedAt: null,
      farm: { id: 'farm-1', ownerId: 'farm-owner' },
    });

    await service.findOne(
      'relationship-owner',
      UserRole.FARMER,
      'livestock-1',
    );

    expect(authorization.assertCan).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'relationship-owner',
      }),
    );
  });

  it('lists farm-owned and independently transferred livestock through active ownership relationships', async () => {
    prisma.resourceRelationship.findMany.mockResolvedValue([{ resourceId: 'livestock-transferred' }]);
    prisma.livestock.findMany.mockResolvedValue([]);

    await service.findMine('user-1', UserRole.FARMER);

    expect(authorization.assertCan).toHaveBeenCalledWith({
      user: { userId: 'user-1', role: UserRole.FARMER },
      module: 'livestock',
      resource: 'livestock',
      action: AuthorizationAction.READ,
      ownerId: 'user-1',
    });
    expect(prisma.resourceRelationship.findMany).toHaveBeenCalledWith({
      where: { resourceType: 'livestock', relationshipType: 'OWNER', userId: 'user-1', endedAt: null },
      select: { resourceId: true },
    });
    expect(prisma.livestock.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { farm: { ownerId: 'user-1' } },
          { id: { in: ['livestock-transferred'] } },
        ],
      },
      include: { farm: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('lists archived livestock for its latest historical owner so it can be restored', async () => {
    const archived = {
      id: 'livestock-archived',
      farmId: 'farm-1',
      species: 'Cattle',
      deletedAt: new Date('2026-10-15T10:00:00.000Z'),
      farm: { id: 'farm-1', ownerId: 'farm-owner' },
    };
    prisma.livestock.findMany.mockResolvedValue([archived]);
    prisma.resourceRelationship.findFirst.mockResolvedValue({ userId: 'former-active-owner' });

    const result = await service.findArchived('former-active-owner', UserRole.FARMER);

    expect(result).toEqual([archived]);
    expect(prisma.resourceRelationship.findFirst).toHaveBeenCalledWith({
      where: {
        resourceType: 'livestock',
        resourceId: 'livestock-archived',
        relationshipType: 'OWNER',
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true },
    });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({
      user: { userId: 'former-active-owner', role: UserRole.FARMER },
      action: AuthorizationAction.READ,
      ownerId: 'former-active-owner',
    }));
  });

});
