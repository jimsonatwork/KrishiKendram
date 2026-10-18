import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const config = app.get(ConfigService);

  // Allow NestJS lifecycle hooks to close Prisma/other resources cleanly
  // when the container receives SIGTERM during deployment or restart.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(helmet());

  const marketplaceMediaDir = process.env.KK_MARKETPLACE_MEDIA_DIR || join(process.cwd(), 'uploads', 'marketplace');
  mkdirSync(marketplaceMediaDir, { recursive: true });
  app.use('/uploads/marketplace', (_req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); }, express.static(marketplaceMediaDir, { dotfiles: 'deny', index: false, fallthrough: false, maxAge: '1d' }));

  const corsOrigins = (config.get<string>('CORS_ORIGINS') ??
    'http://localhost:4000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 3000;

  await app.listen(port);

  console.log(
    `🚀 KrishiKendram API running at http://localhost:${port}/api/v1`,
  );
}

bootstrap();