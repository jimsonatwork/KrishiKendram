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

async function request<T>(
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

export const api = {
  register: (data: {
    name: string
    email: string
    password: string
  }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
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

  crops: (token: string) =>
    request<any[]>('/crops', {
      headers: {
        Authorization: `Bearer ${token}`,
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
}