import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const SOCKET_STATUS = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
}

const normalizePath = (value = '') => {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '') || '/'
}

const buildWsEndpoint = (apiBaseUrl) => {
  if (!apiBaseUrl) {
    return '/ws'
  }

  try {
    const apiUrl = new URL(apiBaseUrl, window.location.origin)
    const basePath = apiUrl.pathname.replace(/\/api(?:\/.*)?$/i, '')
    const wsPath = normalizePath(`${basePath}/ws`).replace(/\/{2,}/g, '/')
    return `${apiUrl.origin}${wsPath}`
  } catch {
    return '/ws'
  }
}

const parseAlertPayload = (payload, fallbackRoomId) => {
  try {
    const parsed = JSON.parse(payload)
    return {
      type: String(parsed?.type || 'UNKNOWN').toUpperCase(),
      sessionId: parsed?.sessionId ?? null,
      userId: parsed?.userId ?? null,
      roomId: parsed?.roomId ?? fallbackRoomId,
      severity: String(parsed?.severity || 'LOW').toUpperCase(),
      message: parsed?.message || 'Cảnh báo mới từ hệ thống giám sát.',
      timestamp: parsed?.timestamp ?? Date.now(),
    }
  } catch {
    return {
      type: 'UNKNOWN',
      sessionId: null,
      userId: null,
      roomId: fallbackRoomId,
      severity: 'LOW',
      message: 'Không thể đọc nội dung cảnh báo từ server.',
      timestamp: Date.now(),
    }
  }
}

const toComparableId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return String(value)
}

export const useExamSessionAlerts = ({ sessionId, roomId, userId, enabled = true, onAlert }) => {
  const [socketStatus, setSocketStatus] = useState(SOCKET_STATUS.IDLE)
  const clientRef = useRef(null)
  const onAlertRef = useRef(onAlert)

  useEffect(() => {
    onAlertRef.current = onAlert
  }, [onAlert])

  useEffect(() => {
    const parsedRoomId = Number(roomId)
    const normalizedSessionId = toComparableId(sessionId)
    const normalizedUserId = toComparableId(userId)

    if (!enabled || !Number.isInteger(parsedRoomId) || parsedRoomId <= 0 || !normalizedSessionId) {
      if (clientRef.current) {
        clientRef.current.deactivate()
        clientRef.current = null
      }

      return undefined
    }

    const wsEndpoint = buildWsEndpoint(import.meta.env.VITE_API_BASE_URL)
    const roomTopic = `/topic/room/${parsedRoomId}`
    const token = localStorage.getItem('access_token')

    const client = new Client({
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      webSocketFactory: () => new SockJS(wsEndpoint),
      debug: () => {},
    })

    client.onConnect = () => {
      setSocketStatus(SOCKET_STATUS.CONNECTED)

      client.subscribe(roomTopic, (message) => {
        const incomingAlert = parseAlertPayload(message.body, parsedRoomId)
        const incomingSessionId = toComparableId(incomingAlert.sessionId)
        const incomingUserId = toComparableId(incomingAlert.userId)

        const sessionMatches = !incomingSessionId || incomingSessionId === normalizedSessionId
        const userMatches = !incomingUserId || !normalizedUserId || incomingUserId === normalizedUserId

        if (!sessionMatches || !userMatches) {
          return
        }

        onAlertRef.current?.(incomingAlert)
      })
    }

    client.onStompError = () => {
      setSocketStatus(SOCKET_STATUS.ERROR)
    }

    client.onWebSocketError = () => {
      setSocketStatus(SOCKET_STATUS.ERROR)
    }

    clientRef.current = client
    client.activate()

    return () => {
      setSocketStatus(SOCKET_STATUS.IDLE)
      client.deactivate()
      clientRef.current = null
    }
  }, [enabled, roomId, sessionId, userId])

  return { socketStatus }
}
