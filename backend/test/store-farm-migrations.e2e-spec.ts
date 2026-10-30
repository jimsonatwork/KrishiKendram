import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Store and Farm migration-backed workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    // Configure the missing Registry-declared role capabilities through the
    // audited God Mode control plane, never by writing authorization tables.
    const god = await prisma.user.findUnique({
      where: { email: 'jimson@jimson.jimson' },
      select: { id: true, role: true },
    });
    expect(god).toBeTruthy();
    const godToken = await jwt.signAsync({ sub: god!.id, role: god!.role });
    const rolePolicies = [
      { role: UserRole.FARMER, module: 'farms', resource: 'farmAsset', action: 'RESTORE', scope: 'FARM' },
      { role: UserRole.ADMIN, module: 'farms', resource: 'farmAsset', action: 'RESTORE', scope: 'GLOBAL' },
      { role: UserRole.SUPER_ADMIN, module: 'farms', resource: 'farmAsset', action: 'RESTORE', scope: 'GLOBAL' },
      ...[
        UserRole.FARMER, UserRole.FARM_WORKER, UserRole.AGRONOMIST, UserRole.VETERINARIAN,
        UserRole.BUYER, UserRole.MERCHANT, UserRole.FPO, UserRole.PARTNER,
        UserRole.FIELD_OFFICER, UserRole.DISTRICT_ADMIN, UserRole.STATE_ADMIN,
        UserRole.GOVERNMENT, UserRole.NGO, UserRole.BANK, UserRole.LOGISTICS,
        UserRole.ADMIN, UserRole.SUPER_ADMIN,
      ].map((role) => ({ role, module: 'marketplace', resource: 'marketplaceListingQuestion', action: 'CREATE', scope: 'OWN' })),
    ];
    for (const policy of rolePolicies) {
      const permission = await prisma.permission.findFirst({
        where: { module: policy.module, resource: policy.resource, action: policy.action, scope: policy.scope },
        select: { id: true },
      });
      const existingGrant = permission
        ? await prisma.rolePermission.findFirst({ where: { permissionId: permission.id, role: policy.role }, select: { id: true } })
        : null;
      if (!existingGrant) {
        await request(app.getHttpServer())
          .patch('/api/v1/admin/god-mode/capabilities/role-policy')
          .set('Authorization', 'Bearer ' + godToken)
          .send({ ...policy, enabled: true, reason: 'Enable participant Q&A and reversible Farm Asset restoration under Registry policy.' })
          .expect(200);
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows an authenticated Farm administrator to create, archive and restore a Farm', async () => {
    const admin = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: UserRole.ADMIN },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(admin).toBeTruthy();
    const token = await jwt.signAsync({ sub: admin!.id, role: admin!.role });
    const farmName = 'E2E Farm Lifecycle ' + Date.now();
    let farmId: string | undefined;
    let entityId: string | undefined;

    try {
      const created = await request(app.getHttpServer())
        .post('/api/v1/farms')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: farmName, type: 'CROP', location: 'E2E test location', area: 1, unit: 'acre' })
        .expect(201);
      farmId = created.body.id;
      entityId = created.body.entityId;
      expect(farmId).toBeTruthy();

      await request(app.getHttpServer())
        .delete('/api/v1/farms/' + farmId)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
      expect((await prisma.farm.findUnique({ where: { id: farmId } }))?.deletedAt).not.toBeNull();

      await request(app.getHttpServer())
        .post('/api/v1/farms/' + farmId + '/restore')
        .set('Authorization', 'Bearer ' + token)
        .expect(201);
      expect((await prisma.farm.findUnique({ where: { id: farmId } }))?.deletedAt).toBeNull();
      expect(await prisma.auditEvent.count({ where: { resourceType: 'farm', resourceId: farmId, action: 'ARCHIVE' } })).toBe(1);
      expect(await prisma.auditEvent.count({ where: { resourceType: 'farm', resourceId: farmId, action: 'RESTORE' } })).toBe(1);
    } finally {
      if (farmId) {
        await prisma.auditEvent.deleteMany({ where: { resourceType: 'farm', resourceId: farmId } });
        await prisma.resourceRelationship.deleteMany({ where: { resourceType: 'farm', resourceId: farmId } });
        await prisma.farm.deleteMany({ where: { id: farmId } });
      }
      if (entityId) await prisma.entity.deleteMany({ where: { id: entityId } });
    }
  });

  it('allows an authenticated Farm owner to create, archive and restore a Farm Asset', async () => {
    const farm = await prisma.farm.findFirst({
      where: {
        deletedAt: null,
        owner: { status: 'ACTIVE', role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      },
      select: { id: true, ownerId: true, owner: { select: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    expect(farm).toBeTruthy();

    const token = await jwt.signAsync({ sub: farm!.ownerId, role: farm!.owner.role });
    const assetName = 'E2E Farm Asset ' + Date.now();
    let assetId: string | undefined;

    try {
      const created = await request(app.getHttpServer())
        .post('/api/v1/farms/' + farm!.id + '/assets')
        .set('Authorization', 'Bearer ' + token)
        .send({ type: 'E2E_TEST_RESOURCE', name: assetName, quantity: 1, unit: 'unit' })
        .expect(201);
      assetId = created.body.id;
      expect(assetId).toBeTruthy();

      await request(app.getHttpServer())
        .delete('/api/v1/farms/' + farm!.id + '/assets/' + assetId)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);

      const archived = await prisma.farmAsset.findUnique({ where: { id: assetId } });
      expect(archived?.deletedAt).not.toBeNull();

      await request(app.getHttpServer())
        .post('/api/v1/farms/' + farm!.id + '/assets/' + assetId + '/restore')
        .set('Authorization', 'Bearer ' + token)
        .expect(201);

      const restored = await prisma.farmAsset.findUnique({ where: { id: assetId } });
      expect(restored?.deletedAt).toBeNull();
      expect(await prisma.auditEvent.count({ where: { resourceType: 'farmAsset', resourceId: assetId, action: 'ARCHIVE' } })).toBeGreaterThan(0);
      expect(await prisma.auditEvent.count({ where: { resourceType: 'farmAsset', resourceId: assetId, action: 'RESTORE' } })).toBeGreaterThan(0);
    } finally {
      if (assetId) {
        await prisma.auditEvent.deleteMany({ where: { resourceType: 'farmAsset', resourceId: assetId } });
        await prisma.resourceRelationship.deleteMany({ where: { resourceType: 'farmAsset', resourceId: assetId } });
        await prisma.farmAsset.deleteMany({ where: { id: assetId } });
      }
    }
  });

  it('keeps public listing questions public and sample requests private to buyer and seller', async () => {
    const listing = await prisma.marketplaceListing.findFirst({
      where: { status: 'PUBLISHED', deletedAt: null, seller: { status: 'ACTIVE' } },
      select: { id: true, sellerId: true, seller: { select: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    expect(listing).toBeTruthy();

    const buyer = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: UserRole.FARMER, id: { not: listing!.sellerId } },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(buyer).toBeTruthy();

    const buyerToken = await jwt.signAsync({ sub: buyer!.id, role: buyer!.role });
    const sellerToken = await jwt.signAsync({ sub: listing!.sellerId, role: listing!.seller.role });
    const questionIds: string[] = [];

    try {
      const publicQuestion = await request(app.getHttpServer())
        .post('/api/v1/marketplace/listings/' + listing!.id + '/questions')
        .set('Authorization', 'Bearer ' + buyerToken)
        .send({ question: 'Is this listing quality verified?', questionType: 'PRODUCT_QUESTION' })
        .expect(201);
      questionIds.push(publicQuestion.body.id);
      expect(publicQuestion.body.visibility).toBe('PUBLIC');

      const sampleRequest = await request(app.getHttpServer())
        .post('/api/v1/marketplace/listings/' + listing!.id + '/questions')
        .set('Authorization', 'Bearer ' + buyerToken)
        .send({ question: 'May I request a small sample first?', questionType: 'SAMPLE_REQUEST' })
        .expect(201);
      questionIds.push(sampleRequest.body.id);
      expect(sampleRequest.body.visibility).toBe('PRIVATE');

      const publicBeforeAnswer = await request(app.getHttpServer())
        .get('/api/v1/marketplace/listings/' + listing!.id + '/questions')
        .expect(200);
      expect(publicBeforeAnswer.body.map((item: { id: string }) => item.id)).toContain(publicQuestion.body.id);
      expect(publicBeforeAnswer.body.map((item: { id: string }) => item.id)).not.toContain(sampleRequest.body.id);

      const buyerPrivateView = await request(app.getHttpServer())
        .get('/api/v1/marketplace/listings/' + listing!.id + '/questions/mine')
        .set('Authorization', 'Bearer ' + buyerToken)
        .expect(200);
      expect(buyerPrivateView.body.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining(questionIds));

      await request(app.getHttpServer())
        .patch('/api/v1/marketplace/listings/' + listing!.id + '/questions/' + publicQuestion.body.id + '/answer')
        .set('Authorization', 'Bearer ' + sellerToken)
        .send({ answer: 'The listing details are reviewed by the seller.' })
        .expect(200);

      const publicAfterAnswer = await request(app.getHttpServer())
        .get('/api/v1/marketplace/listings/' + listing!.id + '/questions')
        .expect(200);
      expect(publicAfterAnswer.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: publicQuestion.body.id, status: 'ANSWERED', answer: 'The listing details are reviewed by the seller.' }),
      ]));
      expect(publicAfterAnswer.body.map((item: { id: string }) => item.id)).not.toContain(sampleRequest.body.id);

      const sellerPrivateView = await request(app.getHttpServer())
        .get('/api/v1/marketplace/listings/' + listing!.id + '/questions/mine')
        .set('Authorization', 'Bearer ' + sellerToken)
        .expect(200);
      expect(sellerPrivateView.body.map((item: { id: string }) => item.id)).toContain(sampleRequest.body.id);
    } finally {
      if (questionIds.length) {
        const rows = await prisma.marketplaceListingQuestion.findMany({ where: { id: { in: questionIds } }, select: { id: true, answeredAt: true } });
        const dedupeKeys = rows.flatMap((row) => [
          'marketplace-question:' + row.id,
          ...(row.answeredAt ? ['marketplace-question-answer:' + row.id + ':' + row.answeredAt.toISOString()] : []),
        ]);
        await prisma.notification.deleteMany({ where: { dedupeKey: { in: dedupeKeys } } });
        await prisma.auditEvent.deleteMany({ where: { resourceType: 'marketplaceListingQuestion', resourceId: { in: questionIds } } });
        await prisma.marketplaceListingQuestion.deleteMany({ where: { id: { in: questionIds } } });
      }
    }
  });
});
