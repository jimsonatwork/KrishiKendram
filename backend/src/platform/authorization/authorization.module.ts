import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { AuthorizationService } from './authorization.service';
import { FieldPolicyEvaluationService } from './field-policy-evaluation.service';
import { FieldPolicyRepository } from './field-policy.repository';
import { FieldPolicyService } from './field-policy.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AuthorizationService,
    FieldPolicyEvaluationService,
    FieldPolicyRepository,
    FieldPolicyService,
  ],
  exports: [
    AuthorizationService,
    FieldPolicyEvaluationService,
    FieldPolicyRepository,
    FieldPolicyService,
  ],
})
export class AuthorizationModule {}
