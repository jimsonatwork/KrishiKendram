import { FarmAccessService } from './farm-access.service';
import {
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from '../relationships/relationship.types';
import { RelationshipAccessPolicy } from '../relationships/relationship-access.policy';

describe('FarmAccessService', () => {
  let service: FarmAccessService;

  const prisma = {
    farm: {
      findUnique: jest.fn(),
    },
  } as any;

  const relationshipResolver = {
    resolve: jest.fn(),
  };

  const relationshipAccessPolicy = new RelationshipAccessPolicy();

  beforeEach(() => {
    jest.clearAllMocks();

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
    );
  });

  it('allows the current farm owner with OWNER source', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.resolveAccess('user-1', 'farm-1'),
    ).resolves.toEqual({
      allowed: true,
      source: 'OWNER',
    });

    expect(relationshipResolver.resolve).not.toHaveBeenCalled();
  });

  it('denies a non-owner when no relationship grants access', async () => {
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

  it('does not turn an ACTIVE relationship into access while the policy allow-list is empty', async () => {
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
      allowed: false,
      source: 'NONE',
    });
  });

  it('preserves the boolean canAccess contract', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.canAccess('user-1', 'farm-1'),
    ).resolves.toBe(true);
  });

  it('does not evaluate relationships for the owner path', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await service.resolveAccess('user-1', 'farm-1');

    expect(relationshipResolver.resolve).not.toHaveBeenCalled();
  });
});
