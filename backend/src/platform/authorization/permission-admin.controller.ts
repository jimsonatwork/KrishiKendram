import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthorizationAction } from './authorization.types';
import { AuthorizationService } from './authorization.service';
import { PermissionService } from './permission.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: UserRole };
}

@Controller('platform/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionAdminController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly permissions: PermissionService,
  ) {}

  @Get('reconciliation')
  async getReconciliation(@Req() request: AuthenticatedRequest) {
    await this.authorization.assertCan({
      user: request.user,
      module: 'platform',
      resource: 'permission',
      action: AuthorizationAction.READ,
    });

    return this.permissions.getRegistryReconciliation();
  }

  @Get()
  async getAll(@Req() request: AuthenticatedRequest) {
    await this.authorization.assertCan({
      user: request.user,
      module: 'platform',
      resource: 'permission',
      action: AuthorizationAction.READ,
    });

    return this.permissions.listForAdministration();
  }
}
