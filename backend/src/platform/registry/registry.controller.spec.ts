import { UserRole } from '@prisma/client';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { RegistryController } from './registry.controller';

describe('RegistryController', () => {
  const registry = {
    getAll: jest.fn(() => ['resource']),
    getAllModules: jest.fn(() => [{ id: 'farms' }]),
    getAllFields: jest.fn(() => [{ field: 'name' }]),
    get: jest.fn((name: string) => name === 'farm' ? { name } : undefined),
  };
  const lifecycle = { getStatus: jest.fn(() => ({ state: 'ENABLED' })) };
  const audit = { create: jest.fn() };
  const credentialArtifacts = { getSettings: jest.fn(), status: jest.fn(), updateSettings: jest.fn() };
  const controller = new RegistryController(registry as never, lifecycle as never, audit as never, credentialArtifacts as never);

  beforeEach(() => jest.clearAllMocks());

  it('requires authentication at the controller boundary', () => {
    expect(() => controller.getAll({})).toThrow(UnauthorizedException);
  });

  it('requires Super Admin for registry metadata', () => {
    expect(() => controller.getAll({ user: { role: UserRole.FARMER } })).toThrow(
      UnauthorizedException,
    );
  });

  it('allows Super Admin to read registry metadata', () => {
    expect(controller.getAll({ user: { role: UserRole.SUPER_ADMIN } })).toEqual(['resource']);
    expect(controller.getModules({ user: { role: UserRole.SUPER_ADMIN } })).toEqual([{ id: 'farms' }]);
    expect(controller.getFields({ user: { role: UserRole.SUPER_ADMIN } })).toEqual([{ field: 'name' }]);
  });

  it('protects module status and resource lookup', () => {
    expect(controller.getModuleStatuses({ user: { role: UserRole.SUPER_ADMIN } })).toEqual([
      { state: 'ENABLED' },
    ]);
    expect(controller.getOne('farm', { user: { role: UserRole.SUPER_ADMIN } })).toEqual({ name: 'farm' });
    expect(() => controller.getOne('missing', { user: { role: UserRole.SUPER_ADMIN } })).toThrow(
      NotFoundException,
    );
  });
});
