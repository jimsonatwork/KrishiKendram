import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../platform/audit/audit.module';
import { RegistryModule } from '../platform/registry/registry.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    RegistryModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}