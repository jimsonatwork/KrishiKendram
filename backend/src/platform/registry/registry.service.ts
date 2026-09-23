import { Injectable } from '@nestjs/common';

import {
  FieldDefinition,
  FieldReference,
} from './field-definition.interface';
import {
  FieldValidationResult,
  FieldValidationService,
} from './field-validation.service';
import { ModuleDefinition } from './module-definition.interface';
import { ResourceDefinition } from './resource-definition.interface';

@Injectable()
export class RegistryService {
  private readonly resources = new Map<string, ResourceDefinition>();

  private readonly modules = new Map<string, ModuleDefinition>();

  private readonly fields = new Map<string, FieldDefinition>();

  constructor(
    private readonly fieldValidation: FieldValidationService,
  ) {}

  register(definition: ResourceDefinition): void {
    this.validateCapabilities(definition);
    this.resources.set(definition.name, definition);
  }

  private validateCapabilities(definition: ResourceDefinition): void {
    const capabilities = definition.capabilities ?? [];
    const seenActions = new Set<string>();

    for (const capability of capabilities) {
      if (!capability.action) {
        throw new Error(
          `Resource '${definition.name}' declares a capability without an action.`,
        );
      }

      if (
        !Array.isArray(capability.scopes) ||
        capability.scopes.length === 0
      ) {
        throw new Error(
          `Resource '${definition.name}' capability '${capability.action}' must declare at least one scope.`,
        );
      }

      if (seenActions.has(capability.action)) {
        throw new Error(
          `Resource '${definition.name}' declares duplicate capability '${capability.action}'.`,
        );
      }

      seenActions.add(capability.action);

      const scopes = new Set(capability.scopes);

      if (scopes.size !== capability.scopes.length) {
        throw new Error(
          `Resource '${definition.name}' capability '${capability.action}' declares duplicate scopes.`,
        );
      }
    }
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

  registerModule(definition: ModuleDefinition): void {
    if (this.modules.has(definition.id)) {
      throw new Error(
        `Module '${definition.id}' is already registered.`,
      );
    }

    for (const existing of this.modules.values()) {
      if (existing.name === definition.name) {
        throw new Error(
          `Module name '${definition.name}' is already registered by '${existing.id}'.`,
        );
      }
    }

    if (definition.dependencies?.includes(definition.id)) {
      throw new Error(
        `Module '${definition.id}' cannot depend on itself.`,
      );
    }

    for (const dependency of definition.dependencies ?? []) {
      if (!this.modules.has(dependency)) {
        throw new Error(
          `Module '${definition.id}' depends on unregistered module '${dependency}'.`,
        );
      }
    }

    this.modules.set(
      definition.id,
      this.cloneModuleDefinition(definition),
    );

    if (this.hasModuleDependencyCycle()) {
      this.modules.delete(definition.id);

      throw new Error(
        `Module '${definition.id}' introduces a dependency cycle.`,
      );
    }
  }

  getModule(id: string): ModuleDefinition | undefined {
    const definition = this.modules.get(id);

    return definition
      ? this.cloneModuleDefinition(definition)
      : undefined;
  }

  getAllModules(): ModuleDefinition[] {
    return [...this.modules.values()].map((definition) =>
      this.cloneModuleDefinition(definition),
    );
  }

  hasModule(id: string): boolean {
    return this.modules.has(id);
  }

  // START: Module definition isolation
  private cloneModuleDefinition(
    definition: ModuleDefinition,
  ): ModuleDefinition {
    return {
      ...definition,
      dependencies: definition.dependencies
        ? [...definition.dependencies]
        : undefined,
    };
  }
  // END: Module definition isolation

  private hasModuleDependencyCycle(): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (moduleId: string): boolean => {
      if (visiting.has(moduleId)) {
        return true;
      }

      if (visited.has(moduleId)) {
        return false;
      }

      visiting.add(moduleId);

      const module = this.modules.get(moduleId);

      for (const dependency of module?.dependencies ?? []) {
        if (visit(dependency)) {
          return true;
        }
      }

      visiting.delete(moduleId);
      visited.add(moduleId);

      return false;
    };

    for (const moduleId of this.modules.keys()) {
      if (visit(moduleId)) {
        return true;
      }
    }

    return false;
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

  validateField(
    fieldName: string,
    value: unknown,
  ): FieldValidationResult {
    const definition = this.getField(fieldName);

    if (!definition) {
      return {
        valid: false,
        value: undefined,
        errors: [
          `Field '${fieldName}' is not registered.`,
        ],
      };
    }

    return this.fieldValidation.validate(
      definition,
      value,
    );
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

  private areEnumValuesCompatible(
    base: readonly string[],
    override: readonly string[],
  ): boolean {
    const allowed = new Set(base);

    return override.every(
      (value) => allowed.has(value),
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

    if (
      override.integer !== undefined &&
      base.integer !== undefined &&
      override.integer !== base.integer
    ) {
      return false;
    }

    if (
      override.enumValues !== undefined &&
      base.enumValues !== undefined &&
      !this.areEnumValuesCompatible(
        base.enumValues,
        override.enumValues,
      )
    ) {
      return false;
    }

    return true;
  }
}