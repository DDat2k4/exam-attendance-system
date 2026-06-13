import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import {
  manualCheckin,
  manualApproveCheckin,
  manualRejectCheckin,
  approveExamSession,
  approveDeviceChange,
  rejectExamSession,
  flagExamSession,
  unflagExamSession,
  getExamSessionDashboard,
  getPendingAttendances,
  getAttendanceBySession,
  getExamSessionVerificationHistory,
} from '../api/examSessionApi'
import { getRoomsByExamAll, getExamRoomById } from '../api/examRoomApi'
import { getUserById } from '../api/userApi'
import { formatExamLabel } from '../utils/examLabel'

export const PROCTOR_STATUS_OPTIONS = [
  'INIT',
  'CHECKED_IN',
  'IN_PROGRESS',
  'DONE',
  'BLOCKED',
  'PENDING_REVIEW',
  'PENDING_DEVICE_APPROVAL',
]

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

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }

  return ''
}

const normalizePendingAttendanceItem = (item, fallbackRoomId = null) => {
  const sessionId = firstNonEmpty(
    item?.sessionId,
    item?.examSessionId,
    item?.examSession?.id,
    item?.session?.sessionId,
    item?.session?.id,
    item?.attendanceSessionId,
  )
  const attendanceId = firstNonEmpty(item?.attendanceId, item?.id, item?.attendance?.id)
  const roomId = firstNonEmpty(item?.roomId, item?.room?.id, item?.examSession?.roomId, item?.session?.roomId, fallbackRoomId)

  return {
    ...item,
    sessionId: sessionId ? Number(sessionId) : null,
    attendanceId: attendanceId ? Number(attendanceId) : null,
    roomId: roomId ? Number(roomId) : null,
    studentName: firstNonEmpty(item?.studentName, item?.fullName, item?.userFullName, item?.userName, item?.username),
    citizenId: firstNonEmpty(item?.citizenId, item?.userCitizenId, item?.identityNumber),
    roomCode: firstNonEmpty(item?.roomCode, item?.room?.roomCode, item?.room?.code),
    attendanceStatus: firstNonEmpty(item?.attendanceStatus, item?.status),
    examSessionStatus: firstNonEmpty(item?.examSessionStatus, item?.sessionStatus),
    reviewNote: item?.reviewNote ?? item?.reason ?? '',
    createdAt: item?.createdAt ?? item?.checkinTime ?? null,
    verifiedAt: item?.verifiedAt ?? null,
    verifiedByName: item?.verifiedByName ?? null,
    attendancePhoto: item?.attendancePhoto ?? null,
    cccdPhoto: item?.cccdPhoto ?? null,
  }
}

const formatSessionLabel = (session) => {
  const studentName = firstNonEmpty(
    session?.studentName,
    session?.userFullName,
    session?.userDisplayName,
    session?.userName,
    session?.fullName,
    session?.username,
  )
  const examTitle = firstNonEmpty(
    session?.examTitle,
    session?.examName,
    session?.title,
  )
  const roomCode = firstNonEmpty(
    session?.roomCode,
    session?.room?.roomCode,
    session?.room?.code,
    session?.roomId,
    session?.room?.id,
  )
  const citizenId = firstNonEmpty(session?.citizenId, session?.userCitizenId)

  const labelParts = []
  if (studentName) labelParts.push(studentName)
  if (examTitle) labelParts.push(examTitle)
  if (roomCode) labelParts.push(`Phòng ${roomCode}`)
  if (citizenId) labelParts.push(`CCCD ${citizenId}`)

  if (labelParts.length > 0) {
    return labelParts.join(' • ')
  }

  const sessionId = firstNonEmpty(session?.id, session?.sessionId, session?.examSessionId)
  return sessionId ? `Phiên ${sessionId}` : 'phiên thi'
}

