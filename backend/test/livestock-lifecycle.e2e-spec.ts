import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { LivestockService } from './../src/livestock/livestock.service';
import { ResourceRelationshipService } from './../src/platform/relationships/relationship.service';

describe('Livestock lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => { await app.close(); });

  it('persists create -> archive -> restore with relationship and audit lifecycle', async () => {
    const farm = await prisma.farm.findFirst({
      where: { deletedAt: null, owner: { status: 'ACTIVE', role: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
      select: { id: true, ownerId: true, owner: { select: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });    expect(farm).toBeTruthy();

    const service = app.get(LivestockService);
    const role = farm!.owner.role as UserRole;
    const tag = `E2E-LIVESTOCK-${Date.now()}`;
    let id: string | undefined;

    try {
      const created = await service.create(farm!.ownerId, role, {
        farmId: farm!.id, species: 'Cattle', name: 'Lifecycle Test Animal',
        tag, breed: 'Local', sex: 'FEMALE', count: 1, status: 'ACTIVE',
        notes: 'E2E lifecycle test',
      });
      id = created.id;

      const ownerAfterCreate = await prisma.resourceRelationship.findMany({
        where: { resourceType: 'livestock', resourceId: id, relationshipType: 'OWNER', endedAt: null },
      });
      expect(ownerAfterCreate).toHaveLength(1);
      expect(ownerAfterCreate[0].userId).toBe(farm!.ownerId);

      expect(await prisma.auditEvent.count({
        where: { resourceType: 'livestock', resourceId: id, action: 'CREATE' },
      })).toBe(1);      const archived = await service.archive(farm!.ownerId, role, id);
      expect(archived.deletedAt).not.toBeNull();

      expect(await prisma.resourceRelationship.count({
        where: { resourceType: 'livestock', resourceId: id, relationshipType: 'OWNER', endedAt: null },
      })).toBe(0);

      expect(await prisma.resourceRelationship.count({
        where: { resourceType: 'livestock', resourceId: id },
      })).toBe(1);

      expect(await prisma.auditEvent.count({
        where: { resourceType: 'livestock', resourceId: id, action: 'DELETE' },
      })).toBe(1);

      const restored = await service.restore(farm!.ownerId, role, id);
      expect(restored.deletedAt).toBeNull();

      const ownerAfterRestore = await prisma.resourceRelationship.findMany({
        where: { resourceType: 'livestock', resourceId: id, relationshipType: 'OWNER', endedAt: null },
      });
      expect(ownerAfterRestore).toHaveLength(1);
      expect(ownerAfterRestore[0].userId).toBe(farm!.ownerId);      expect(await prisma.auditEvent.count({
        where: { resourceType: 'livestock', resourceId: id, action: 'RESTORE' },
      })).toBe(1);

      const history = await service.relationshipHistory(farm!.ownerId, role, id);
      expect(history.length).toBeGreaterThanOrEqual(2);
    } finally {
      if (id) {
        await prisma.auditEvent.deleteMany({ where: { resourceType: 'livestock', resourceId: id } });
        await prisma.resourceRelationship.deleteMany({ where: { resourceType: 'livestock', resourceId: id } });
        await prisma.livestock.deleteMany({ where: { id } });
      }
    }
  });

  it('rolls back livestock and ownership when the downstream relationship write fails', async () => {
    const farm = await prisma.farm.findFirst({
      where: { deletedAt: null, owner: { status: 'ACTIVE', role: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
      select: { id: true, ownerId: true, owner: { select: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });    expect(farm).toBeTruthy();

    const service = app.get(LivestockService);
    const relationships = app.get(ResourceRelationshipService);
    const role = farm!.owner.role as UserRole;
    const tag = `E2E-LIVESTOCK-ROLLBACK-${Date.now()}`;
    let attemptedId: string | undefined;

    const originalCreate = relationships.createOwnerRelationship.bind(relationships);
    jest.spyOn(relationships, 'createOwnerRelationship').mockImplementation(async (...args: any[]) => {
      attemptedId = args[2];
      await originalCreate(...args);
      throw new Error('INTENTIONAL_LIVESTOCK_ATOMICITY_FAILURE');
    });

    try {
      await expect(service.create(farm!.ownerId, role, {
        farmId: farm!.id, species: 'Goat', tag, count: 1, status: 'ACTIVE',
      })).rejects.toThrow('INTENTIONAL_LIVESTOCK_ATOMICITY_FAILURE');

      expect(attemptedId).toBeDefined();
      expect(await prisma.livestock.findUnique({ where: { id: attemptedId! } })).toBeNull();
      expect(await prisma.resourceRelationship.count({
        where: { resourceType: 'livestock', resourceId: attemptedId! },
      })).toBe(0);      expect(await prisma.auditEvent.count({
        where: { resourceType: 'livestock', resourceId: attemptedId! },
      })).toBe(0);
    } finally {
      jest.restoreAllMocks();
      if (attemptedId) {
        await prisma.auditEvent.deleteMany({ where: { resourceType: 'livestock', resourceId: attemptedId } });
        await prisma.resourceRelationship.deleteMany({ where: { resourceType: 'livestock', resourceId: attemptedId } });
        await prisma.livestock.deleteMany({ where: { id: attemptedId } });
      }
    }
  });
});
