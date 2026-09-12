import { Injectable } from '@nestjs/common';

import { FieldDefinition } from './field-definition.interface';

export interface FieldValidationResult {
  valid: boolean;
  value: unknown;
  errors: string[];
}

@Injectable()
export class FieldValidationService {
  normalize(
    definition: FieldDefinition,
    value: unknown,
  ): unknown {
    if (
      value === undefined ||
      value === null
    ) {
      return value;
    }

    if (
      definition.type === 'string' &&
      typeof value === 'string'
    ) {
      let normalizedValue = value;

      if (definition.normalization?.trim) {
        normalizedValue =
          normalizedValue.trim();
      }

      if (definition.normalization?.lowercase) {
        normalizedValue =
          normalizedValue.toLowerCase();
      }

      return normalizedValue;
    }

    return value;
  }

  validate(
    definition: FieldDefinition,
    value: unknown,
  ): FieldValidationResult {
    const normalizedValue =
      this.normalize(
        definition,
        value,
      );

    const errors: string[] = [];
    const rules = definition.validation;

    if (
      normalizedValue === undefined ||
      normalizedValue === null
    ) {
      if (rules?.required) {
        errors.push(
          'Field is required.',
        );
      }

      return {
        valid: errors.length === 0,
        value: normalizedValue,
        errors,
      };
    }

    switch (definition.type) {
      case 'string':
        this.validateString(
          normalizedValue,
          rules,
          errors,
        );
        break;

      case 'number':
        this.validateNumber(
          normalizedValue,
          rules,
          errors,
        );
        break;

      case 'boolean':
        this.validateBoolean(
          normalizedValue,
          errors,
        );
        break;

      case 'enum':
        this.validateEnum(
          normalizedValue,
          rules,
          errors,
        );
        break;

      case 'date':
        this.validateDate(
          normalizedValue,
          errors,
        );
        break;

      case 'datetime':
        this.validateDateTime(
          normalizedValue,
          errors,
        );
        break;

      case 'object':
        this.validateObject(
          normalizedValue,
          errors,
        );
        break;

      default:
        break;
    }

    return {
      valid: errors.length === 0,
      value: normalizedValue,
      errors,
    };
  }

  private validateString(
    value: unknown,
    rules: FieldDefinition['validation'],
    errors: string[],
  ): void {
    if (typeof value !== 'string') {
      errors.push(
        'Field must be a string.',
      );
      return;
    }

    if (
      rules?.minLength !== undefined &&
      value.length < rules.minLength
    ) {
      errors.push(
        `Field must be at least ${rules.minLength} characters long.`,
      );
    }

    if (
      rules?.maxLength !== undefined &&
      value.length > rules.maxLength
    ) {
      errors.push(
        `Field must be at most ${rules.maxLength} characters long.`,
      );
    }

    if (
      rules?.pattern !== undefined &&
      !new RegExp(
        rules.pattern,
      ).test(value)
    ) {
      errors.push(
        'Field format is invalid.',
      );
    }
  }

  private validateNumber(
    value: unknown,
    rules: FieldDefinition['validation'],
    errors: string[],
  ): void {
    if (
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      errors.push(
        'Field must be a valid number.',
      );
      return;
    }

    if (
      rules?.integer === true &&
      !Number.isInteger(value)
    ) {
      errors.push(
        'Field must be an integer.',
      );
    }

    if (
      rules?.min !== undefined &&
      value < rules.min
    ) {
      errors.push(
        `Field must be at least ${rules.min}.`,
      );
    }

    if (
      rules?.max !== undefined &&
      value > rules.max
    ) {
      errors.push(
        `Field must be at most ${rules.max}.`,
      );
    }
  }

  private validateBoolean(
    value: unknown,
    errors: string[],
  ): void {
    if (typeof value !== 'boolean') {
      errors.push(
        'Field must be a boolean.',
      );
    }
  }

  private validateEnum(
    value: unknown,
    rules: FieldDefinition['validation'],
    errors: string[],
  ): void {
    if (typeof value !== 'string') {
      errors.push(
        'Field must be a valid enum value.',
      );
      return;
    }

    const allowedValues =
      rules?.enumValues;

    if (
      !allowedValues ||
      allowedValues.length === 0
    ) {
      errors.push(
        'Enum field has no registered values.',
      );
      return;
    }

    if (!allowedValues.includes(value)) {
      errors.push(
        'Field contains an invalid enum value.',
      );
    }
  }

  private validateDate(
    value: unknown,
    errors: string[],
  ): void {
    if (
      !(
        value instanceof Date ||
        typeof value === 'string'
      )
    ) {
      errors.push(
        'Field must be a valid date.',
      );
      return;
    }

    const parsed =
      value instanceof Date
        ? value
        : new Date(value);

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      errors.push(
        'Field must be a valid date.',
      );
    }
  }

  private validateDateTime(
    value: unknown,
    errors: string[],
  ): void {
    if (
      !(
        value instanceof Date ||
        typeof value === 'string'
      )
    ) {
      errors.push(
        'Field must be a valid datetime.',
      );
      return;
    }

    const parsed =
      value instanceof Date
        ? value
        : new Date(value);

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      errors.push(
        'Field must be a valid datetime.',
      );
    }
  }

  private validateObject(
    value: unknown,
    errors: string[],
  ): void {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      errors.push(
        'Field must be an object.',
      );
    }
  }
}
