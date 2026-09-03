export interface ResourceDefinition {
  name: string;
  model: string;

  ownerField?: string;

  searchableFields?: string[];

  sortableFields?: string[];

  defaultSort?: string;

  permissions?: string[];

  scopes?: string[];

  features?: string[];

  softDelete?: boolean;
}