export type FieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'object';

export type FieldOverrideMode =
  | 'INHERITABLE'
  | 'FIXED'
  | 'EXTENDABLE';

export interface FieldValidationDefinition {
  required?: boolean;

  minLength?: number;
  maxLength?: number;

  min?: number;
  max?: number;

  pattern?: string;
}

export interface FieldNormalizationDefinition {
  trim?: boolean;
  lowercase?: boolean;
}

export interface FieldDefinition {
  name: string;

  type: FieldValueType;

  description?: string;

  validation?: FieldValidationDefinition;

  normalization?: FieldNormalizationDefinition;

  /**
   * Controls how a resource-specific definition may
   * inherit or modify this reusable field.
   */
  overrideMode?: FieldOverrideMode;

  /**
   * Explicitly lists validation characteristics that
   * resource-specific definitions may override.
   *
   * This is intentionally separate from overrideMode.
   * A field may be extendable while only selected
   * characteristics are permitted to change.
   */
  overridableValidation?: Array<
    keyof FieldValidationDefinition
  >;
}

/**
 * Only explicitly supported characteristics may be
 * overridden by a resource.
 *
 * The field identity, type, description and override
 * mode remain centrally controlled.
 */
export interface FieldOverride {
  validation?: FieldValidationDefinition;
}

export interface FieldReference {
  /**
   * Name of the reusable field definition.
   *
   * Example:
   *   "name"
   */
  definition: string;

  /**
   * Resource-specific changes to the reusable field.
   */
  override?: FieldOverride;
}
