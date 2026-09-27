import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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

  afterEach(async () => {
    await app.close();
  });
});
