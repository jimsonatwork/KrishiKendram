import { FieldValidationService } from './field-validation.service';
import { RegistryService } from './registry.service';

describe('RegistryService - reusable fields', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );
  });

  it('registers and retrieves a reusable field', () => {
    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'INHERITABLE',
    });

    expect(registry.getField('name')).toEqual({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'INHERITABLE',
    });
  });

  it('inherits the base definition without an override', () => {
    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        maxLength: 200,
      },
      overrideMode: 'INHERITABLE',
    });

    const resolved = registry.resolveField({
      definition: 'name',
    });

    expect(resolved?.validation?.maxLength).toBe(200);
    expect(resolved?.validation?.required).toBe(true);
  });

  it('allows a permitted validation override', () => {
    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'INHERITABLE',
    });

    const resolved = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          maxLength: 100,
        },
      },
    });

    expect(resolved?.validation).toEqual({
      required: true,
      minLength: 1,
      maxLength: 100,
    });
  });

  it('rejects an override for a fixed field', () => {
    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        maxLength: 200,
      },
      overrideMode: 'FIXED',
    });

    const resolved = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          maxLength: 100,
        },
      },
    });

    expect(resolved).toBeUndefined();
  });

  it('prevents an extendable field from becoming less restrictive', () => {
    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 2,
        maxLength: 200,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'minLength',
        'maxLength',
      ],
    });

    const resolved = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          required: false,
          minLength: 1,
          maxLength: 300,
        },
      },
    });

    expect(resolved).toBeUndefined();
  });

  it('allows an extendable field to become more restrictive', () => {
    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'minLength',
        'maxLength',
      ],
    });

    const resolved = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          minLength: 3,
          maxLength: 100,
        },
      },
    });

    expect(resolved?.validation).toEqual({
      required: true,
      minLength: 3,
      maxLength: 100,
    });
  });

  it('returns undefined for an unknown reusable field', () => {
    const resolved = registry.resolveField({
      definition: 'does-not-exist',
    });

    expect(resolved).toBeUndefined();
  });
});

describe('RegistryService - resource field references', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );

    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'minLength',
        'maxLength',
      ],
    });

    registry.register({
      name: 'farm',
      module: 'farms',
      model: 'Farm',
      fields: {
        name: {
          definition: 'name',
        },
      },
    });

    registry.register({
      name: 'crop',
      module: 'farms',
      model: 'Crop',
      fields: {
        name: {
          definition: 'name',
        },
      },
    });

    registry.register({
      name: 'farmAsset',
      module: 'farms',
      model: 'FarmAsset',
      fields: {
        name: {
          definition: 'name',
          override: {
            validation: {
              maxLength: 100,
            },
          },
        },
      },
    });
  });

  it('allows Farm.name to inherit the central Name definition', () => {
    const farm = registry.get('farm');
    const field = farm?.fields?.name;

    const resolved = field
      ? registry.resolveField(field)
      : undefined;

    expect(resolved?.validation).toEqual({
      required: true,
      minLength: 1,
      maxLength: 200,
    });
  });

  it('allows Crop.name to inherit the same central Name definition', () => {
    const crop = registry.get('crop');
    const field = crop?.fields?.name;

    const resolved = field
      ? registry.resolveField(field)
      : undefined;

    expect(resolved?.validation).toEqual({
      required: true,
      minLength: 1,
      maxLength: 200,
    });
  });

  it('allows FarmAsset.name to add a stricter central-rule override', () => {
    const asset = registry.get('farmAsset');
    const field = asset?.fields?.name;

    const resolved = field
      ? registry.resolveField(field)
      : undefined;

    expect(resolved?.validation).toEqual({
      required: true,
      minLength: 1,
      maxLength: 100,
    });
  });

  it('keeps all three resources tied to the same reusable definition', () => {
    expect(registry.get('farm')?.fields?.name?.definition).toBe('name');
    expect(registry.get('crop')?.fields?.name?.definition).toBe('name');
    expect(registry.get('farmAsset')?.fields?.name?.definition).toBe('name');
  });
});

