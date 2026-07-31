import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { CoreModule } from './core/core.module';

import { PlatformModule } from './platform/platform.module';

import { RequestIdMiddleware } from './common/middleware/request-id/request-id.middleware';
import { AuthModule } from './auth/auth.module';

import { FarmsModule } from './farms/farms.module';
import { IntakeModule } from './intake/intake.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    CoreModule,
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
	    FarmsModule,
		PlatformModule,
		IntakeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
