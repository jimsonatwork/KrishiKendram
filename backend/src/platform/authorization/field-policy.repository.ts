import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { FieldPolicyRecord } from './field-policy.service';

@Injectable()
export class FieldPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads the persisted field policies attached to one permission.
   *
   * This repository only retrieves policy data. It does not decide whether
   * the caller is authorized to use the permission or how an effect behaves.
   */
  async findByPermissionId(
    permissionId: string,
  ): Promise<FieldPolicyRecord[]> {
    return this.prisma.fieldPermission.findMany({
      where: {
        permissionId,
      },
      select: {
        field: true,
        effect: true,
      },
      orderBy: {
        field: 'asc',
      },
    });
  }
}
