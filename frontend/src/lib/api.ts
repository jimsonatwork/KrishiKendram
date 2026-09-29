const API_BASE_URL = 'http://localhost:3000/api/v1'

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

    throw new Error(errorMessage)
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

  livestock: (token: string) =>
    request<any[]>('/livestock', {
      headers: { Authorization: `Bearer ${token}` },
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

  createIntake: (
    data: {
      farmId: string
      inputMethod: string
      content: string
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