describe('RegistryService - central resource field resolver', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );

    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'minLength',
        'maxLength',
      ],
    });

    registry.register({
      name: 'farm',
      module: 'farms',
      model: 'Farm',
      fields: {
        name: {
          definition: 'name',
        },
      },
    });

    registry.register({
      name: 'crop',
      module: 'farms',
      model: 'Crop',
      fields: {
        name: {
          definition: 'name',
        },
      },
    });

    registry.register({
      name: 'farmAsset',
      module: 'farms',
      model: 'FarmAsset',
      fields: {
        name: {
          definition: 'name',
          override: {
            validation: {
              maxLength: 100,
            },
          },
        },
      },
    });
  });

  it('resolves Farm.name through the central doorway', () => {
    const field = registry.resolveResourceField('farm', 'name');

    expect(field?.name).toBe('name');
    expect(field?.type).toBe('string');
    expect(field?.validation?.required).toBe(true);
    expect(field?.validation?.maxLength).toBe(200);
  });

  it('resolves Crop.name through the same central doorway', () => {
    const field = registry.resolveResourceField('crop', 'name');

    expect(field?.name).toBe('name');
    expect(field?.validation?.maxLength).toBe(200);
  });

  it('resolves the FarmAsset.name override through the same doorway', () => {
    const field = registry.resolveResourceField('farmAsset', 'name');

    expect(field?.name).toBe('name');
    expect(field?.validation?.required).toBe(true);
    expect(field?.validation?.maxLength).toBe(100);
  });

  it('returns undefined for an unknown resource', () => {
    expect(
      registry.resolveResourceField('unknown', 'name'),
    ).toBeUndefined();
  });

  it('returns undefined for a field not registered on the resource', () => {
    expect(
      registry.resolveResourceField('farm', 'unknown'),
    ).toBeUndefined();
  });
});

describe('RegistryService field validation integration', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );

    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'minLength',
        'maxLength',
      ],
    });

    registry.register({
      name: 'farm',
      module: 'farms',
      model: 'Farm',
      fields: {
        name: {
          definition: 'name',
        },
      },
    });

    registry.register({
      name: 'farmAsset',
      module: 'farms',
      model: 'FarmAsset',
      fields: {
        name: {
          definition: 'name',
          override: {
            validation: {
              maxLength: 100,
            },
          },
        },
      },
    });
  });

  it('validates a resource field through the central Registry', () => {
    const result = registry.validateResourceField(
      'farm',
      'name',
      'Green Valley',
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid values using the effective resource field definition', () => {
    const result = registry.validateResourceField(
      'farmAsset',
      'name',
      '',
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be at least 1 characters long.',
    );
  });

  it('uses the resource override when validating', () => {
    const result = registry.validateResourceField(
      'farmAsset',
      'name',
      'A'.repeat(101),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be at most 100 characters long.',
    );
  });

  it('rejects an unknown resource field', () => {
    const result = registry.validateResourceField(
      'farm',
      'unknown',
      'value',
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Field 'unknown' is not registered for resource 'farm'.",
    );
  });
});

describe('RegistryService controlled field overrides', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );

    registry.registerField({
      name: 'name',
      type: 'string',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'minLength',
        'maxLength',
      ],
    });
  });

  it('allows an explicitly permitted validation override', () => {
    const result = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          maxLength: 100,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result?.validation?.maxLength).toBe(100);
    expect(result?.validation?.required).toBe(true);
  });

  it('rejects a validation characteristic that is not explicitly permitted', () => {
    const result = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          required: false,
        },
      },
    });

    expect(result).toBeUndefined();
  });

  it('rejects an override that weakens an allowed restriction', () => {
    const result = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          minLength: 0,
        },
      },
    });

    expect(result).toBeUndefined();
  });

  it('allows a stricter explicitly permitted minimum', () => {
    const result = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          minLength: 3,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result?.validation?.minLength).toBe(3);
  });

  it('protects characteristics that are not listed as overridable', () => {
    const result = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          pattern: '^[A-Z]+$',
        },
      },
    });

    expect(result).toBeUndefined();
  });

  it('keeps the base field definition unchanged after an override', () => {
    const resolved = registry.resolveField({
      definition: 'name',
      override: {
        validation: {
          maxLength: 100,
        },
      },
    });

    const base = registry.getField('name');

    expect(resolved?.validation?.maxLength).toBe(100);
    expect(base?.validation?.maxLength).toBe(200);
  });
});

describe('RegistryService - modules', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );
  });

  it('registers and retrieves a module', () => {
    registry.registerModule({
      id: 'farms',
      name: 'Farms',
      lifecycle: 'ACTIVE',
    });

    expect(registry.getModule('farms')).toEqual({
      id: 'farms',
      name: 'Farms',
      lifecycle: 'ACTIVE',
    });
  });

  it('lists registered modules', () => {
    registry.registerModule({
      id: 'platform',
      name: 'Platform',
      lifecycle: 'ACTIVE',
    });

    registry.registerModule({
      id: 'farms',
      name: 'Farms',
      lifecycle: 'ACTIVE',
    });

    expect(registry.getAllModules()).toEqual([
      {
        id: 'platform',
        name: 'Platform',
        lifecycle: 'ACTIVE',
      },
      {
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
      },
    ]);
  });

  it('reports whether a module is registered', () => {
    registry.registerModule({
      id: 'farms',
      name: 'Farms',
      lifecycle: 'ACTIVE',
    });

    expect(registry.hasModule('farms')).toBe(true);
    expect(registry.hasModule('unknown')).toBe(false);
  });
});

