import { request } from '@/lib/api'
import type { FieldDefinition, ModuleDefinition, ModuleLifecycleStatus, ResourceDefinition } from './contracts'

export type FilesystemRegistry = {
  version: number
  root: string
  resources: Record<string, { relativePath: string; absolutePath: string; exists: boolean; kind: string }>
}

export type CredentialArtifactSettings = {
  version: number
  createPatternFile: boolean
  createPasswordFile: boolean
  patternDescription: string
  patternExample: string
  patternFileFormat: string
  passwordFileFormat: string
  artifactDirectory: string
}

export type CredentialArtifactStatus = CredentialArtifactSettings & { files: string[]; passwordFilePresent: boolean; patternFiles: string[] }

export type GodModeOverview = {
  identity: { email: string; authorityTier: string; role: string; singleton: boolean; normalUserManagementProtected: boolean }
  root: { wslPath: string; windowsPath: string; canonical: boolean; forbiddenProjectRoots: string[] }
  runtime: Record<string, unknown>
  paths: Record<string, string>
  environmentKeys: Array<{ key: string; source: string; owner: string; editableInGodMode: boolean; secret: boolean }>
  credentialPolicy: Record<string, unknown>
  registry: Record<string, unknown>
  controlPlane: Record<string, unknown>
  startupInvariant: Record<string, unknown>
  health: { api: boolean }
  counts: { users: number; activeUsers: number; superAdmins: number; systemGods: number; modules: number; resources: number; fields: number; permissions: number }
  credential: CredentialArtifactStatus
  recentAudit: Array<{ id: string; action: string; resourceType: string; resourceId: string | null; description: string | null; createdAt: string }>
  recovery: { singletonEnforced: boolean; canonicalIdentityPresent: boolean; protected: boolean }
}

export type SuperControlRole = { role: string; userCount: number; permissionCount: number }
export type SuperControlPermission = {
  id: string
  module: string
  section: string | null
  resource: string | null
  action: string
  scope: string
  inherited: boolean
  rolePermissions: Array<{ role: string }>
}

export const platformRegistry = {
  godModeOverview: (token: string) =>
    request<GodModeOverview>('/admin/god-mode/overview', {
      headers: { Authorization: 'Bearer ' + token },
    }),
  filesystem: (token: string) =>
    request<FilesystemRegistry>('/registry/filesystem', {
      headers: { Authorization: `Bearer ${token}` },
    }),
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
  moduleStatuses: (token: string) =>
    request<ModuleLifecycleStatus[]>('/registry/modules/status', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  fields: (token: string) =>
    request<FieldDefinition[]>('/registry/fields', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  superControlOverview: (token: string) =>
    request<any>('/admin/super-control/overview', { headers: { Authorization: 'Bearer ' + token } }),
  superControlRoles: (token: string) =>
    request<SuperControlRole[]>('/admin/super-control/roles', { headers: { Authorization: 'Bearer ' + token } }),
  superControlRolePermissions: (token: string, role: string) =>
    request<SuperControlPermission[]>('/admin/super-control/roles/' + encodeURIComponent(role) + '/permissions', {
      headers: { Authorization: 'Bearer ' + token },
    }),
  setSuperControlRolePermissions: (token: string, role: string, permissionIds: string[]) =>
    request<{ role: string; permissionIds: string[] }>('/admin/super-control/roles/' + encodeURIComponent(role) + '/permissions', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds }),
    }),

  credentialArtifacts: (token: string) =>
    request<CredentialArtifactStatus>('/registry/credential-artifacts', {
      headers: { Authorization: 'Bearer ' + token },
    }),
  updateCredentialArtifactSettings: (
    token: string,
    settings: { createPatternFile: boolean; createPasswordFile: boolean },
  ) =>
    request<CredentialArtifactSettings>('/registry/credential-artifacts/settings', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
      body: JSON.stringify(settings),
    }),

}
