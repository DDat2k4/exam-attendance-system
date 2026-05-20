import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getRefreshToken, refreshToken as refreshAccessToken } from '../api/auth'
import { getUserFromToken } from '../utils/jwt'

const AuthContext = createContext()
const DEFAULT_REFRESH_LEEWAY_MS = 60 * 1000
const parsedRefreshLeeway = Number(import.meta.env.VITE_TOKEN_REFRESH_LEEWAY_MS)
const REFRESH_LEEWAY_MS =
  Number.isFinite(parsedRefreshLeeway) && parsedRefreshLeeway >= 0
    ? parsedRefreshLeeway
    : DEFAULT_REFRESH_LEEWAY_MS

const isTokenExpired = (user) => {
  if (!user?.exp) return false
  return user.exp * 1000 <= Date.now()
}

const stableUserKey = (value) => {
  if (!value || typeof value !== 'object') return ''

  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${Array.isArray(value[key]) ? `[${value[key].join(',')}]` : String(value[key] ?? '')}`)
    .join('|')
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const current = getUserFromToken()
    return isTokenExpired(current) ? null : current
  })
  const [authLoading, setAuthLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const current = getUserFromToken()
    const currentKey = stableUserKey(current)
    const existingKey = stableUserKey(user)

    if (current && !isTokenExpired(current)) {
      if (currentKey !== existingKey) {
        setUser(current)
      }
      return current
    }

    const storedRefreshToken = getRefreshToken()
    if (!storedRefreshToken) {
      setUser(null)
      return null
    }

    try {
      await refreshAccessToken()
      const refreshed = getUserFromToken()
      const safeUser = isTokenExpired(refreshed) ? null : refreshed
      const safeKey = stableUserKey(safeUser)
      if (safeKey !== existingKey) {
        setUser(safeUser)
      }
      return safeUser
    } catch {
      if (user !== null) {
        setUser(null)
      }
      return null
    }
  }, [user])

  useEffect(() => {
    let active = true

    const syncAuth = async (showLoading = false) => {
      if (showLoading) {
        setAuthLoading(true)
      }

      try {
        await refreshUser()
      } finally {
        if (active && showLoading) setAuthLoading(false)
      }
    }

    void syncAuth(true)

    const handleStorage = () => void syncAuth(false)
    const handleFocus = () => void syncAuth(false)
    const handleAuthChanged = () => void syncAuth(false)

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('auth-changed', handleAuthChanged)

    return () => {
      active = false
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('auth-changed', handleAuthChanged)
    }
  }, [refreshUser])

  useEffect(() => {
    if (!user?.exp) return undefined
    if (!getRefreshToken()) return undefined

    const expiresAtMs = user.exp * 1000
    const refreshAtMs = expiresAtMs - REFRESH_LEEWAY_MS
    const delayMs = Math.max(refreshAtMs - Date.now(), 0)

    const timerId = window.setTimeout(() => {
      void refreshUser()
    }, delayMs)

    return () => window.clearTimeout(timerId)
  }, [refreshUser, user?.exp])

  const logout = useCallback(() => {
    ;['access_token', 'refresh_token', 'username', 'avatar', 'userId'].forEach((key) => {
      localStorage.removeItem(key)
    })
    // Clear proctor session state
    sessionStorage.removeItem('proctor_roomId')
    setAuthLoading(false)
    setUser(null)
    window.dispatchEvent(new Event('auth-changed'))
  }, [])

  const value = useMemo(
    () => ({
      user,
      setUser,
      refreshUser,
      authLoading,
      logout,
      isAuthenticated: Boolean(user) && !isTokenExpired(user),
    }),
    [authLoading, logout, refreshUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