export const formatProctorToastMeta = (toast) => {
  const roomName = firstNonEmpty(toast?.roomName, toast?.roomCode, toast?.roomTitle)
  const userName = firstNonEmpty(
    toast?.userName,
    toast?.userFullName,
    toast?.userDisplayName,
    toast?.userUsername,
  )
  const citizenId = firstNonEmpty(toast?.citizenId, toast?.userCitizenId)

  return {
    roomLabel: roomName || (toast?.roomId ? `Phòng ${toast.roomId}` : 'Phòng thi'),
    userLabel: userName || (toast?.userId ? `Người dùng ${toast.userId}` : 'Người dùng'),
    citizenLabel: citizenId ? `CCCD ${citizenId}` : '',
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
  const [proctorFilter, setProctorFilter] = useState(() => {
    const savedRoomId = sessionStorage.getItem('proctor_roomId')
    return { 
      roomId: savedRoomId || '', 
      status: '', 
      flagged: '', 
      keyword: '', 
      page: 0, 
      size: 20 
    }
  })
  const [proctorPagination, setProctorPagination] = useState({ totalElements: 0, totalPages: 0, currentPage: 0, size: 20 })
  const [selectedProctorSession, setSelectedProctorSession] = useState(null)
  const [showProctorDetailModal, setShowProctorDetailModal] = useState(false)
  const [proctorHistory, setProctorHistory] = useState([])
  const [loadingProctorHistory, setLoadingProctorHistory] = useState(false)
  const [proctorReason, setProctorReason] = useState('')
  const [proctorActionError, setProctorActionError] = useState('')
  const [proctorActionLoading, setProctorActionLoading] = useState(false)
  const [showProctorRoomModal, setShowProctorRoomModal] = useState(false)
  const [proctorExamDraft, setProctorExamDraft] = useState('')
  const [proctorRoomDraft, setProctorRoomDraft] = useState('')
  const [proctorRoomOptions, setProctorRoomOptions] = useState([])
  const [loadingProctorRooms, setLoadingProctorRooms] = useState(false)
  const [proctorRoomFilterExamId, setProctorRoomFilterExamId] = useState(() => sessionStorage.getItem('proctor_room_examId') || '')
  const [proctorRoomFilterOptions, setProctorRoomFilterOptions] = useState([])
  const [loadingProctorRoomFilterOptions, setLoadingProctorRoomFilterOptions] = useState(false)
  const [pendingAttendances, setPendingAttendances] = useState([])
  const [loadingPendingAttendances, setLoadingPendingAttendances] = useState(false)
  const [pendingAttendanceError, setPendingAttendanceError] = useState('')
  const [proctorAlerts, setProctorAlerts] = useState(() => {
    try {
      const raw = sessionStorage.getItem('proctor_alerts')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const persistSetProctorAlerts = (valueOrUpdater) => {
    setProctorAlerts((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
      try {
        sessionStorage.setItem('proctor_alerts', JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }
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
    persistSetProctorAlerts([])
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
        userName: null,
        citizenId: null,
        roomName: null,
        roomId: alert?.roomId ?? null,
        severity: String(alert?.severity || 'LOW').toUpperCase(),
        message: alert?.message || 'Cảnh báo mới từ hệ thống giám sát.',
        timestamp: alert?.timestamp ?? Date.now(),
      }

      setProctorToasts((prev) => [toast, ...prev].slice(0, 4))

      // Resolve userName asynchronously (with simple in-memory cache)
      try {
        // user name cache/fetch
        const userCache = pushProctorToast.userCache ||= new Map()
        const uidRaw = alert?.userId
        const uid = Number(uidRaw)
        if (Number.isInteger(uid) && uid > 0) {
          const cached = userCache.get(String(uid))
          if (cached) {
            if (typeof cached === 'string') {
              setProctorToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, userName: cached } : t)))
            } else {
              const name = cached.name || `User ${uid}`
              setProctorToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, userName: name, citizenId: cached.citizenId || null } : t)))
            }
          } else {
            getUserById(uid)
              .then((user) => {
                const resolved = user && (user.data || user)
                const name = (resolved && (resolved.fullName || resolved.name || resolved.username)) || `User ${uid}`
                const citizenId = resolved && (resolved.citizenId || resolved.userCitizenId || resolved.identityNumber || (resolved.profile && (resolved.profile.citizenId || resolved.profile.identityNumber)))
                userCache.set(String(uid), { name, citizenId })

                // update toast with name and separate citizenId
                setProctorToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, userName: name, citizenId: citizenId || null } : t)))
              })
              .catch(() => {})
          }
        }

        // room name cache/fetch
        const roomCache = pushProctorToast.roomCache ||= new Map()
        const ridRaw = alert?.roomId
        const rid = Number(ridRaw)
        if (Number.isInteger(rid) && rid > 0) {
          const cachedRoom = roomCache.get(String(rid))
          if (cachedRoom) {
            setProctorToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, roomName: cachedRoom } : t)))
          } else {
            getExamRoomById(rid)
              .then((room) => {
                const roomLabel = (room && (room.roomCode || room.name || room.title)) || `Room ${rid}`
                roomCache.set(String(rid), roomLabel)
                setProctorToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, roomName: roomLabel } : t)))
              })
              .catch(() => {})
          }
        }
      } catch {
        // ignore cache errors
      }

      const timeoutId = window.setTimeout(() => {
        dismissProctorToast(toastId)
      }, 5000)

      toastTimeoutsRef.current.set(toastId, timeoutId)
    },
    [dismissProctorToast],
  )

  const proctorRoomFilterExamOptions = useMemo(
    () =>
      exams
        .map((exam) => ({
          value: String(exam?.id || ''),
          label: formatExamLabel(exam),
        }))
        .filter((option) => option.value),
    [exams],
  )

  useEffect(() => {
    let isCancelled = false

    const loadRoomFilterOptions = async () => {
      const examId = Number(proctorRoomFilterExamId)
      if (!Number.isInteger(examId) || examId <= 0) {
        setProctorRoomFilterOptions([])
        setLoadingProctorRoomFilterOptions(false)
        return
      }

      try {
        setLoadingProctorRoomFilterOptions(true)
        const rooms = await getRoomsByExamAll(examId)
        if (isCancelled) return

        const options = (Array.isArray(rooms) ? rooms : [])
          .map((room) => {
            const roomId = Number(room?.id ?? room?.roomId)
            if (!Number.isInteger(roomId) || roomId <= 0) return null
            return {
              value: String(roomId),
              label: room?.roomCode ? room.roomCode : (room?.name || `Room ${roomId}`),
            }
          })
          .filter(Boolean)

        setProctorRoomFilterOptions(options)
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Không thể tải phòng theo kỳ thi đã chọn.')
          setProctorRoomFilterOptions([])
        }
      } finally {
        if (!isCancelled) {
          setLoadingProctorRoomFilterOptions(false)
        }
      }
    }

    const nextExamId = Number(proctorRoomFilterExamId)
    if (!Number.isInteger(nextExamId) || nextExamId <= 0) {
      setProctorRoomFilterOptions([])
      setLoadingProctorRoomFilterOptions(false)
      sessionStorage.removeItem('proctor_room_examId')
      return undefined
    }

    sessionStorage.setItem('proctor_room_examId', String(nextExamId))
    void loadRoomFilterOptions()

    return () => {
      isCancelled = true
    }
  }, [proctorRoomFilterExamId, setError])

  const selectedProctorExamLabel = useMemo(
    () => proctorRoomFilterExamOptions.find((option) => String(option.value) === String(proctorRoomFilterExamId))?.label || '-',
    [proctorRoomFilterExamId, proctorRoomFilterExamOptions],
  )

  const selectedProctorRoomLabel = useMemo(
    () => proctorRoomFilterOptions.find((option) => String(option.value) === String(proctorFilter.roomId))?.label || '-',
    [proctorFilter.roomId, proctorRoomFilterOptions],
  )

  const getSessionRecordId = (item) => item?.sessionId ?? item?.examSessionId ?? item?.session?.sessionId ?? item?.id ?? null

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

  const fetchPendingAttendances = useCallback(async () => {
    const roomId = Number(proctorFilter.roomId)
    if (!Number.isInteger(roomId) || roomId <= 0) {
      setPendingAttendances([])
      setPendingAttendanceError('')
      setLoadingPendingAttendances(false)
      return
    }

    try {
      setLoadingPendingAttendances(true)
      setPendingAttendanceError('')
      const response = await getPendingAttendances(roomId)
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.rows)
            ? response.rows
            : Array.isArray(response?.items)
              ? response.items
              : response
                ? [response]
                : []

      const normalized = rows.map((item) => normalizePendingAttendanceItem(item, roomId))

      setPendingAttendances(normalized)
    } catch (err) {
      setPendingAttendances([])
      setPendingAttendanceError(err.message || 'Không thể tải hàng đợi điểm danh chờ duyệt.')
    } finally {
      setLoadingPendingAttendances(false)
    }
  }, [proctorFilter.roomId])

  const fetchProctorHistory = async (session) => {
    const sessionId = getSessionRecordId(session)
    if (!sessionId) {
      setSelectedProctorSession(session ?? null)
      setProctorHistory([])
      setShowProctorDetailModal(true)
      return
    }

    try {
      setSelectedProctorSession(session ?? null)
      setShowProctorDetailModal(true)
      setLoadingProctorHistory(true)

      let attendance = null
      try {
        attendance = await getAttendanceBySession(sessionId)
      } catch {
        // Attendance endpoint may be unavailable in some deployments; keep detail modal functional.
      }

      setSelectedProctorSession({
        ...(session || {}),
        attendance: attendance && typeof attendance === 'object' ? attendance : null,
        attendanceId: attendance?.id ?? attendance?.attendanceId ?? session?.attendanceId ?? null,
      })
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

  const handleProctorRoomFilterExamChange = (value) => {
    setProctorRoomFilterExamId(value)
    setProctorFilter((prev) => ({ ...prev, roomId: '' }))
    setSelectedProctorSession(null)
    setProctorHistory([])
    setProctorRoomFilterOptions([])
    setProctorReason('')
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
      setError('Vui lòng tìm kỳ thi trước khi chọn phòng giám sát.')
      return
    }

    if (!Number.isInteger(roomId) || roomId <= 0) {
      setError('Vui lòng chọn roomId hợp lệ trước khi vào giám sát proctor.')
      return
    }

    setError('')
    setProctorFilter((prev) => ({ ...prev, roomId: String(roomId) }))
    setProctorRoomFilterExamId(String(examId))
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
      const rooms = await getRoomsByExamAll(examId)
      const options = (Array.isArray(rooms) ? rooms : [])
        .map((room) => {
            const roomId = Number(room?.id ?? room?.roomId)
            if (!Number.isInteger(roomId) || roomId <= 0) return null
            return {
              id: roomId,
              label: room?.roomCode ? room.roomCode : (room?.name || `Room ${roomId}`),
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

  const runProctorAction = async (action, payload = {}) => {
    const attendanceAction = action === 'approve-attendance' || action === 'reject-attendance'
    const payloadSessionId = payload?.sessionId ?? null
    const sessionId = payloadSessionId ?? getSessionRecordId(selectedProctorSession)

    let attendanceId =
      payload?.attendanceId
      ?? selectedProctorSession?.attendanceId
      ?? selectedProctorSession?.attendance?.id
      ?? selectedProctorSession?.attendance?.attendanceId
      ?? null

    if (!sessionId && !(attendanceAction && attendanceId)) {
      setError('Vui lòng chọn một phiên thi để thao tác.')
      return
    }

    const sessionLabel = formatSessionLabel(selectedProctorSession)

    const reason = String(payload?.reason ?? proctorReason ?? '').trim()
    if ((action === 'flag' || action === 'reject' || action === 'reject-attendance' || action === 'manual-checkin') && !reason) {
      setProctorActionError('Vui lòng nhập lý do trước khi gắn cờ hoặc từ chối.')
      return
    }

    const attendanceStatus = String(selectedProctorSession?.attendanceStatus || '').toUpperCase()
    const examStatus = String(selectedProctorSession?.examSessionStatus || '').toUpperCase()
    const isAttendancePending = attendanceStatus === 'PENDING_REVIEW'
    const requiresAttendanceLookup = action === 'approve-attendance' || action === 'reject-attendance' || (action === 'reject' && isAttendancePending)

    if (requiresAttendanceLookup && !attendanceId) {
      if (!sessionId) {
        setError('Không xác định được sessionId hoặc attendanceId cho thao tác điểm danh.')
        return
      }
      try {
        const attendance = await getAttendanceBySession(sessionId)
        attendanceId = attendance?.id ?? attendance?.attendanceId ?? null
      } catch (err) {
        setError(err.message || 'Không thể lấy attendanceId cho thao tác điểm danh.')
        return
      }
    }

    try {
      setProctorActionLoading(true)
      setError('')
      setSuccess('')
      setProctorActionError('')

      if (action === 'manual-checkin') {
        if (!payload?.base64Image) {
          setError('Vui lòng chọn ảnh xác minh trước khi tạo điểm danh thủ công.')
          return
        }

        await manualCheckin(sessionId, payload.base64Image, reason)
      } else if (action === 'approve-attendance') {
        await manualApproveCheckin(attendanceId, payload?.base64Image)
      } else if (action === 'reject-attendance') {
        await manualRejectCheckin(attendanceId, reason)
      } else if (action === 'approve') {
        await approveExamSession(sessionId)
      } else if (action === 'approve-device') {
        await approveDeviceChange(sessionId)
      } else if (action === 'reject') {
        if (isAttendancePending) {
          await manualRejectCheckin(attendanceId, reason)
        } else {
          await rejectExamSession(sessionId, reason)
        }
      } else if (action === 'flag') {
        await flagExamSession(sessionId, reason)
      } else if (action === 'unflag') {
        await unflagExamSession(sessionId)
      }

      setSuccess(
        action === 'manual-checkin'
          ? `Đã điểm danh thủ công cho ${sessionLabel}`
          : action === 'approve-attendance'
          ? `Đã duyệt điểm danh cho ${sessionLabel}.`
          : action === 'reject-attendance'
          ? `Đã từ chối điểm danh cho ${sessionLabel}.`
          : action === 'approve'
          ? `Đã duyệt ${sessionLabel}.`
          : action === 'approve-device'
            ? `Đã duyệt thiết bị cho ${sessionLabel}.`
          : action === 'reject'
            ? `Đã từ chối ${sessionLabel}.`
            : action === 'flag'
              ? `Đã gắn cờ ${sessionLabel}.`
              : `Đã bỏ cờ ${sessionLabel}.`,
      )
      setProctorReason('')
      setProctorActionError('')
      await fetchProctorDashboard()
      await fetchPendingAttendances()
      setShowProctorDetailModal(false)
      setSelectedProctorSession(null)
      setProctorHistory([])
    } catch (err) {
      setError(err.message || `Không thể thực hiện thao tác proctor cho ${sessionLabel}.`)
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

  // Persist roomId to sessionStorage
  useEffect(() => {
    if (proctorFilter.roomId) {
      sessionStorage.setItem('proctor_roomId', proctorFilter.roomId)
    }
  }, [proctorFilter.roomId])

  useEffect(() => {
    if (activeSection === hubSections.PROCTOR && !proctorFilter.roomId && !showProctorRoomModal) {
      openProctorRoomModal()
    }
  }, [activeSection, proctorFilter.roomId, showProctorRoomModal])

  useEffect(() => {
    if (activeSection === hubSections.PROCTOR && exams.length === 0 && !loading) {
      fetchExams()
    }
  }, [activeSection, exams.length, loading])

  useEffect(() => {
    const roomId = Number(proctorFilter.roomId)

    if (activeSection !== hubSections.PROCTOR || !Number.isInteger(roomId) || roomId <= 0) {
      setPendingAttendances([])
      setPendingAttendanceError('')
      setLoadingPendingAttendances(false)
      return undefined
    }

    void fetchPendingAttendances()
    return undefined
  }, [activeSection, hubSections.PROCTOR, fetchPendingAttendances, proctorFilter.roomId])

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
      persistSetProctorAlerts([])
      setProctorToasts([])
      return undefined
    }

    const wsEndpoint = buildWsEndpoint(import.meta.env.VITE_API_BASE_URL)
    const roomTopic = `/topic/room/${roomId}`
    const token = localStorage.getItem('access_token')

    setProctorSocketStatus(SOCKET_STATUS.CONNECTING)
    persistSetProctorAlerts([])
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

        persistSetProctorAlerts((prev) => [incomingAlert, ...prev].slice(0, MAX_PROCTOR_ALERTS))
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
    proctorActionError,
    setProctorActionError,
    proctorActionLoading,
    showProctorRoomModal,
    proctorExamDraft,
    proctorRoomDraft,
    setProctorRoomDraft,
    proctorRoomOptions,
    loadingProctorRooms,
    proctorRoomFilterExamOptions,
    proctorRoomFilterExamId,
    handleProctorRoomFilterExamChange,
    proctorRoomFilterOptions,
    loadingProctorRoomFilterOptions,
    pendingAttendances,
    loadingPendingAttendances,
    pendingAttendanceError,
    fetchPendingAttendances,
    selectedProctorExamLabel,
    selectedProctorRoomLabel,
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
