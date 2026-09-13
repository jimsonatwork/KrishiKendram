import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { AuthorizationService } from './authorization.service';
import { FieldPolicyService } from './field-policy.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuthorizationService, FieldPolicyService],
  exports: [AuthorizationService, FieldPolicyService],
})
export class AuthorizationModule {}
