export type FieldValueType =
  | 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum' | 'object'
export type FieldValidationDefinition = { required?: boolean; minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string; integer?: boolean; enumValues?: readonly string[] }
export type FieldNormalizationDefinition = { trim?: boolean; lowercase?: boolean }
export type FieldDefinition = { name: string; type: FieldValueType; description?: string; validation?: FieldValidationDefinition; normalization?: FieldNormalizationDefinition; overrideMode?: 'INHERITABLE' | 'FIXED' | 'EXTENDABLE'; overridableValidation?: Array<keyof FieldValidationDefinition> }
export type FieldReference = { definition: string; override?: { validation?: FieldValidationDefinition } }
export type CapabilityDefinition = { action: string; scopes: string[] }
export type ResourceDefinition = { module: string; name: string; model: string; ownerField?: string; searchableFields?: string[]; sortableFields?: string[]; defaultSort?: string; capabilities?: CapabilityDefinition[]; permissions?: string[]; scopes?: string[]; features?: string[]; softDelete?: boolean; fields?: Record<string, FieldReference> }
export type ModuleLifecycleStatus = { moduleId: string; lifecycle: 'ACTIVE' | 'DISABLED' | 'DEPRECATED'; operational: boolean; unavailableDependencies: string[] }
export type ModuleDefinition = { id: string; name: string; lifecycle: 'ACTIVE' | 'DISABLED' | 'DEPRECATED'; dependencies?: string[] }
