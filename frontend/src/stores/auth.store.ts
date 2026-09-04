import { create } from 'zustand'

import { api } from '@/lib/api'

export type AuthUser = {
  id: string
  name: string
  email?: string
  mobile?: string
  role: string
  status: string
}

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isInitialized: boolean

  initialize: () => Promise<void>
  login: (identifier: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  clearSession: () => void
}

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

const getStoredToken = (key: string): string | null =>
  localStorage.getItem(key)

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const accessToken = getStoredToken(ACCESS_TOKEN_KEY)
    const refreshToken = getStoredToken(REFRESH_TOKEN_KEY)

    if (!accessToken) {
      set({
        user: null,
        accessToken: null,
        refreshToken,
        isInitialized: true,
        isLoading: false,
      })
      return
    }

    set({
      accessToken,
      refreshToken,
      isLoading: true,
    })

    try {
      const user = await api.me(accessToken)

      set({
        user,
        accessToken,
        refreshToken,
        isLoading: false,
        isInitialized: true,
      })
    } catch {
      get().clearSession()

      set({
        isLoading: false,
        isInitialized: true,
      })
    }
  },

  login: async (identifier, password) => {
    set({ isLoading: true })

    try {
      const result = await api.login({
        identifier,
        password,
      })

      localStorage.setItem(
        ACCESS_TOKEN_KEY,
        result.accessToken,
      )

      localStorage.setItem(
        REFRESH_TOKEN_KEY,
        result.refreshToken,
      )

      const user = await api.me(result.accessToken)

      set({
        user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isLoading: false,
        isInitialized: true,
      })

      return user
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    const { accessToken } = get()

    try {
      if (accessToken) {
        await api.logout(accessToken)
      }
    } catch {
      // Local session must still be cleared if the server request fails.
    } finally {
      get().clearSession()
    }
  },

  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    })
  },
}))
