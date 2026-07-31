export interface ResourceDefinition {
  name: string;
  model: string;

  ownerField?: string;

  searchableFields?: string[];

  sortableFields?: string[];

  defaultSort?: string;

  permissions?: string[];

  features?: string[];

  softDelete?: boolean;
}