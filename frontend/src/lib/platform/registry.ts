import { request } from '@/lib/api'
import type { FieldDefinition, ModuleDefinition, ResourceDefinition } from './contracts'

export const platformRegistry = {
  resources: (token: string) =>
    request<ResourceDefinition[]>('/registry', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  resource: (name: string, token: string) =>
    request<ResourceDefinition>('/registry/' + encodeURIComponent(name), {
      headers: { Authorization: `Bearer ${token}` },
    }),
  modules: (token: string) =>
    request<ModuleDefinition[]>('/registry/modules', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  fields: (token: string) =>
    request<FieldDefinition[]>('/registry/fields', {
      headers: { Authorization: `Bearer ${token}` },
    }),
}
