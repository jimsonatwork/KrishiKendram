import { UserRole } from '@prisma/client';

import { FarmAccessService } from './farm-access.service';
import {
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from '../relationships/relationship.types';
import { RelationshipAccessPolicy } from '../relationships/relationship-access.policy';
import { GlobalFarmAccessPolicy } from './global-farm-access.policy';

describe('FarmAccessService', () => {
  let service: FarmAccessService;

  const prisma = {
    farm: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const relationshipResolver = {
    resolve: jest.fn(),
  };

  const relationshipAccessPolicy = new RelationshipAccessPolicy();
  const globalFarmAccessPolicy = new GlobalFarmAccessPolicy();

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.user.findUnique.mockResolvedValue({
      role: UserRole.FARMER,
    });

    relationshipResolver.resolve.mockResolvedValue({
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationships: [],
      resolvedAt: new Date('2026-09-25T00:00:00.000Z'),
    });

    service = new FarmAccessService(
      prisma,
      relationshipResolver,
      relationshipAccessPolicy,
      globalFarmAccessPolicy,
    );
  });

  it('allows SUPER_ADMIN global access to a non-owned farm', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'owner-1',
    });

    prisma.user.findUnique.mockResolvedValue({
      role: UserRole.SUPER_ADMIN,
    });

    await expect(
      service.resolveAccess('super-admin-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: true,
      source: 'GLOBAL',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'super-admin-1' },
      select: { role: true },
    });

    expect(relationshipResolver.resolve).not.toHaveBeenCalled();
  });

  it('uses the legacy owner field only when no temporal relationship exists', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: true,
      source: 'OWNER',
    });

    expect(relationshipResolver.resolve).toHaveBeenCalledWith({
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
    });
  });

  it('denies a normal non-owner when no relationship grants access', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'owner-1',
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: false,
      source: 'NONE',
    });

    expect(relationshipResolver.resolve).toHaveBeenCalledWith({
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
    });
  });

  it('does not grant global access when the farm does not exist', async () => {
    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.resolveAccess('super-admin-1', 'missing-farm'),
    ).resolves.toEqual({
      allowed: false,
      source: 'NONE',
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(relationshipResolver.resolve).not.toHaveBeenCalled();
  });

  it('denies access when the farm does not exist', async () => {
    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: false,
      source: 'NONE',
    });

    expect(relationshipResolver.resolve).not.toHaveBeenCalled();
  });

  it('allows an ACTIVE approved relationship to establish farm access', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'owner-1',
    });

    relationshipResolver.resolve.mockResolvedValue({
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationships: [
        {
          resourceType: 'farm',
          resourceId: 'farm-1',
          userId: 'user-1',
          relationshipType: ResourceRelationshipType.MANAGER,
          status: ResourceRelationshipStatus.ACTIVE,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        },
      ],
      resolvedAt: new Date('2026-09-25T00:00:00.000Z'),
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: true,
      source: 'RELATIONSHIP',
      relationships: [
        {
          resourceType: 'farm',
          resourceId: 'farm-1',
          userId: 'user-1',
          relationshipType: ResourceRelationshipType.MANAGER,
          status: ResourceRelationshipStatus.ACTIVE,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        },
      ],
    });
  });

  it('keeps relationship facts as context without converting them into permissions', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'owner-1',
    });

    const relationshipFact = {
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationshipType: ResourceRelationshipType.MANAGER,
      status: ResourceRelationshipStatus.ACTIVE,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    };

    relationshipResolver.resolve.mockResolvedValue({
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationships: [relationshipFact],
      resolvedAt: new Date('2026-09-25T00:00:00.000Z'),
    });

    const decision = await service.resolveAccess('user-1', 'farm-1');

    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe('RELATIONSHIP');
    expect(decision.relationships).toEqual([relationshipFact]);

    expect(
      decision.relationships?.[0].relationshipType,
    ).toBe(ResourceRelationshipType.MANAGER);
  });

  it('preserves the boolean canAccess contract', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.canAccess('user-1', 'farm-1'),
    ).resolves.toBe(true);
  });

  it('does not fall back to ownerId when temporal history explicitly exists', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });
    relationshipResolver.resolve.mockResolvedValue({
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationships: [
        {
          resourceType: 'farm',
          resourceId: 'farm-1',
          userId: 'user-1',
          relationshipType: ResourceRelationshipType.OWNER,
          status: ResourceRelationshipStatus.TRANSFERRED,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          endedAt: new Date('2026-09-20T00:00:00.000Z'),
          endedReason: 'Transferred',
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        },
      ],
      resolvedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: false,
      source: 'NONE',
    });
  });
});
