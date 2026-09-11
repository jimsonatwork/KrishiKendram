import { FieldValidationService } from './field-validation.service';

describe('FieldValidationService', () => {
  let validator: FieldValidationService;

  beforeEach(() => {
    validator = new FieldValidationService();
  });

  it('accepts a valid required string', () => {
    const result = validator.validate(
      {
        name: 'name',
        type: 'string',
        validation: {
          required: true,
          minLength: 1,
          maxLength: 200,
        },
      },
      'My Farm',
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a missing required value', () => {
    const result = validator.validate(
      {
        name: 'name',
        type: 'string',
        validation: {
          required: true,
        },
      },
      undefined,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field is required.');
  });

  it('rejects a string shorter than minLength', () => {
    const result = validator.validate(
      {
        name: 'name',
        type: 'string',
        validation: {
          minLength: 3,
        },
      },
      'AB',
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be at least 3 characters long.',
    );
  });

  it('rejects a string longer than maxLength', () => {
    const result = validator.validate(
      {
        name: 'name',
        type: 'string',
        validation: {
          maxLength: 5,
        },
      },
      'TooLong',
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be at most 5 characters long.',
    );
  });

  it('validates a string pattern', () => {
    const definition = {
      name: 'code',
      type: 'string' as const,
      validation: {
        pattern: '^[A-Z]+$',
      },
    };

    expect(
      validator.validate(definition, 'ABC').valid,
    ).toBe(true);

    expect(
      validator.validate(definition, 'abc').valid,
    ).toBe(false);
  });

  it('accepts a valid number', () => {
    const result = validator.validate(
      {
        name: 'area',
        type: 'number',
        validation: {
          min: 0,
          max: 1000,
        },
      },
      250,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a number below minimum', () => {
    const result = validator.validate(
      {
        name: 'area',
        type: 'number',
        validation: {
          min: 0,
        },
      },
      -1,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be at least 0.',
    );
  });

  it('rejects a number above maximum', () => {
    const result = validator.validate(
      {
        name: 'area',
        type: 'number',
        validation: {
          max: 100,
        },
      },
      101,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be at most 100.',
    );
  });

  it('rejects the wrong value type', () => {
    const result = validator.validate(
      {
        name: 'name',
        type: 'string',
      },
      123,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Field must be a string.',
    );
  });

  it('accepts an optional missing value', () => {
    const result = validator.validate(
      {
        name: 'description',
        type: 'string',
        validation: {
          required: false,
        },
      },
      undefined,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('FieldValidationService normalization', () => {
  let validator: FieldValidationService;

  beforeEach(() => {
    validator = new FieldValidationService();
  });

  it('trims a string when trim normalization is enabled', () => {
    const definition = {
      name: 'name',
      type: 'string' as const,
      normalization: {
        trim: true,
      },
    };

    expect(
      validator.normalize(
        definition,
        '  Green Valley  ',
      ),
    ).toBe('Green Valley');
  });

  it('does not trim when normalization is not enabled', () => {
    const definition = {
      name: 'name',
      type: 'string' as const,
    };

    expect(
      validator.normalize(
        definition,
        '  Green Valley  ',
      ),
    ).toBe('  Green Valley  ');
  });

  it('validates the normalized value', () => {
    const definition = {
      name: 'name',
      type: 'string' as const,
      normalization: {
        trim: true,
      },
      validation: {
        required: true,
        minLength: 1,
      },
    };

    const result = validator.validate(
      definition,
      '   ',
    );

    expect(result.valid).toBe(false);
    expect(result.value).toBe('');
    expect(result.errors).toContain(
      'Field must be at least 1 characters long.',
    );
  });

  it('preserves null and undefined during normalization', () => {
    const definition = {
      name: 'name',
      type: 'string' as const,
      normalization: {
        trim: true,
      },
    };

    expect(
      validator.normalize(definition, undefined),
    ).toBeUndefined();

    expect(
      validator.normalize(definition, null),
    ).toBeNull();
  });
});
