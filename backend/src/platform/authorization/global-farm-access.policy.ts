import { UserRole } from '@prisma/client';

export class GlobalFarmAccessPolicy {
  allowsGlobalFarmAccess(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN;
  }
}
