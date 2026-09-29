import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Application runtime smoke (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  it('serves the versioned health endpoint', () =>
    request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.service).toBe('KrishiKendram API');
        expect(body.version).toBeDefined();
      }));

  it('exposes canonical Registry modules and lifecycle status', async () => {
    const modules = await request(app.getHttpServer())
      .get('/api/v1/registry/modules')
      .expect(200);

    expect(Array.isArray(modules.body)).toBe(true);
    expect(modules.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'platform', lifecycle: 'ACTIVE' }),
        expect.objectContaining({ id: 'farms', lifecycle: 'ACTIVE' }),
      ]),
    );

    const statuses = await request(app.getHttpServer())
      .get('/api/v1/registry/modules/status')
      .expect(200);

    expect(Array.isArray(statuses.body)).toBe(true);
    expect(statuses.body.length).toBeGreaterThan(0);
    expect(
      statuses.body.every(
        (status: { operational?: boolean }) =>
          typeof status.operational === 'boolean',
      ),
    ).toBe(true);
  });

  it('keeps protected Farm access behind JWT authentication', () =>
    request(app.getHttpServer()).get('/api/v1/farms/my').expect(401));

  it('keeps platform permission administration behind JWT authentication', () =>
    request(app.getHttpServer())
      .get('/api/v1/platform/permissions/reconciliation')
      .expect(401));

  it('keeps Auth current-user access behind JWT authentication', () =>
    request(app.getHttpServer()).get('/api/v1/auth/me').expect(401));

  it('keeps Users access behind JWT authentication', () =>
    request(app.getHttpServer()).get('/api/v1/users/me').expect(401));

  it('keeps Crops access behind JWT authentication', () =>
    request(app.getHttpServer()).get('/api/v1/crops').expect(401));

  it('keeps Intake creation behind JWT authentication', () =>
    request(app.getHttpServer())
      .post('/api/v1/intake')
      .send({})
      .expect(401));

  it('keeps Resource Transfer requests behind JWT authentication', () =>
    request(app.getHttpServer())
      .get('/api/v1/resource-transfers/requests/incoming')
      .expect(401));

  it('keeps Audit activity behind authorization authentication', () =>
    request(app.getHttpServer())
      .get('/api/v1/platform/audit/recent')
      .expect(401));

  it('supports an authenticated current-user read path using an existing active user', async () => {
    const prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const user = await prisma.user.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(user).toBeTruthy();

    const accessToken = await jwt.signAsync({
      sub: user!.id,
      role: user!.role,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: user!.id,
        role: user!.role,
        status: 'ACTIVE',
      }),
    );
  });

  it('supports an authenticated Farm collection read for an existing Farmer', async () => {
    const prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const user = await prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        role: 'FARMER',
        farms: { some: {} },
      },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(user).toBeTruthy();

    const accessToken = await jwt.signAsync({
      sub: user!.id,
      role: user!.role,
    });

    await request(app.getHttpServer())
      .get('/api/v1/farms/my')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
      });
  });

  it('supports an authenticated Crop collection read for an existing authorized user', async () => {
    const prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const fixture = await prisma.crop.findFirst({
      where: {
        farm: {
          owner: {
            status: 'ACTIVE',
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          },
        },
      },
      select: {
        farm: { select: { ownerId: true, owner: { select: { role: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    expect(fixture).toBeTruthy();

    const accessToken = await jwt.signAsync({
      sub: fixture!.farm.ownerId,
      role: fixture!.farm.owner.role,
    });

    await request(app.getHttpServer())
      .get('/api/v1/crops')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
      });
  });

  it('supports authenticated user history and relationship-history reads for an existing active user', async () => {
    const prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const user = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(user).toBeTruthy();

    const accessToken = await jwt.signAsync({ sub: user!.id, role: user!.role });

    const history = await request(app.getHttpServer()).get('/api/v1/users/' + user!.id + '/history').set('Authorization', 'Bearer ' + accessToken).expect(200);

    const relationships = await request(app.getHttpServer()).get('/api/v1/users/' + user!.id + '/relationships/history').set('Authorization', 'Bearer ' + accessToken).expect(200);

    expect(Array.isArray(history.body)).toBe(true);
    expect(Array.isArray(relationships.body)).toBe(true);
  });

  it('supports authenticated transfer-request reads using an existing active user', async () => {
    const prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const user = await prisma.user.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(user).toBeTruthy();

    const accessToken = await jwt.signAsync({
      sub: user!.id,
      role: user!.role,
    });

    const incoming = await request(app.getHttpServer())
      .get('/api/v1/resource-transfers/requests/incoming')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    const outgoing = await request(app.getHttpServer())
      .get('/api/v1/resource-transfers/requests/outgoing')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    expect(Array.isArray(incoming.body)).toBe(true);
    expect(Array.isArray(outgoing.body)).toBe(true);
  });

  it('keeps FarmAsset custody and lease lifecycle routes behind JWT authentication', async () => {
    for (const path of [
      '/api/v1/farms/farm-id/assets/asset-id/custodian',
      '/api/v1/farms/farm-id/assets/asset-id/custodian/return',
      '/api/v1/farms/farm-id/assets/asset-id/lease',
      '/api/v1/farms/farm-id/assets/asset-id/lease/end',
    ]) {
      await request(app.getHttpServer()).post(path).send({}).expect(401);
    }
  });

  it('keeps FarmAsset split and merge lifecycle routes behind JWT authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/farms/farm-id/assets/asset-id/split')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/farms/farm-id/assets/merge')
      .send({})
      .expect(401);
  });

  it('keeps Livestock CRUD and relationship history behind JWT authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/livestock').expect(401);
    await request(app.getHttpServer()).post('/api/v1/livestock').send({}).expect(401);
    await request(app.getHttpServer()).get('/api/v1/livestock/item/relationships/history').expect(401);
    await request(app.getHttpServer()).patch('/api/v1/livestock/item').send({}).expect(401);
    await request(app.getHttpServer()).delete('/api/v1/livestock/item').expect(401);
    await request(app.getHttpServer()).post('/api/v1/livestock/item/restore').expect(401);
  });

  it('supports an authenticated Livestock collection read for an existing authorized user', async () => {
    const prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const user = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(user).toBeTruthy();

    const accessToken = await jwt.signAsync({ sub: user!.id, role: user!.role });
    await request(app.getHttpServer())
      .get('/api/v1/livestock')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200)
      .expect(({ body }) => expect(Array.isArray(body)).toBe(true));
  });

  afterEach(async () => {
    await app.close();
  });
});
