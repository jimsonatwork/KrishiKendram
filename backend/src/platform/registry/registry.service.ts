import { Injectable } from '@nestjs/common';

import {
  FieldDefinition,
  FieldReference,
} from './field-definition.interface';
import { FieldValidationResult } from './field-validation.service';
import { FieldValidationService } from './field-validation.service';
import { ResourceDefinition } from './resource-definition.interface';

@Injectable()
export class RegistryService {
  private readonly resources = new Map<string, ResourceDefinition>();

  private readonly fields = new Map<string, FieldDefinition>();

  constructor(
    private readonly fieldValidation: FieldValidationService,
  ) {}

  register(definition: ResourceDefinition): void {
    this.resources.set(definition.name, definition);
  }

  get(name: string): ResourceDefinition | undefined {
    return this.resources.get(name);
  }

  getAll(): ResourceDefinition[] {
    return [...this.resources.values()];
  }

  has(name: string): boolean {
    return this.resources.has(name);
  }

  registerField(definition: FieldDefinition): void {
    this.fields.set(definition.name, definition);
  }

  getField(name: string): FieldDefinition | undefined {
    return this.fields.get(name);
  }

  getAllFields(): FieldDefinition[] {
    return [...this.fields.values()];
  }

  validateResourceField(
    resourceName: string,
    fieldName: string,
    value: unknown,
  ): FieldValidationResult {
    const definition = this.resolveResourceField(
      resourceName,
      fieldName,
    );

    if (!definition) {
      return {
        valid: false,
        value: undefined,
        errors: [
          `Field '${fieldName}' is not registered for resource '${resourceName}'.`,
        ],
      };
    }

    return this.fieldValidation.validate(
      definition,
      value,
    );
  }

  resolveResourceField(
    resourceName: string,
    fieldName: string,
  ): FieldDefinition | undefined {
    const resource = this.get(resourceName);

    if (!resource) {
      return undefined;
    }

    const reference = resource.fields?.[fieldName];

    if (!reference) {
      return undefined;
    }

    return this.resolveField(reference);
  }

  resolveField(
    reference: FieldReference,
  ): FieldDefinition | undefined {
    const base = this.getField(reference.definition);

    if (!base) {
      return undefined;
    }

    if (!reference.override) {
      return base;
    }

    const mode = base.overrideMode ?? 'FIXED';

    if (mode === 'FIXED') {
      return undefined;
    }

    if (mode === 'EXTENDABLE') {
      if (
        reference.override.validation &&
        !this.areValidationOverridesPermitted(
          base,
          reference.override.validation,
        )
      ) {
        return undefined;
      }

      if (
        reference.override.validation &&
        !this.isValidationExtensionAllowed(
          base.validation,
          reference.override.validation,
        )
      ) {
        return undefined;
      }
    }

    return {
      ...base,
      ...reference.override,
      validation: {
        ...base.validation,
        ...reference.override.validation,
      },
    };
  }

  private areValidationOverridesPermitted(
    base: FieldDefinition,
    override: FieldDefinition['validation'],
  ): boolean {
    if (!override) {
      return true;
    }

    const allowed = new Set(
      base.overridableValidation ?? [],
    );

    return Object.keys(override).every((key) =>
      allowed.has(
        key as keyof FieldDefinition['validation'],
      ),
    );
  }

  private isValidationExtensionAllowed(
    base: FieldDefinition['validation'],
    override: FieldDefinition['validation'],
  ): boolean {
    if (!base || !override) {
      return true;
    }

    if (
      override.required === false &&
      base.required === true
    ) {
      return false;
    }

    if (
      override.minLength !== undefined &&
      base.minLength !== undefined &&
      override.minLength < base.minLength
    ) {
      return false;
    }

    if (
      override.maxLength !== undefined &&
      base.maxLength !== undefined &&
      override.maxLength > base.maxLength
    ) {
      return false;
    }

    if (
      override.min !== undefined &&
      base.min !== undefined &&
      override.min < base.min
    ) {
      return false;
    }

    if (
      override.max !== undefined &&
      base.max !== undefined &&
      override.max > base.max
    ) {
      return false;
    }

    if (
      override.pattern !== undefined &&
      base.pattern !== undefined &&
      override.pattern !== base.pattern
    ) {
      return false;
    }

    return true;
  }
}
