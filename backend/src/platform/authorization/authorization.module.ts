import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { RelationshipsModule } from '../relationships/relationships.module';

import { AuthorizationService } from './authorization.service';
import { FarmAccessService } from './farm-access.service';
import { FieldPolicyEvaluationService } from './field-policy-evaluation.service';
import { FieldPolicyRepository } from './field-policy.repository';
import { FieldPolicyService } from './field-policy.service';
import { PermissionService } from './permission.service';
import { GlobalFarmAccessPolicy } from './global-farm-access.policy';

@Global()
@Module({
  imports: [
    PrismaModule,
    RelationshipsModule,
  ],
  providers: [
    AuthorizationService,
    FarmAccessService,
    FieldPolicyEvaluationService,
    FieldPolicyRepository,
    FieldPolicyService,
    PermissionService,
    GlobalFarmAccessPolicy,
  ],
  exports: [
    AuthorizationService,
    FarmAccessService,
    FieldPolicyEvaluationService,
    FieldPolicyRepository,
    FieldPolicyService,
    PermissionService,
  ],
})
export class AuthorizationModule {}
