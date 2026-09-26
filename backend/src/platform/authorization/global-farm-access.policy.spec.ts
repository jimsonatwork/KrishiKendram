import { UserRole } from '@prisma/client';

import { GlobalFarmAccessPolicy } from './global-farm-access.policy';

describe('GlobalFarmAccessPolicy', () => {
  const policy = new GlobalFarmAccessPolicy();

  it('allows SUPER_ADMIN global farm access', () => {
    expect(policy.allowsGlobalFarmAccess(UserRole.SUPER_ADMIN)).toBe(true);
  });

  it('does not allow ADMIN global farm access', () => {
    expect(policy.allowsGlobalFarmAccess(UserRole.ADMIN)).toBe(false);
  });

  it('does not allow FARMER global farm access', () => {
    expect(policy.allowsGlobalFarmAccess(UserRole.FARMER)).toBe(false);
  });

  it('does not allow any other current role global farm access', () => {
    const nonGlobalRoles = Object.values(UserRole).filter(
      (role) =>
        role !== UserRole.SUPER_ADMIN &&
        role !== UserRole.ADMIN &&
        role !== UserRole.FARMER,
    );

    for (const role of nonGlobalRoles) {
      expect(policy.allowsGlobalFarmAccess(role)).toBe(false);
    }
  });
});
