import { FieldPolicyRepository } from './field-policy.repository';

describe('FieldPolicyRepository', () => {
  let repository: FieldPolicyRepository;

  const prisma = {
    fieldPermission: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new FieldPolicyRepository(prisma);
  });

  describe('findByPermissionId()', () => {
    it('loads field policies for the requested permission', async () => {
      prisma.fieldPermission.findMany.mockResolvedValue([
        {
          field: 'phone',
          effect: 'MASK',
        },
        {
          field: 'email',
          effect: 'REDACT',
        },
      ]);

      await expect(
        repository.findByPermissionId('permission-1'),
      ).resolves.toEqual([
        {
          field: 'phone',
          effect: 'MASK',
        },
        {
          field: 'email',
          effect: 'REDACT',
        },
      ]);

      expect(prisma.fieldPermission.findMany).toHaveBeenCalledWith({
        where: {
          permissionId: 'permission-1',
        },
        select: {
          field: true,
          effect: true,
        },
        orderBy: {
          field: 'asc',
        },
      });
    });

    it('returns an empty array when no field policies exist', async () => {
      prisma.fieldPermission.findMany.mockResolvedValue([]);

      await expect(
        repository.findByPermissionId('permission-without-fields'),
      ).resolves.toEqual([]);

      expect(prisma.fieldPermission.findMany).toHaveBeenCalledWith({
        where: {
          permissionId: 'permission-without-fields',
        },
        select: {
          field: true,
          effect: true,
        },
        orderBy: {
          field: 'asc',
        },
      });
    });

    it('preserves unknown persisted effects for fail-closed policy evaluation', async () => {
      prisma.fieldPermission.findMany.mockResolvedValue([
        {
          field: 'sensitiveData',
          effect: 'FUTURE_EFFECT',
        },
      ]);

      const result = await repository.findByPermissionId('permission-1');

      expect(result).toEqual([
        {
          field: 'sensitiveData',
          effect: 'FUTURE_EFFECT',
        },
      ]);
    });

    it('does not request unrelated FieldPermission columns', async () => {
      prisma.fieldPermission.findMany.mockResolvedValue([]);

      await repository.findByPermissionId('permission-1');

      const query = prisma.fieldPermission.findMany.mock.calls[0][0];

      expect(query.select).toEqual({
        field: true,
        effect: true,
      });

      expect(query.select).not.toHaveProperty('id');
      expect(query.select).not.toHaveProperty('permissionId');
      expect(query.select).not.toHaveProperty('createdAt');
      expect(query.select).not.toHaveProperty('updatedAt');
    });
  });
});