describe('RegistryService - module integrity', () => {
  let registry: RegistryService;

  beforeEach(() => {
    registry = new RegistryService(
      new FieldValidationService(),
    );
  });

  it('rejects duplicate module IDs', () => {
    registry.registerModule({
      id: 'platform',
      name: 'Platform',
      lifecycle: 'ACTIVE',
    });

    expect(() =>
      registry.registerModule({
        id: 'platform',
        name: 'Another Platform',
        lifecycle: 'ACTIVE',
      }),
    ).toThrow(
      "Module 'platform' is already registered.",
    );
  });

  it('rejects duplicate module names', () => {
    registry.registerModule({
      id: 'platform',
      name: 'Platform',
      lifecycle: 'ACTIVE',
    });

    expect(() =>
      registry.registerModule({
        id: 'core',
        name: 'Platform',
        lifecycle: 'ACTIVE',
      }),
    ).toThrow(
      "Module name 'Platform' is already registered by 'platform'.",
    );
  });

  it('rejects self-dependencies', () => {
    expect(() =>
      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['farms'],
      }),
    ).toThrow(
      "Module 'farms' cannot depend on itself.",
    );
  });

  it('rejects dependencies on unregistered modules', () => {
    expect(() =>
      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      }),
    ).toThrow(
      "Module 'farms' depends on unregistered module 'platform'.",
    );
  });

  it('accepts dependencies when the dependency is already registered', () => {
    registry.registerModule({
      id: 'platform',
      name: 'Platform',
      lifecycle: 'ACTIVE',
    });

    expect(() =>
      registry.registerModule({
        id: 'farms',
        name: 'Farms',
        lifecycle: 'ACTIVE',
        dependencies: ['platform'],
      }),
    ).not.toThrow();

    expect(registry.getModule('farms')).toEqual({
      id: 'farms',
      name: 'Farms',
      lifecycle: 'ACTIVE',
      dependencies: ['platform'],
    });
  });

  it('accepts a valid dependency chain', () => {
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

    expect(() =>
      registry.registerModule({
        id: 'crop',
        name: 'Crop',
        lifecycle: 'ACTIVE',
        dependencies: ['farms'],
      }),
    ).not.toThrow();
  });

  it('isolates the original registration input from later mutation', () => {
    const definition = {
      id: 'platform',
      name: 'Platform',
      lifecycle: 'ACTIVE' as const,
      dependencies: [] as string[],
    };

    registry.registerModule(definition);

    definition.name = 'Mutated Platform';
    definition.dependencies.push('unexpected');

    expect(registry.getModule('platform')).toEqual({
      id: 'platform',
      name: 'Platform',
      lifecycle: 'ACTIVE',
      dependencies: [],
    });
  });

  it('isolates registered module definitions from external mutation', () => {
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

    const firstRead = registry.getModule('farms');

    expect(firstRead).toBeDefined();

    firstRead!.name = 'Mutated Farms';
    firstRead!.dependencies!.push('unexpected');

    const secondRead = registry.getModule('farms');

    expect(secondRead).toEqual({
      id: 'farms',
      name: 'Farms',
      lifecycle: 'ACTIVE',
      dependencies: ['platform'],
    });
  });

  describe('capabilities', () => {
    it('accepts a valid first-class capability declaration', () => {
      registry.register({
        module: 'platform',
        name: 'capability-test',
        model: 'CapabilityTest',
        capabilities: [
          {
            action: 'READ' as never,
            scopes: ['GLOBAL'] as never,
          },
        ],
      });

      expect(registry.get('capability-test')?.capabilities).toEqual([
        {
          action: 'READ',
          scopes: ['GLOBAL'],
        },
      ]);
    });

    it('rejects capability without scopes', () => {
      expect(() =>
        registry.register({
          module: 'platform',
          name: 'invalid-capability-no-scope',
          model: 'InvalidCapabilityNoScope',
          capabilities: [
            {
              action: 'READ' as never,
              scopes: [] as never,
            },
          ],
        }),
      ).toThrow(
        "Resource 'invalid-capability-no-scope' capability 'READ' must declare at least one scope.",
      );
    });

    it('rejects duplicate capability actions', () => {
      expect(() =>
        registry.register({
          module: 'platform',
          name: 'invalid-capability-duplicate-action',
          model: 'InvalidCapabilityDuplicateAction',
          capabilities: [
            {
              action: 'READ' as never,
              scopes: ['GLOBAL'] as never,
            },
            {
              action: 'READ' as never,
              scopes: ['OWN'] as never,
            },
          ],
        }),
      ).toThrow(
        "Resource 'invalid-capability-duplicate-action' declares duplicate capability 'READ'.",
      );
    });

    it('rejects duplicate scopes within one capability', () => {
      expect(() =>
        registry.register({
          module: 'platform',
          name: 'invalid-capability-duplicate-scope',
          model: 'InvalidCapabilityDuplicateScope',
          capabilities: [
            {
              action: 'READ' as never,
              scopes: ['GLOBAL', 'GLOBAL'] as never,
            },
          ],
        }),
      ).toThrow(
        "Resource 'invalid-capability-duplicate-scope' capability 'READ' declares duplicate scopes.",
      );
    });
  });

});
