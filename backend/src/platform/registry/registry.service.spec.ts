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
