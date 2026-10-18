export const DATA_REFRESH_POLICY = {
  staleAfterMs: 30_000,
  refetchOnWindowFocus: true,
  refetchOnRouteReturn: true,
  manualRefreshAlwaysAvailable: true,
} as const

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

import { reportAppError } from '@/stores/app-error.store'

type FarmData = {
  name: string
  type: string
  location?: string
  area?: number
  unit?: string
}

type CropData = {
  farmId: string
  name: string
  variety?: string
  season?: string
  status?: string
  sowingDate?: string
  harvestDate?: string
  area?: number
  unit?: string
  notes?: string
}

type AssetData = {
  type: string
  name?: string
  quantity?: number
  unit?: string
  metadata?: Record<string, unknown>
}

type RecordData = {
  category: string
  title?: string
  description?: string
  inputMethod: string
  data?: Record<string, unknown>
}

export type AiFactCandidate = {
  id: string
  conversationId: string
  userId: string
  sessionId?: string | null
  moduleId: string
  targetEntityType: string | null
  targetEntityId: string | null
  targetFieldId: string | null
  proposedValue: unknown
  previousValue: unknown
  confidence: number | string | null
  source: string
  status: string
  requiresConfirmation: boolean
  validationResult: unknown
  evidenceReference: string | null
  provenance: unknown
  createdAt: string
  updatedAt: string
  previewHash: string
  applied?: boolean
}

export type CreateAiFactCandidateInput = {
  targetModuleId: string
  targetEntityType: string
  targetEntityId?: string
  targetFieldId: string
  evidenceMessageId: string
  proposedValue: unknown
  confidence?: number
  sessionId?: string
}

export type AdminUser = {
  id: string
  name: string
  email: string | null
  mobile: string | null
  role: string
  status: string
  preferredLanguage: string | null
  preferredInputMethod: string
  profileCompletion: number
  isVerified: boolean
  lastLoginAt: string | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAdminUserData = {
  name: string
  email: string
  mobile?: string
  password: string
  role?: string
  status?: string
}

// ============================================================
// ADMIN USER UPDATE DATA
//
// These fields mirror the backend UpdateUserDto.
// Password is optional and represents a NEW password only.
// Existing password credentials are never returned to the client.
// ============================================================

export type UpdateAdminUserData = {
  name?: string
  email?: string
  mobile?: string
  password?: string
  role?: string
  status?: string
  preferredLanguage?: string
  preferredInputMethod?: string
  profileCompletion?: number
  isVerified?: boolean
}

// ============================================================
// ADMIN USER UPDATE DATA END
// ============================================================

export type TransferRequest = {
  id: string
  requestNumber: string
  resourceType: string
  resourceId: string
  sourceUserId: string
  destinationUserId: string
  quantity: number | null
  unit: string | null
  status: string
  requestedAt: string
  effectiveAt: string | null
  expiresAt: string | null
  reason: string | null
  transactionId: string | null
  evidenceId: string | null
  sourceUser?: { id: string; memberId: string | null; name: string }
  destinationUser?: { id: string; memberId: string | null; name: string }
}

export type UserHistoryEvent = {
  id: string
  userId: string
  version: number
  action: string
  actorId: string | null
  beforeData: unknown
  afterData: unknown
  changedFields: unknown
  createdAt: string
  actor?: { id: string; name: string; email: string } | null
}

export type UserRelationshipHistory = {
  id: string
  resourceType: string
  resourceId: string
  relationshipType: string
  status: string
  validFrom: string
  validUntil: string | null
  endedAt: string | null
  endedReason: string | null
  evidenceId: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type AuditEvent = {
  id: string
  actorId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  description: string | null
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    },
  )

  const data: unknown = await response
    .json()
    .catch(() => null)

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data
        ? (data as { message?: unknown }).message
        : undefined

    const errorMessage = Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : 'Request failed'

    const error = new ApiError(errorMessage, response.status, data)
    reportAppError(error, 'api')
    throw error
  }

  return data as T
}

export type PlatformAuditEvent = {
  id: string
  actorId?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  description?: string | null
  metadata?: unknown
  createdAt: string
}

