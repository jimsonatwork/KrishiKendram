import type { FieldDefinition, FieldReference, ResourceDefinition } from './contracts'
export type ResolvedFieldPolicy = FieldDefinition & { resource: string; required: boolean }
export function resolveFieldPolicy(resource: ResourceDefinition, fieldName: string, fields: readonly FieldDefinition[]): ResolvedFieldPolicy | undefined {
  const reference: FieldReference | undefined = resource.fields?.[fieldName]
  if (!reference) return undefined
  const base = fields.find((field) => field.name === reference.definition)
  if (!base) return undefined
  const validation = { ...base.validation, ...reference.override?.validation }
  return { ...base, validation, resource: resource.name, required: validation.required === true }
}
export function validateFieldValue(policy: ResolvedFieldPolicy, value: unknown): string[] {
  const validation = policy.validation ?? {}; const errors: string[] = []
  if (validation.required && (value === undefined || value === null || value === '')) { errors.push(policy.name + ' is required.'); return errors }
  if (value === undefined || value === null || value === '') return errors
  if (validation.minLength !== undefined && typeof value === 'string' && value.length < validation.minLength) errors.push(policy.name + ' is too short.')
  if (validation.maxLength !== undefined && typeof value === 'string' && value.length > validation.maxLength) errors.push(policy.name + ' is too long.')
  if (validation.min !== undefined && typeof value === 'number' && value < validation.min) errors.push(policy.name + ' is below the minimum.')
  if (validation.max !== undefined && typeof value === 'number' && value > validation.max) errors.push(policy.name + ' exceeds the maximum.')
  if (validation.integer && typeof value === 'number' && !Number.isInteger(value)) errors.push(policy.name + ' must be an integer.')
  if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) errors.push(policy.name + ' has an invalid format.')
  if (validation.enumValues && validation.enumValues.length > 0 && !validation.enumValues.includes(String(value))) errors.push(policy.name + ' has an invalid value.')
  return errors
}
