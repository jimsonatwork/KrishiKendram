import { ModuleLifecycleService } from './module-lifecycle.service';
import { RegistryService } from './registry.service';

describe('ModuleLifecycleService', () => {
  let registry: RegistryService;
  let lifecycle: ModuleLifecycleService;

  beforeEach(() => {
    registry = new RegistryService({
      validate: jest.fn(),
    } as any);

    lifecycle = new ModuleLifecycleService(registry);
  });

  describe('state', () => {
    it('returns the lifecycle state of a registered module', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'ACTIVE',
      });

      expect(lifecycle.getState('platform')).toBe('ACTIVE');
    });

    it('returns undefined for an unknown module', () => {
      expect(lifecycle.getState('missing')).toBeUndefined();
      expect(lifecycle.getStatus('missing')).toBeUndefined();
    });
  });

  describe('operational state', () => {
    it('considers an ACTIVE module operational', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'ACTIVE',
      });

      expect(lifecycle.isActive('platform')).toBe(true);
      expect(lifecycle.isOperational('platform')).toBe(true);
    });

    it('considers a DISABLED module non-operational', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'DISABLED',
      });

      expect(lifecycle.isActive('platform')).toBe(false);
      expect(lifecycle.isOperational('platform')).toBe(false);
    });

    it('considers a DEPRECATED module operational', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'DEPRECATED',
      });

      expect(lifecycle.isActive('platform')).toBe(false);
      expect(lifecycle.isOperational('platform')).toBe(true);
    });
  });

  describe('dependencies', () => {
    it('considers an active dependency operational', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'ACTIVE',
      });

      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      });

      expect(lifecycle.isOperational('farms')).toBe(true);
      expect(lifecycle.getUnavailableDependencies('farms')).toEqual([]);
    });

    it('considers a disabled dependency unavailable', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'DISABLED',
      });

      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      });

      expect(lifecycle.isOperational('farms')).toBe(false);
      expect(
        lifecycle.getUnavailableDependencies('farms'),
      ).toEqual(['platform']);
    });

    it('keeps a deprecated dependency operational', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'DEPRECATED',
      });

      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      });

      expect(lifecycle.isOperational('farms')).toBe(true);
      expect(
        lifecycle.getUnavailableDependencies('farms'),
      ).toEqual([]);
    });

    it('propagates dependency unavailability through a chain', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'DISABLED',
      });

      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      });

      registry.registerModule({
        id: 'assets',
        name: 'Assets',
        lifecycle: 'ACTIVE',
        dependencies: ['farms'],
      });

      expect(lifecycle.isOperational('assets')).toBe(false);
      expect(
        lifecycle.getUnavailableDependencies('assets'),
      ).toEqual(['farms']);
    });
  });

  describe('status', () => {
    it('returns a complete lifecycle status without exposing mutable registry state', () => {
      registry.registerModule({
        id: 'platform',
        name: 'Platform',
        lifecycle: 'ACTIVE',
      });

      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      });

      const status = lifecycle.getStatus('farms');

      expect(status).toEqual({
        moduleId: 'farms',
        lifecycle: 'ACTIVE',
        operational: true,
        unavailableDependencies: [],
      });

      status!.unavailableDependencies.push('unexpected');

      expect(
        lifecycle.getUnavailableDependencies('farms'),
      ).toEqual([]);
    });
  });
});