export type PlatformPermissionReconciliation = {
  summary: { declaredCount: number; persistedResourcePermissionCount: number; coveredCount: number; missingCount: number; staleCount: number }
  declared: { module: string; resource: string; action: string; scope: string; persisted: boolean; permissionId: string | null }[]
  stale: { id: string; module: string; resource: string | null; action: string; scope: string }[]
}

export type PlatformPermission = {
  id: string
  module: string
  section: string | null
  resource: string | null
  action: string
  scope: string
  inherited: boolean
  rolePermissions: { role: string }[]
  fieldPermissions: { field: string; effect: string }[]
}

export const api = {
  platformPermissions: (token: string) =>
    request<PlatformPermission[]>('/platform/permissions', {
      headers: { Authorization: 'Bearer ' + token },
    }),
  platformPermissionReconciliation: (token: string) =>
    request<PlatformPermissionReconciliation>('/platform/permissions/reconciliation', {
      headers: { Authorization: 'Bearer ' + token },
    }),
  platformAuditRecent: (token: string, limit = 100) =>
    request<PlatformAuditEvent[]>('/platform/audit/recent?limit=' + limit, {
      headers: { Authorization: 'Bearer ' + token },
    }),

  register: (data: {
    name: string
    email: string
    password: string
  }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  users: (token: string) =>
    request<AdminUser[]>('/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  createUser: (
    data: CreateAdminUserData,
    token: string,
  ) =>
    request<AdminUser>('/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

  user: (
    id: string,
    token: string,
  ) =>
    request<AdminUser>(
      '/users/' + id,
      {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      },
    ),

  userContactConflicts: (
    id: string,
    email: string,
    mobile: string,
    token: string,
  ) =>
    request<{
      emailInUse: boolean
      mobileInUse: boolean
      combinationInUse: boolean
      emailAction: 'ALLOW' | 'WARNING' | 'BLOCK' | 'TRANSFER_REQUIRED' | 'CONFIRM_REQUIRED'
      mobileAction: 'ALLOW' | 'WARNING' | 'BLOCK' | 'TRANSFER_REQUIRED' | 'CONFIRM_REQUIRED'
      combinationAction: 'ALLOW' | 'WARNING' | 'BLOCK' | 'TRANSFER_REQUIRED' | 'CONFIRM_REQUIRED'
    }>(
      '/users/' +
        id +
        '/contact-conflicts?email=' +
        encodeURIComponent(email) +
        '&mobile=' +
        encodeURIComponent(mobile),
      {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      },
    ),

  updateUser: (
    id: string,
    data: UpdateAdminUserData,
    token: string,
  ) =>
    request<AdminUser>(`/users/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

	bulkDeleteUsers: (
  userIds: string[],
  token: string,
) =>
  request<{
    message: string
    count: number
    userIds: string[]
  }>('/users/bulk', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userIds,
    }),
  }),

  userActivity: (
    id: string,
    token: string,
    limit = 50,
  ) =>
    request<AuditEvent[]>(
      `/users/${id}/activity?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),

  userHistory: (
    id: string,
    token: string,
    limit = 50,
  ) =>
    request<UserHistoryEvent[]>(
      '/users/' + id + '/history?limit=' + limit,
      {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      },
    ),

  userRelationshipHistory: (
    id: string,
    token: string,
    limit = 100,
  ) =>
    request<UserRelationshipHistory[]>(
      '/users/' + id + '/relationships/history?limit=' + limit,
      {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      },
    ),

  recentUserActivity: (
    token: string,
    limit = 50,
  ) =>
    request<AuditEvent[]>(
      `/users/activity/recent?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),

  getAiVoiceIntents: (token: string) =>
    request<{
      registryId: string
      manifestId: string
      manifestVersion: number
      navigationPrefixes: string[]
      authorizationSource: string
      cropTerminology: {
        resourceId: string
        version: number
        ownerModule: string
        plantingVerbs: string[]
        imperativeCropAction: string
        cropRegistrationVerbs: string[]
        crops: Array<{ name: string; aliases: string[] }>
        areaUnits: string[]
        numberWords: Record<string, number>
      }
      privilegedIntentsAvailable: boolean
      restrictedIntents: Array<{ intentId: string; label: string; phrases: string[]; moduleId: string }>
      intents: Array<{
        intentId: string
        label: string
        phrases: string[]
        path: string
        access: 'AUTHENTICATED' | 'SYSTEM_GOD'
        moduleId: string
      }>
    }>('/ai/conversations/voice-intents', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAiConversationStatus: (token: string) =>
    request<{
      enabled: boolean
      ready: boolean
      canGenerate: boolean
      productionReady: boolean
      evaluationOnly: boolean
      providerId: string
      modelId: string
      modelVersion: string
      status: string
      mode: string
      cloudFallback: false
      databaseWriteAllowed: false
      runtime: { reachable: boolean; modelInstalled: boolean; error?: string }
    }>('/ai/conversations/status', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  requestAiConversationResponse: (
    token: string,
    conversationId: string,
    content: string,
    language?: string,
    signal?: AbortSignal,
  ) =>
    request<{
      message: { id: string; content: string }
      requiresValidation: true
      requiresUserConfirmation: true
    }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/respond`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content,
          ...(language ? { language } : {}),
        }),
        ...(signal ? { signal } : {}),
      },
    ),

  listAiConversations: (token: string) =>
    request<Array<{ id: string; title: string | null; primaryLanguage: string | null; status: string; lastMessageAt: string | null; updatedAt: string }>>(
      '/ai/conversations',
      { headers: { Authorization: `Bearer ${token}` } },
    ),

  createAiConversation: (token: string, primaryLanguage?: string) =>
    request<{ id: string }>('/ai/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(
        primaryLanguage ? { primaryLanguage } : {},
      ),
    }),

  appendAiConversationMessage: (
    token: string,
    conversationId: string,
    content: string,
    source: 'TEXT' | 'VOICE',
    language?: string,
  ) =>
    request<{ id: string }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content,
          source,
          ...(language ? { language } : {}),
        }),
      },
    ),

  getAiConversationHistory: (token: string, conversationId: string) =>
    request<Array<{ id: string; role: string; content: string; language: string | null; createdAt: string }>>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/history`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),

  getAiFactCandidates: (token: string, conversationId: string) =>
    request<AiFactCandidate[]>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/fact-candidates`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),

  createAiFactCandidate: (token: string, conversationId: string, input: CreateAiFactCandidateInput) =>
    request<{ candidate: AiFactCandidate; previewHash: string; validation: { valid: boolean; errors: string[]; normalizedValue: unknown; requiresUserConfirmation: true; applied: false } }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/fact-candidates`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    ),

  confirmAiFactCandidate: (token: string, conversationId: string, candidateId: string, previewHash: string) =>
    request<{ candidate: AiFactCandidate; previewHash: string; applied: false }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/fact-candidates/${encodeURIComponent(candidateId)}/confirm`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewHash }),
      },
    ),

  applyAiFactCandidate: (token: string, conversationId: string, candidateId: string, previewHash: string) =>
    request<{ candidate: AiFactCandidate; applied: true; created?: boolean; appliedCandidateIds?: string[]; targetEntityType: string; targetEntityId: string; targetFieldId: string }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/fact-candidates/${encodeURIComponent(candidateId)}/apply`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewHash }),
      },
    ),

  rejectAiFactCandidate: (token: string, conversationId: string, candidateId: string, previewHash: string, reason?: string) =>
    request<{ candidate: AiFactCandidate; applied: false }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/fact-candidates/${encodeURIComponent(candidateId)}/reject`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewHash, ...(reason ? { reason } : {}) }),
      },
    ),

  refresh: (refreshToken: string) =>
    request<{
      accessToken: string
      refreshToken: string
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  login: (data: {
    identifier: string
    password: string
  }) =>
    request<{
      accessToken: string
      refreshToken: string
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<{
      id: string
      name: string
      email?: string
      mobile?: string
      role: string
      status: string
      lastSeenAt?: string | null
    }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  logout: (token: string) =>
    request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  createFarm: (
    data: FarmData,
    token: string,
  ) =>
    request('/farms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

  farms: (token: string) =>
    request<any[]>('/farms/my', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  archivedFarms: (token: string) =>
    request<any[]>('/farms/archived', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  restoreFarm: (id: string, token: string) =>
    request(`/farms/${id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateFarm: (
    id: string,
    data: Partial<FarmData>,
    token: string,
  ) =>
    request(`/farms/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

  deleteFarm: (
    id: string,
    token: string,
  ) =>
    request(`/farms/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  findTransferMember: (memberId: string, token: string) =>
    request<{ id: string; memberId: string; name: string }>(
      '/resource-transfers/requests/members/' + encodeURIComponent(memberId),
      { headers: { Authorization: 'Bearer ' + token } },
    ),

  createTransfer: (
    data: {
      resourceType: string
      resourceId: string
      destinationUserId: string
      quantity?: number
      unit?: string
      reason?: string
      transactionId?: string
      evidenceReferenceType?: string
      evidenceReferenceValue?: string
      evidenceDocumentNumber?: string
      evidenceIssuer?: string
      effectiveAt?: string
      expiresAt?: string
    },
    token: string,
  ) =>
    request<TransferRequest>('/resource-transfers/requests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: JSON.stringify(data),
    }),

  transferIncomingPending: (token: string) =>
    request<TransferRequest[]>('/resource-transfers/requests/incoming/pending', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  transferPendingCount: (token: string) =>
    request<{ count: number }>('/resource-transfers/requests/pending/count', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  acceptTransfer: (id: string, token: string) =>
    request<TransferRequest>('/resource-transfers/requests/' + id + '/accept', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }),

  rejectTransfer: (id: string, token: string) =>
    request<TransferRequest>('/resource-transfers/requests/' + id + '/reject', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }),

  cancelTransfer: (id: string, token: string) =>
    request<TransferRequest>('/resource-transfers/requests/' + id + '/cancel', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }),

  transferOutgoing: (token: string) =>
    request<TransferRequest[]>('/resource-transfers/requests/outgoing', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  transferAdministrativePending: (token: string) =>
    request<TransferRequest[]>('/resource-transfers/requests/admin/pending', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  approveTransfer: (id: string, token: string, reason?: string) =>
    request<TransferRequest>('/resource-transfers/requests/' + id + '/approve', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(reason ? { reason } : {}),
    }),

  cropRelationshipHistory: (id: string, token: string) =>
    request<any[]>(`/crops/${id}/relationships/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  crops: (token: string) =>
    request<any[]>('/crops', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  marketplaceCategories: () => request<string[]>('/marketplace/categories'),
  marketplaceListings: (filters?: { period?: string; category?: string }) => {
    const params = new URLSearchParams()
    if (filters?.period) params.set('period', filters.period)
    if (filters?.category) params.set('category', filters.category)
    return request<any[]>('/marketplace/listings' + (params.size ? '?' + params.toString() : ''))
  },

  marketplaceOrders: (token: string) => request<any[]>('/marketplace/orders/mine', {
    headers: { Authorization: 'Bearer ' + token },
  }),

  marketplaceCommercePolicy: () => request<any>('/marketplace/commerce-policy'),
  marketplacePublicFeatureFlags: () => request<any[]>('/marketplace/features/public'),
  marketplaceFeatureFlags: (token: string) => request<any[]>('/marketplace/features', { headers: { Authorization: 'Bearer ' + token } }),
  updateMarketplaceFeatureFlag: (key: string, enabled: boolean, reason: string, token: string) => request<any>('/marketplace/features/' + encodeURIComponent(key), { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled, reason }) }),
  marketplaceHistory: (token: string) => request<any>('/marketplace/history/mine', { headers: { Authorization: 'Bearer ' + token } }),
  marketplaceSettlementStatement: (token: string) => request<any>('/marketplace/settlements/mine', { headers: { Authorization: 'Bearer ' + token } }),
  marketplaceTaxProfiles: (token: string) => request<any[]>('/marketplace/tax-profiles', { headers: { Authorization: 'Bearer ' + token } }),
  marketplaceSellerProfile: (token: string) => request<any>('/marketplace/profile/mine', { headers: { Authorization: 'Bearer ' + token } }),
  updateMarketplaceSellerProfile: (data: Record<string, unknown>, token: string) => request<any>('/marketplace/profile/mine', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  marketplaceFavorites: (token: string) => request<any[]>('/marketplace/favorites/mine', { headers: { Authorization: 'Bearer ' + token } }),
  addMarketplaceFavorite: (listingId: string, token: string) => request<any>('/marketplace/listings/' + encodeURIComponent(listingId) + '/favorite', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }),
  removeMarketplaceFavorite: (listingId: string, token: string) => request<any>('/marketplace/listings/' + encodeURIComponent(listingId) + '/favorite', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }),
  marketplaceMessages: (token: string) => request<any[]>('/marketplace/messages/mine', { headers: { Authorization: 'Bearer ' + token } }),
  sendMarketplaceMessage: (data: Record<string, unknown>, token: string) => request<any>('/marketplace/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  readMarketplaceMessage: (id: string, token: string) => request<any>('/marketplace/messages/' + encodeURIComponent(id) + '/read', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token } }),
  marketplaceOpenRFQs: (token: string) => request<any[]>('/marketplace/rfqs/open', { headers: { Authorization: 'Bearer ' + token } }),
  marketplaceMyRFQs: (token: string) => request<any[]>('/marketplace/rfqs/mine', { headers: { Authorization: 'Bearer ' + token } }),
  createMarketplaceRFQ: (data: Record<string, unknown>, token: string) => request<any>('/marketplace/rfqs', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  respondMarketplaceRFQ: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/rfqs/' + encodeURIComponent(id) + '/responses', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  decideMarketplaceRFQResponse: (id: string, responseId: string, status: 'ACCEPTED'|'REJECTED', reason: string, token: string) => request<any>('/marketplace/rfqs/' + encodeURIComponent(id) + '/responses/' + encodeURIComponent(responseId) + '/decision', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status, reason }) }),
  cancelMarketplaceRFQ: (id: string, reason: string, token: string) => request<any>('/marketplace/rfqs/' + encodeURIComponent(id) + '/cancel', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }),

  createMarketplaceTaxProfile: (data: Record<string, unknown>, token: string) => request<any>('/marketplace/tax-profiles', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  approveMarketplaceTaxProfile: (id: string, reviewReference: string, token: string) => request<any>('/marketplace/tax-profiles/' + encodeURIComponent(id) + '/approve', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewReference }) }),
  retireMarketplaceTaxProfile: (id: string, reason: string, token: string) => request<any>('/marketplace/tax-profiles/' + encodeURIComponent(id) + '/retire', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }),

  marketplacePayoutHolds: (token: string) => request<any[]>('/marketplace/settlements/holds', { headers: { Authorization: 'Bearer ' + token } }),
  createMarketplacePayoutHold: (orderId: string, reason: string, token: string, expiresAt?: string) => request<any>('/marketplace/settlements/orders/' + encodeURIComponent(orderId) + '/holds', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, expiresAt }) }),
  releaseMarketplacePayoutHold: (id: string, reason: string, token: string) => request<any>('/marketplace/settlements/holds/' + encodeURIComponent(id) + '/release', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }),
  runMarketplaceReconciliation: (token: string) => request<any>('/marketplace/settlements/reconciliation/run', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }),
  marketplaceReconciliationRuns: (token: string) => request<any[]>('/marketplace/settlements/reconciliation', { headers: { Authorization: 'Bearer ' + token } }),

  createMarketplaceTrustCase: (data: Record<string, unknown>, token: string) => request<any>('/marketplace/trust/cases', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  marketplaceTrustCases: (token: string) => request<any[]>('/marketplace/trust/cases', { headers: { Authorization: 'Bearer ' + token } }),
  resolveMarketplaceTrustCase: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/trust/cases/' + id + '/resolve', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  marketplaceRestrictions: (token: string) => request<any[]>('/marketplace/trust/restrictions', { headers: { Authorization: 'Bearer ' + token } }),
  revokeMarketplaceRestriction: (id: string, reason: string, token: string) => request<any>('/marketplace/trust/restrictions/' + id + '/revoke', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }),
  marketplaceReviewQueue: (token: string) => request<any[]>('/marketplace/reviews/moderation/queue', { headers: { Authorization: 'Bearer ' + token } }),
  moderateMarketplaceReview: (id: string, status: 'PUBLISHED' | 'REJECTED' | 'HIDDEN', token: string) => request<any>('/marketplace/reviews/' + id + '/moderate', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }),
  createMarketplaceReview: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/orders/' + id + '/reviews', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  respondMarketplaceReview: (id: string, response: string, token: string) => request<any>('/marketplace/reviews/' + id + '/response', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ response }) }),
  updateMarketplaceCommercePolicy: (data: Record<string, unknown>, token: string) => request<any>('/marketplace/commerce-policy', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

  uploadMarketplaceMedia: async (file: File, kind: 'images' | 'videos', token: string) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(API_BASE_URL + '/marketplace/media/' + kind, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body })
    const data: any = await response.json().catch(() => null)
    if (!response.ok) {
      const message = typeof data?.message === 'string' ? data.message : Array.isArray(data?.message) ? data.message.join(', ') : 'Marketplace media upload failed.'
      const error = new ApiError(message, response.status, data)
      reportAppError(error, 'api')
      throw error
    }
    return data as { id: string; mediaType: 'image' | 'video'; mimeType: string; sizeBytes: number; url: string }
  },

  createMarketplaceSandboxRefund: (id: string, data: { idempotencyKey: string; amount: string; reason: string }, token: string) => request<any>('/marketplace/orders/' + id + '/payments/sandbox-refunds', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  createMarketplaceSandboxPaymentIntent: (id: string, idempotencyKey: string, token: string) => request<any>('/marketplace/orders/' + id + '/payments/sandbox-intent', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotencyKey }),
  }),

  marketplaceQuote: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/listings/' + id + '/quote', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  createMarketplaceOrder: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/listings/' + id + '/orders', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  updateMarketplaceDelivery: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/orders/' + id + '/delivery', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  confirmMarketplaceDelivery: (id: string, token: string) => request<any>('/marketplace/orders/' + id + '/confirm-delivery', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({}) }),

  counterOfferMarketplaceOrder: (id: string, data: Record<string, unknown>, token: string) => request<any>('/marketplace/orders/' + id + '/counter-offer', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

  marketplaceOrderAction: (id: string, action: 'accept' | 'reject' | 'cancel' | 'complete' | 'confirm-price', data: Record<string, unknown>, token: string) => request<any>('/marketplace/orders/' + id + '/' + action, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  marketplaceMine: (token: string) =>
    request<any[]>('/marketplace/listings/mine', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createMarketplaceListing: (data: Record<string, unknown>, token: string) =>
    request<any>('/marketplace/listings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateMarketplaceListing: (id: string, data: Record<string, unknown>, token: string) =>
    request<any>('/marketplace/listings/' + id, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  publishMarketplaceListing: (id: string, token: string) =>
    request<any>(`/marketplace/listings/${id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  deleteMarketplaceListing: (id: string, token: string) =>
    request<any>(`/marketplace/listings/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  notifications: (token: string) => request<any[]>('/notifications', { headers: { Authorization: 'Bearer ' + token } }),
  notificationUnreadCount: (token: string) => request<{ unreadCount: number }>('/notifications/unread-count', { headers: { Authorization: 'Bearer ' + token } }),
  markNotificationRead: (id: string, token: string) => request<any>('/notifications/' + id + '/read', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token } }),
  markAllNotificationsRead: (token: string) => request<{ markedRead: number }>('/notifications/read-all', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }),

  reportsOverview: (token: string, filters?: { farmId?: string; fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams()
    if (filters?.farmId) params.set('farmId', filters.farmId)
    if (filters?.fromDate) params.set('fromDate', filters.fromDate)
    if (filters?.toDate) params.set('toDate', filters.toDate)
    const query = params.toString()
    return request<any>('/reports/overview' + (query ? '?' + query : ''), { headers: { Authorization: 'Bearer ' + token } })
  },

  financeRecords: (token: string) => request<any[]>('/finance/records', { headers: { Authorization: 'Bearer ' + token } }),
  createFinanceRecord: (data: Record<string, unknown>, token: string) => request<any>('/finance/records', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateFinanceRecord: (id: string, data: Record<string, unknown>, token: string) => request<any>('/finance/records/' + id, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  archiveFinanceRecord: (id: string, token: string) => request<any>('/finance/records/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }),

  inventoryItems: (token: string) => request<any[]>('/inventory/items', { headers: { Authorization: 'Bearer ' + token } }),

  createInventoryItem: (data: Record<string, unknown>, token: string) => request<any>('/inventory/items', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  updateInventoryItem: (id: string, data: Record<string, unknown>, token: string) => request<any>('/inventory/items/' + id, {
    method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  archiveInventoryItem: (id: string, token: string) => request<any>('/inventory/items/' + id, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
  }),

  recordInventoryTransaction: (id: string, data: Record<string, unknown>, token: string) => request<any>('/inventory/items/' + id + '/transactions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),

  inventoryHistory: (id: string, token: string) => request<any[]>('/inventory/items/' + id + '/transactions', {
    headers: { Authorization: 'Bearer ' + token },
  }),

  livestockRecords: (id: string, token: string) => request<any[]>('/livestock/' + id + '/records', { headers: { Authorization: 'Bearer ' + token } }),
  createLivestockRecord: (id: string, data: Record<string, unknown>, token: string) => request<any>('/livestock/' + id + '/records', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

  livestock: (token: string) =>
    request<any[]>('/livestock', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  archivedLivestock: (token: string) =>
    request<any[]>('/livestock/archived', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  restoreLivestock: (id: string, token: string) =>
    request<any>('/livestock/' + id + '/restore', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }),

  createLivestock: (data: Record<string, unknown>, token: string) =>
    request<any>('/livestock', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  updateLivestock: (id: string, data: Record<string, unknown>, token: string) =>
    request<any>(`/livestock/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  deleteLivestock: (id: string, token: string) =>
    request<any>(`/livestock/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  livestockRelationshipHistory: (id: string, token: string) =>
    request<any[]>(`/livestock/${id}/relationships/history`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  archivedCrops: (token: string) =>
    request<any[]>('/crops/archived', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    }),

  createCrop: (
    data: CropData,
    token: string,
  ) =>
    request('/crops', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

  updateCrop: (
    id: string,
    data: Partial<CropData>,
    token: string,
  ) =>
    request(`/crops/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

  deleteCrop: (
    id: string,
    token: string,
  ) =>
    request(`/crops/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  restoreCrop: (id: string, token: string) =>
    request('/crops/' + id + '/restore', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    }),

  farmAssetRelationshipHistory: (
    farmId: string,
    assetId: string,
    token: string,
  ) =>
    request<any[]>(
      `/farms/${farmId}/assets/${assetId}/relationships/history`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),

  farmMovementHistory: (farmId: string, token: string) =>
    request<any[]>('/farms/' + farmId + '/movements/history', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  farmEvidenceHistory: (farmId: string, token: string) =>
    request<any[]>('/farms/' + farmId + '/evidence/history', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  farmAssetMovementHistory: (farmId: string, assetId: string, token: string) =>
    request<any[]>('/farms/' + farmId + '/assets/' + assetId + '/movements/history', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  farmAssetLineageHistory: (farmId: string, assetId: string, token: string) =>
    request<any[]>('/farms/' + farmId + '/assets/' + assetId + '/lineage/history', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  farmAssetEvidenceHistory: (farmId: string, assetId: string, token: string) =>
    request<any[]>('/farms/' + farmId + '/assets/' + assetId + '/evidence/history', {
      headers: { Authorization: 'Bearer ' + token },
    }),

  mergeFarmAssets: (
    farmId: string,
    data: {
      sourceAssetIds: string[]
      name?: string
      metadata?: Record<string, unknown>
      effectiveAt?: string
      reason?: string
    },
    token: string,
  ) =>
    request(`/farms/${farmId}/assets/merge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  splitFarmAsset: (
    farmId: string,
    assetId: string,
    data: {
      quantity: number
      name?: string
      metadata?: Record<string, unknown>
      effectiveAt?: string
      reason?: string
    },
    token: string,
  ) =>
    request(`/farms/${farmId}/assets/${assetId}/split`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  returnFarmAssetCustody: (
    farmId: string,
    assetId: string,
    data: {
      effectiveAt?: string
      reason?: string
      transactionId?: string
      evidenceReferenceType?: string
      evidenceReferenceValue?: string
      evidenceDocumentNumber?: string
      evidenceIssuer?: string
    },
    token: string,
  ) =>
    request(`/farms/${farmId}/assets/${assetId}/custodian/return`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  assignFarmAssetCustodian: (
    farmId: string,
    assetId: string,
    data: {
      destinationUserId: string
      effectiveAt?: string
      reason?: string
      transactionId?: string
      evidenceReferenceType?: string
      evidenceReferenceValue?: string
      evidenceDocumentNumber?: string
      evidenceIssuer?: string
    },
    token: string,
  ) =>
    request(`/farms/${farmId}/assets/${assetId}/custodian`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  leaseFarmAsset: (
    farmId: string,
    assetId: string,
    data: {
      destinationUserId: string
      validUntil: string
      effectiveAt?: string
      reason?: string
      transactionId?: string
      evidenceReferenceType?: string
      evidenceReferenceValue?: string
      evidenceDocumentNumber?: string
      evidenceIssuer?: string
    },
    token: string,
  ) =>
    request(`/farms/${farmId}/assets/${assetId}/lease`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  endFarmAssetLease: (
    farmId: string,
    assetId: string,
    data?: {
      effectiveAt?: string
      reason?: string
      transactionId?: string
      evidenceReferenceType?: string
      evidenceReferenceValue?: string
      evidenceDocumentNumber?: string
      evidenceIssuer?: string
    },
    token?: string,
  ) =>
    request(`/farms/${farmId}/assets/${assetId}/lease/end`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(data ?? {}),
    }),

  addFarmAsset: (
    farmId: string,
    data: AssetData,
    token: string,
  ) =>
    request(`/farms/${farmId}/assets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),

  updateFarmAsset: (
    farmId: string,
    assetId: string,
    data: Partial<AssetData>,
    token: string,
  ) =>
    request(
      `/farms/${farmId}/assets/${assetId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      },
    ),

  deleteFarmAsset: (
    farmId: string,
    assetId: string,
    token: string,
  ) =>
    request(
      `/farms/${farmId}/assets/${assetId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),

  addFarmRecord: (
    farmId: string,
    data: RecordData,
    token: string,
  ) =>
    request(
      `/farms/${farmId}/records`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      },
    ),

  translateIntake: (
    data: { sourceText: string; sourceLanguage: string },
    token: string,
  ) =>
    request<{
      sourceText: string
      sourceLanguage: string
      englishTranslation: string
      confidence: number | null
      confidenceThreshold: number
      confidenceMethod: string
      belowConfidenceThreshold: boolean
      numericMismatch: boolean
      unitMismatch: boolean
      plantingActionMismatch: boolean
      reviewNotes: string[]
      providerId: string
      modelId: string
      modelVersion: string
      generatedAt: string
      requiresUserReview: true
      requiresUserConfirmation: true
      saved: false
    }>(
      '/intake/translate',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: JSON.stringify(data),
      },
    ),

  createIntake: (
    data: {
      farmId: string
      inputMethod: string
      content: string
      originalContent?: string
      originalLanguage?: string
      englishTranslation?: string
      translationConfirmed?: boolean
    },
    token: string,
  ) =>
    request(
      '/intake',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      },
    ),
}
