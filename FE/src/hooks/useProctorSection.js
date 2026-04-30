import { useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import {
  approveExamSession,
  flagExamSession,
  getExamSessionDashboard,
  getExamSessionVerificationHistory,
  rejectExamSession,
} from '../api/examSessionApi'
import { getRoomsByExamPaginated } from '../api/examRoomApi'

export const PROCTOR_STATUS_OPTIONS = ['STARTED', 'CHECKED_IN', 'DONE', 'BLOCKED']

const SOCKET_STATUS = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
}

const MAX_PROCTOR_ALERTS = 30

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
      sessionId: parsed?.sessionId ?? null,
      userId: parsed?.userId ?? null,
      roomId: parsed?.roomId ?? fallbackRoomId,
      severity: String(parsed?.severity || 'LOW').toUpperCase(),
      message: parsed?.message || 'Cảnh báo mới từ hệ thống giám sát.',
      timestamp: parsed?.timestamp ?? Date.now(),
    }
  } catch {
    return {
      sessionId: null,
      userId: null,
      roomId: fallbackRoomId,
      severity: 'LOW',
      message: 'Không thể đọc nội dung cảnh báo từ server.',
      timestamp: Date.now(),
    }
  }
}

export default function useProctorSection({
  activeSection,
  setActiveSection,
  hubSections,
  exams,
  loading,
  fetchExams,
  setError,
  setSuccess,
}) {
  const [proctorDashboard, setProctorDashboard] = useState([])
  const [loadingProctorDashboard, setLoadingProctorDashboard] = useState(false)
  const [proctorFilter, setProctorFilter] = useState({ roomId: '', status: '', flagged: '', keyword: '', page: 0, size: 20 })
  const [proctorPagination, setProctorPagination] = useState({ totalElements: 0, totalPages: 0, currentPage: 0, size: 20 })
  const [selectedProctorSession, setSelectedProctorSession] = useState(null)
  const [showProctorDetailModal, setShowProctorDetailModal] = useState(false)
  const [proctorHistory, setProctorHistory] = useState([])
  const [loadingProctorHistory, setLoadingProctorHistory] = useState(false)
  const [proctorReason, setProctorReason] = useState('')
  const [proctorActionLoading, setProctorActionLoading] = useState(false)
  const [showProctorRoomModal, setShowProctorRoomModal] = useState(false)
  const [proctorExamDraft, setProctorExamDraft] = useState('')
  const [proctorRoomDraft, setProctorRoomDraft] = useState('')
  const [proctorRoomOptions, setProctorRoomOptions] = useState([])
  const [loadingProctorRooms, setLoadingProctorRooms] = useState(false)
  const [proctorAlerts, setProctorAlerts] = useState([])
  const [proctorToasts, setProctorToasts] = useState([])
  const [proctorSocketStatus, setProctorSocketStatus] = useState(SOCKET_STATUS.IDLE)

  const socketClientRef = useRef(null)
  const dashboardRefreshTimerRef = useRef(null)
  const toastTimeoutsRef = useRef(new Map())
  const toastSequenceRef = useRef(0)
  const selectedSessionIdRef = useRef(null)
  const selectedSessionRef = useRef(null)
  const proctorPageRef = useRef(0)
  const showProctorDetailModalRef = useRef(false)
  const fetchProctorDashboardRef = useRef(null)
  const fetchProctorHistoryRef = useRef(null)
  const setErrorRef = useRef(null)

  const clearProctorAlerts = () => {
    setProctorAlerts([])
  }

  const dismissProctorToast = useMemo(
    () => (toastId) => {
      const timeoutId = toastTimeoutsRef.current.get(toastId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        toastTimeoutsRef.current.delete(toastId)
      }

      setProctorToasts((prev) => prev.filter((toast) => toast.id !== toastId))
    },
    [],
  )

  const pushProctorToast = useMemo(
    () => (alert) => {
      const toastId = `${Date.now()}-${toastSequenceRef.current += 1}`
      const toast = {
        id: toastId,
        sessionId: alert?.sessionId ?? null,
        userId: alert?.userId ?? null,
        roomId: alert?.roomId ?? null,
        severity: String(alert?.severity || 'LOW').toUpperCase(),
        message: alert?.message || 'Cảnh báo mới từ hệ thống giám sát.',
        timestamp: alert?.timestamp ?? Date.now(),
      }

      setProctorToasts((prev) => [toast, ...prev].slice(0, 4))

      const timeoutId = window.setTimeout(() => {
        dismissProctorToast(toastId)
      }, 5000)

      toastTimeoutsRef.current.set(toastId, timeoutId)
    },
    [dismissProctorToast],
  )

  const proctorRoomFilterOptions = useMemo(() => {
    const usedRoomIds = new Set()

    return exams
      .flatMap((exam) =>
        (Array.isArray(exam.rooms) ? exam.rooms : []).map((room) => {
          const roomId = Number(room?.id ?? room?.roomId)
          if (!Number.isInteger(roomId) || roomId <= 0 || usedRoomIds.has(roomId)) {
            return null
          }

          usedRoomIds.add(roomId)
          const roomCode = room?.roomCode
          const examTitle = exam?.title || 'Untitled exam'

          return {
            value: String(roomId),
            label: roomCode
              ? `${roomCode} (ID: ${roomId}) - ${examTitle}`
              : `Room ${roomId} - ${examTitle}`,
          }
        }),
      )
      .filter(Boolean)
  }, [exams])

  const getSessionRecordId = (item) => item?.id ?? item?.sessionId ?? item?.examSessionId ?? null

  const selectedProctorSessionId = useMemo(
    () => getSessionRecordId(selectedProctorSession),
    [selectedProctorSession],
  )

  useEffect(() => {
    selectedSessionIdRef.current = selectedProctorSessionId
    selectedSessionRef.current = selectedProctorSession
  }, [selectedProctorSessionId, selectedProctorSession])

  useEffect(() => {
    proctorPageRef.current = proctorPagination.currentPage
  }, [proctorPagination.currentPage])

  useEffect(() => {
    showProctorDetailModalRef.current = showProctorDetailModal
  }, [showProctorDetailModal])

  const fetchProctorDashboard = async (overrideRoomId, pageNum = 0) => {
    const roomId = Number(overrideRoomId ?? proctorFilter.roomId)
    if (!Number.isInteger(roomId) || roomId <= 0) {
      setProctorDashboard([])
      setProctorPagination({ totalElements: 0, totalPages: 0, currentPage: 0, size: 20 })
      setSelectedProctorSession(null)
      setProctorHistory([])
      return
    }

    try {
      setLoadingProctorDashboard(true)
      const params = {
        roomId,
        page: pageNum,
        size: proctorFilter.size || 20,
        ...(proctorFilter.status !== '' ? { status: proctorFilter.status } : {}),
        ...(proctorFilter.flagged !== '' ? { flagged: proctorFilter.flagged === 'true' } : {}),
        ...(String(proctorFilter.keyword || '').trim() ? { keyword: String(proctorFilter.keyword).trim() } : {}),
      }

      const response = await getExamSessionDashboard(params)
      const rows = response?.content && Array.isArray(response.content) ? response.content : []
      setProctorDashboard(rows)
      setProctorPagination({
        totalElements: response?.totalElements ?? 0,
        totalPages: response?.totalPages ?? 0,
        currentPage: response?.number ?? 0,
        size: response?.size ?? 20,
      })

      if (!selectedProctorSessionId && rows.length > 0) {
        setSelectedProctorSession(rows[0])
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dashboard proctor.')
    } finally {
      setLoadingProctorDashboard(false)
    }
  }

  const fetchProctorHistory = async (session) => {
    const sessionId = getSessionRecordId(session)
    if (!sessionId) {
      setSelectedProctorSession(session ?? null)
      setProctorHistory([])
      setShowProctorDetailModal(true)
      return
    }

    try {
      setSelectedProctorSession(session)
      setShowProctorDetailModal(true)
      setLoadingProctorHistory(true)
      const history = await getExamSessionVerificationHistory(sessionId)
      setProctorHistory(Array.isArray(history) ? history : history ? [history] : [])
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử xác minh của phiên thi.')
      setProctorHistory([])
    } finally {
      setLoadingProctorHistory(false)
    }
  }

  const refreshProctorDashboard = async () => {
    await fetchProctorDashboard()
  }

  const openProctorRoomModal = () => {
    if (!loading && exams.length === 0) {
      fetchExams()
    }

    setProctorExamDraft('')
    setProctorRoomDraft('')
    setProctorRoomOptions([])
    setShowProctorRoomModal(true)
  }

  const closeProctorRoomModal = () => {
    setShowProctorRoomModal(false)
    if (!proctorFilter.roomId && activeSection === hubSections.PROCTOR) {
      setActiveSection(hubSections.OVERVIEW)
    }
  }

  const applyProctorRoomSelection = async () => {
    const examId = Number(proctorExamDraft)
    const roomId = Number(proctorRoomDraft)
    if (!Number.isInteger(examId) || examId <= 0) {
      setError('Vui lòng chọn kỳ thi trước khi chọn phòng giám sát.')
      return
    }

    if (!Number.isInteger(roomId) || roomId <= 0) {
      setError('Vui lòng chọn roomId hợp lệ trước khi vào giám sát proctor.')
      return
    }

    setError('')
    setProctorFilter((prev) => ({ ...prev, roomId: String(roomId) }))
    setSelectedProctorSession(null)
    setProctorHistory([])
    setShowProctorRoomModal(false)
    setActiveSection(hubSections.PROCTOR)
    await fetchProctorDashboard(roomId)
  }

  const handleProctorExamDraftChange = async (value) => {
    setProctorExamDraft(value)
    setProctorRoomDraft('')

    const examId = Number(value)
    if (!Number.isInteger(examId) || examId <= 0) {
      setProctorRoomOptions([])
      return
    }

    try {
      setLoadingProctorRooms(true)
      const paginatedData = await getRoomsByExamPaginated(examId, 0, 100)
      const rooms = paginatedData?.content || []
      const options = (Array.isArray(rooms) ? rooms : [])
        .map((room) => {
          const roomId = Number(room?.id ?? room?.roomId)
          if (!Number.isInteger(roomId) || roomId <= 0) return null
          return {
            id: roomId,
            label: `#${roomId}${room?.roomCode ? ` - ${room.roomCode}` : ''}`,
          }
        })
        .filter(Boolean)

      setProctorRoomOptions(options)
    } catch (err) {
      setError(err.message || 'Không thể tải phòng thi theo kỳ thi đã chọn.')
      setProctorRoomOptions([])
    } finally {
      setLoadingProctorRooms(false)
    }
  }

  const runProctorAction = async (action) => {
    const sessionId = getSessionRecordId(selectedProctorSession)
    if (!sessionId) {
      setError('Vui lòng chọn một phiên thi để thao tác.')
      return
    }

    const reason = String(proctorReason || '').trim()
    if ((action === 'flag' || action === 'reject') && !reason) {
      setError('Vui lòng nhập lý do trước khi flag hoặc reject.')
      return
    }

    try {
      setProctorActionLoading(true)
      setError('')
      setSuccess('')

      if (action === 'approve') {
        await approveExamSession(sessionId)
      } else if (action === 'reject') {
        await rejectExamSession(sessionId, reason)
      } else if (action === 'flag') {
        await flagExamSession(sessionId, reason)
      }

      setSuccess(
        action === 'approve'
          ? `Đã duyệt phiên thi #${sessionId}.`
          : action === 'reject'
            ? `Đã từ chối phiên thi #${sessionId}.`
            : `Đã gắn cờ phiên thi #${sessionId}.`,
      )
      setProctorReason('')
      await fetchProctorDashboard()
      await fetchProctorHistory(selectedProctorSession)
    } catch (err) {
      setError(err.message || 'Không thể thực hiện thao tác proctor.')
    } finally {
      setProctorActionLoading(false)
    }
  }

  useEffect(() => {
    fetchProctorDashboardRef.current = fetchProctorDashboard
  }, [fetchProctorDashboard])

  useEffect(() => {
    fetchProctorHistoryRef.current = fetchProctorHistory
  }, [fetchProctorHistory])

  useEffect(() => {
    setErrorRef.current = setError
  }, [setError])

  useEffect(() => {
    if (activeSection === hubSections.PROCTOR && !proctorFilter.roomId && !showProctorRoomModal) {
      openProctorRoomModal()
    }
  }, [activeSection, proctorFilter.roomId, showProctorRoomModal, hubSections.PROCTOR])

  useEffect(() => {
    if (activeSection === hubSections.PROCTOR && exams.length === 0 && !loading) {
      fetchExams()
    }
  }, [activeSection, exams.length, loading, hubSections.PROCTOR])

  useEffect(() => {
    const roomId = Number(proctorFilter.roomId)

    if (dashboardRefreshTimerRef.current) {
      clearTimeout(dashboardRefreshTimerRef.current)
      dashboardRefreshTimerRef.current = null
    }

    toastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    toastTimeoutsRef.current.clear()

    if (socketClientRef.current) {
      socketClientRef.current.deactivate()
      socketClientRef.current = null
    }

    if (activeSection !== hubSections.PROCTOR || !Number.isInteger(roomId) || roomId <= 0) {
      setProctorSocketStatus(SOCKET_STATUS.IDLE)
      setProctorAlerts([])
      setProctorToasts([])
      return undefined
    }

    const wsEndpoint = buildWsEndpoint(import.meta.env.VITE_API_BASE_URL)
    const roomTopic = `/topic/room/${roomId}`
    const token = localStorage.getItem('access_token')

    setProctorSocketStatus(SOCKET_STATUS.CONNECTING)
    setProctorAlerts([])
    setProctorToasts([])

    const client = new Client({
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      webSocketFactory: () => new SockJS(wsEndpoint),
      debug: () => {},
    })

    client.onConnect = () => {
      setProctorSocketStatus(SOCKET_STATUS.CONNECTED)

      client.subscribe(roomTopic, async (message) => {
        const incomingAlert = parseAlertPayload(message.body, roomId)

        setProctorAlerts((prev) => [incomingAlert, ...prev].slice(0, MAX_PROCTOR_ALERTS))
        pushProctorToast(incomingAlert)

        if (dashboardRefreshTimerRef.current) {
          return
        }

        dashboardRefreshTimerRef.current = setTimeout(async () => {
          dashboardRefreshTimerRef.current = null

          try {
            if (fetchProctorDashboardRef.current) {
              await fetchProctorDashboardRef.current(roomId, proctorPageRef.current)
            }

            if (
              showProctorDetailModalRef.current
              && selectedSessionIdRef.current
              && Number(selectedSessionIdRef.current) === Number(incomingAlert.sessionId)
              && selectedSessionRef.current
              && fetchProctorHistoryRef.current
            ) {
              await fetchProctorHistoryRef.current(selectedSessionRef.current)
            }
          } catch {
            // Refresh error is handled in existing fetch functions.
          }
        }, 700)
      })
    }

    client.onStompError = (frame) => {
      setProctorSocketStatus(SOCKET_STATUS.ERROR)
      const errorMessage = frame?.headers?.message || 'Không thể subscribe kênh cảnh báo realtime.'
      if (setErrorRef.current) {
        setErrorRef.current(errorMessage)
      }
    }

    client.onWebSocketError = () => {
      setProctorSocketStatus(SOCKET_STATUS.ERROR)
    }

    socketClientRef.current = client
    client.activate()

    return () => {
      if (dashboardRefreshTimerRef.current) {
        clearTimeout(dashboardRefreshTimerRef.current)
        dashboardRefreshTimerRef.current = null
      }

      toastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      toastTimeoutsRef.current.clear()

      setProctorSocketStatus(SOCKET_STATUS.IDLE)
      client.deactivate()
      socketClientRef.current = null
    }
  }, [
    activeSection,
    hubSections.PROCTOR,
    proctorFilter.roomId,
    pushProctorToast,
  ])

  return {
    proctorDashboard,
    loadingProctorDashboard,
    proctorFilter,
    setProctorFilter,
    proctorPagination,
    selectedProctorSession,
    setSelectedProctorSession,
    showProctorDetailModal,
    setShowProctorDetailModal,
    proctorHistory,
    setProctorHistory,
    loadingProctorHistory,
    proctorReason,
    setProctorReason,
    proctorActionLoading,
    showProctorRoomModal,
    proctorExamDraft,
    proctorRoomDraft,
    setProctorRoomDraft,
    proctorRoomOptions,
    loadingProctorRooms,
    proctorRoomFilterOptions,
    proctorAlerts,
    clearProctorAlerts,
    proctorToasts,
    dismissProctorToast,
    proctorSocketStatus,
    getSessionRecordId,
    selectedProctorSessionId,
    fetchProctorDashboard,
    fetchProctorHistory,
    refreshProctorDashboard,
    openProctorRoomModal,
    closeProctorRoomModal,
    applyProctorRoomSelection,
    handleProctorExamDraftChange,
    runProctorAction,
  }
}
