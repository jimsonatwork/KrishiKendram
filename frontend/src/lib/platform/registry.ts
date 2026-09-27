import type { FieldDefinition, ModuleDefinition, ResourceDefinition } from './contracts'
const API_BASE_URL = 'http://localhost:3000/api/v1'
async function request<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(API_BASE_URL + path, { headers: token ? { Authorization: 'Bearer ' + token } : undefined })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error('Registry request failed')
  return data as T
}
export const platformRegistry = {
  resources: (token?: string) => request<ResourceDefinition[]>('/registry', token),
  resource: (name: string, token?: string) => request<ResourceDefinition>('/registry/' + encodeURIComponent(name), token),
  modules: (token?: string) => request<ModuleDefinition[]>('/registry/modules', token),
  fields: (token?: string) => request<FieldDefinition[]>('/registry/fields', token),
}
