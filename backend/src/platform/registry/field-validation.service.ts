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
        normalizedValue = normalizedValue.trim();
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
    const normalizedValue = this.normalize(
      definition,
      value,
    );

    const errors: string[] = [];
    const rules = definition.validation;

    if (normalizedValue === undefined || normalizedValue === null) {
      if (rules?.required) {
        errors.push('Field is required.');
      }

      return {
        valid: errors.length === 0,
        value: normalizedValue,
        errors,
      };
    }

    switch (definition.type) {
      case 'string':
        this.validateString(normalizedValue, rules, errors);
        break;

      case 'number':
        this.validateNumber(normalizedValue, rules, errors);
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
      errors.push('Field must be a string.');
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
      !new RegExp(rules.pattern).test(value)
    ) {
      errors.push('Field format is invalid.');
    }
  }

  private validateNumber(
    value: unknown,
    rules: FieldDefinition['validation'],
    errors: string[],
  ): void {
    if (
      typeof value !== 'number' ||
      Number.isNaN(value)
    ) {
      errors.push('Field must be a valid number.');
      return;
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
}
