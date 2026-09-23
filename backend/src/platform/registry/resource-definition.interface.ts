import { FieldReference } from './field-definition.interface';
import { CapabilityDefinition } from './capability-definition.interface';

export interface ResourceDefinition {
  module: string;
  name: string;
  model: string;

  ownerField?: string;

  searchableFields?: string[];

  sortableFields?: string[];

  defaultSort?: string;

  /**
   * First-class capability declarations.
   *
   * These declarations describe the actions and scopes supported by
   * this resource. They do not grant permissions by themselves.
   */
  capabilities?: CapabilityDefinition[];

  /**
   * Legacy capability metadata retained during the incremental migration.
   */
  permissions?: string[];

  scopes?: string[];

  features?: string[];

  softDelete?: boolean;

  fields?: Record<string, FieldReference>;
}