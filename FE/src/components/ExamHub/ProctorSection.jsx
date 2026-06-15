import { useEffect, useMemo, useState, useRef } from 'react'
import VerificationHistory from '../ui/VerificationHistory'
import { useExcelExport } from '../../hooks/useExcelExport'
import {
  CheckIcon,
  CloseIcon,
  DeviceIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FlagIcon,
  LayoutGridIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
} from '../ui/AppIcons'

import { getAttendanceById, getAttendanceSession } from '../../api/examSessionApi'
import { getSessionStatusLabel, statusToBadgeClass } from '../../utils/examSessionStatus'
import { captureFrame, isCameraSupported, requestCameraAccess, stopCameraStream } from '../../utils/faceCapture'

const ALERT_TYPE_LABELS = {
  VERIFY_FAIL: 'Xác minh thất bại',
  VERIFY_SUCCESS: 'Xác minh thành công',
  SESSION_BLOCKED: 'Khóa phiên thi',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  FLAGGED: 'Đã gắn cờ',
  UNFLAGGED: 'Đã bỏ cờ',
  DEVICE_CHANGED: 'Đổi thiết bị',
  MULTIPLE_VERIFY_FAILED: 'Nhiều lần thất bại',
  MANUAL_REVIEW_REQUIRED: 'Cần duyệt thủ công',
  SUSPICIOUS_ACTIVITY: 'Hành vi đáng ngờ',
}

const formatLabel = (value, mapping) => mapping[String(value || '').toUpperCase()] || value || ''

const findAlertSessionMatch = (alert, proctorDashboard, getSessionRecordId) => {
  const alertSessionId = Number(alert?.sessionId)
  const alertUserId = Number(alert?.userId)
  const alertRoomId = Number(alert?.roomId)

  if (Number.isInteger(alertSessionId)) {
    const bySessionId = proctorDashboard.find((item) => Number(getSessionRecordId(item)) === alertSessionId)
    if (bySessionId) return bySessionId
  }

  if (Number.isInteger(alertUserId)) {
    const byUserId = proctorDashboard.find((item) => Number(item?.userId) === alertUserId)
    if (byUserId) return byUserId
  }

  if (Number.isInteger(alertRoomId)) {
    const byRoomId = proctorDashboard.find((item) => Number(item?.roomId ?? item?.room?.id) === alertRoomId)
    if (byRoomId) return byRoomId
  }

  return null
}

const getAlertSubjectLabel = (alert, matchedSession) => {
  const studentName = matchedSession?.studentName || alert?.studentName || alert?.fullName || alert?.userName || alert?.username
  const citizenId = matchedSession?.citizenId || alert?.citizenId
  const roomCode = matchedSession?.roomCode || alert?.roomCode

  if (studentName) {
    return `${studentName}${citizenId ? ` • CCCD ${citizenId}` : ''}${roomCode ? ` • Phòng ${roomCode}` : ''}`
  }

  const sessionLabel = alert?.sessionId ? `Phiên ${alert.sessionId}` : 'Phiên xác minh'
  return `${sessionLabel}${alert?.userId ? ` • Người dùng ${alert.userId}` : ''}${roomCode ? ` • Phòng ${roomCode}` : alert?.roomId ? ` • Phòng ${alert.roomId}` : ''}`
}

export default function ProctorSection({
  openProctorRoomModal,
  loadingProctorDashboard,
  proctorActionLoading,
  refreshProctorDashboard,
  proctorFilter,
  setProctorFilter,
  proctorStatusOptions,
  fetchProctorDashboard,
  setSelectedProctorSession,
  setProctorHistory,
  setProctorReason,
  proctorDashboard,
  getSessionRecordId,
  selectedProctorSessionId,
  fetchProctorHistory,
  proctorPagination,
  showProctorDetailModal,
  setShowProctorDetailModal,
  selectedProctorSession,
  formatDateTime,
  loadingProctorHistory,
  proctorHistory,
  runProctorAction,
  proctorReason,
  proctorActionError,
  setProctorActionError,
  proctorAlerts,
  clearProctorAlerts,
  proctorSocketStatus,
  selectedProctorExamLabel,
  selectedProctorRoomLabel,
  pendingAttendances,
  loadingPendingAttendances,
  pendingAttendanceError,
  fetchPendingAttendances,
}) {
  const { loading: exporting, error: exportError, exportReport } = useExcelExport()
  const [showExportError, setShowExportError] = useState(false)
  const [exportErrorMessage, setExportErrorMessage] = useState('')
  const [captureImageBroken, setCaptureImageBroken] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [showAttendancePopup, setShowAttendancePopup] = useState(false)
  const [attendancePopupLoading, setAttendancePopupLoading] = useState(false)
  const [attendancePopupData, setAttendancePopupData] = useState(null)
  const [attendancePopupError, setAttendancePopupError] = useState('')
  const [attendanceApproveImage, setAttendanceApproveImage] = useState('')
  const [attendanceApproveImageName, setAttendanceApproveImageName] = useState('')
  const [attendancePopupSession, setAttendancePopupSession] = useState(null)
  const [attendanceCameraOpen, setAttendanceCameraOpen] = useState(false)
  const [attendanceCameraLoading, setAttendanceCameraLoading] = useState(false)
  const [attendanceCameraError, setAttendanceCameraError] = useState('')
  const [attendanceCameraStream, setAttendanceCameraStream] = useState(null)
  const [localProctorActionError, setLocalProctorActionError] = useState('')
  const [filterCollapsed, setFilterCollapsed] = useState(false)
  const [showRealtimeAlertsPanel, setShowRealtimeAlertsPanel] = useState(false)
  const [showPendingAttendancesPopup, setShowPendingAttendancesPopup] = useState(false)
  const [showFilterToggle, setShowFilterToggle] = useState(true)
  const filterFormRef = useRef(null)
  const lastToggleAtRef = useRef(0)
  const attendanceCameraVideoRef = useRef(null)
  const attendanceUploadInputRef = useRef(null)
  const attendanceDetails = attendancePopupData?.data ?? attendancePopupData ?? null
  const attendanceDetailRecord = Array.isArray(attendanceDetails) ? attendanceDetails[0] ?? null : attendanceDetails
  const hasAttendanceRecord = Boolean(attendanceDetailRecord?.id || attendanceDetailRecord?.attendanceId)
  const proctorActionErrorMessage = proctorActionError || localProctorActionError
  const safeSetProctorActionError = typeof setProctorActionError === 'function'
    ? setProctorActionError
    : setLocalProctorActionError

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })

  const normalizeAttendanceImage = async (imageValue) => {
    const imageUrl = String(imageValue || '')
    if (!imageUrl) {
      return ''
    }

    if (imageUrl.startsWith('data:')) {
      return imageUrl
    }

    const isHttpUrl = /^https?:\/\//i.test(imageUrl)
    const isBlobUrl = imageUrl.startsWith('blob:')
    if (isHttpUrl || isBlobUrl) {
      try {
        const response = await fetch(imageUrl, { method: 'GET', credentials: 'same-origin' })
        const blob = await response.blob()
        return await readFileAsDataUrl(blob)
      } catch {
        throw new Error('Không thể tải ảnh từ URL để gửi lên server. Kiểm tra CORS hoặc thử chụp ảnh mới.')
      }
    }

    return imageUrl
  }
  // Auto un-collapse when viewport is wide enough
  useEffect(() => {
    let raf = null
    const checkFits = () => {
      try {
        const el = filterFormRef.current
        if (!el) return
        // if content scrollWidth fits into clientWidth, we don't need the toggle
        const fits = el.scrollWidth <= el.clientWidth + 8
        // if user just toggled, give a small grace period to avoid immediately hiding the toggle
        const recentlyToggled = Date.now() - (lastToggleAtRef.current || 0) < 400
        if (recentlyToggled) {
          // keep the toggle visible right after a manual toggle
          setShowFilterToggle(true)
          return
        }

        setShowFilterToggle(!fits)
        if (fits && filterCollapsed) setFilterCollapsed(false)
      } catch {}
    }

    const handleResize = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(checkFits)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
    }
  }, [filterCollapsed])
  const hasProctorReason = String(proctorReason || '').trim().length > 0

  const enrichedProctorAlerts = useMemo(
    () =>
      proctorAlerts.map((alert) => {
        const matchedSession = findAlertSessionMatch(alert, proctorDashboard, getSessionRecordId)

        return {
          ...alert,
          titleLabel: formatLabel(alert.type, ALERT_TYPE_LABELS),
          subjectLabel: getAlertSubjectLabel(alert, matchedSession),
        }
      }),
    [getSessionRecordId, proctorAlerts, proctorDashboard],
  )

  useEffect(() => {
    setCaptureImageBroken(false)
    setImagePreviewOpen(false)
    setShowAttendancePopup(false)
    setAttendancePopupLoading(false)
    setAttendancePopupData(null)
    setAttendancePopupError('')
    setAttendanceApproveImage('')
    setAttendanceApproveImageName('')
    setAttendancePopupSession(null)
    setAttendanceCameraOpen(false)
    setAttendanceCameraLoading(false)
    setAttendanceCameraError('')
    if (attendanceCameraStream) {
      stopCameraStream(attendanceCameraStream)
      setAttendanceCameraStream(null)
    }
  }, [selectedProctorSessionId])

  useEffect(() => {
    if (!showAttendancePopup) {
      setAttendanceCameraOpen(false)
      setAttendanceCameraLoading(false)
      setAttendanceCameraError('')
      if (attendanceCameraStream) {
        stopCameraStream(attendanceCameraStream)
        setAttendanceCameraStream(null)
      }
      if (attendanceCameraVideoRef.current) {
        attendanceCameraVideoRef.current.srcObject = null
      }
    }
  }, [showAttendancePopup, attendanceCameraStream])

  const handleOpenAttendancePopup = async (session = selectedProctorSession) => {
    if (!session) return

    safeSetProctorActionError('')
    setAttendancePopupSession(session)

    const sessionId = session?.sessionId ?? session?.examSessionId ?? session?.session?.sessionId ?? session?.session?.id ?? getSessionRecordId(session)
    const attendanceId = session?.attendanceId ?? session?.id ?? session?.attendance?.id ?? null

    try {
      setAttendancePopupLoading(true)
      setAttendancePopupError('')
      setAttendancePopupData(null)
      setAttendanceApproveImage('')
      setAttendanceApproveImageName('')
      setShowAttendancePopup(true)

      let attendanceData = null
      if (sessionId) {
        try {
          const attendance = await getAttendanceSession(sessionId)
          attendanceData = attendance?.data ?? attendance ?? null
        } catch (err) {
          if (attendanceId) {
            try {
              const attendance = await getAttendanceById(attendanceId)
              attendanceData = attendance?.data ?? attendance ?? null
            } catch {
              setAttendancePopupError(err.message || 'Không tải được dữ liệu điểm danh hiện tại. Bạn có thể tạo điểm danh thủ công.')
            }
          } else {
            setAttendancePopupError(err.message || 'Không tải được dữ liệu điểm danh hiện tại. Bạn có thể tạo điểm danh thủ công.')
          }
        }
      } else if (attendanceId) {
        try {
          const attendance = await getAttendanceById(attendanceId)
          attendanceData = attendance?.data ?? attendance ?? null
        } catch (err) {
          setAttendancePopupError(err.message || 'Không tải được dữ liệu điểm danh hiện tại. Bạn có thể tạo điểm danh thủ công.')
        }
      } else {
        setAttendancePopupError('Không xác định được sessionId hoặc attendanceId để tải điểm danh.')
      }

      const attendanceRecord = Array.isArray(attendanceData) ? attendanceData[0] ?? null : attendanceData

      setAttendancePopupData(attendanceRecord)
      if (attendanceRecord?.attendancePhoto) {
        setAttendanceApproveImage(attendanceRecord.attendancePhoto)
        setAttendanceApproveImageName('Ảnh điểm danh fail')
      } else if (attendanceRecord?.cccdPhoto) {
        setAttendanceApproveImage(attendanceRecord.cccdPhoto)
        setAttendanceApproveImageName('Ảnh CCCD')
      }
    } finally {
      setAttendancePopupLoading(false)
    }
  }

  const handleOpenPendingAttendancePopup = async (attendanceItem) => {
    if (!attendanceItem) return

    safeSetProctorActionError('')
    setAttendancePopupSession(attendanceItem)

    const attendanceId = attendanceItem?.attendanceId ?? attendanceItem?.id ?? attendanceItem?.attendance?.id ?? null

    try {
      setAttendancePopupLoading(true)
      setAttendancePopupError('')
      setAttendancePopupData(null)
      setAttendanceApproveImage('')
      setAttendanceApproveImageName('')
      setShowAttendancePopup(true)

      if (!attendanceId) {
        setAttendancePopupError('Không xác định được attendanceId để tải điểm danh.')
        return
      }

      const attendance = await getAttendanceById(attendanceId)
      const attendanceData = attendance?.data ?? attendance ?? null
      const attendanceRecord = Array.isArray(attendanceData) ? attendanceData[0] ?? null : attendanceData

      setAttendancePopupData(attendanceRecord)
      if (attendanceRecord?.attendancePhoto) {
        setAttendanceApproveImage(attendanceRecord.attendancePhoto)
        setAttendanceApproveImageName('Ảnh điểm danh fail')
      } else if (attendanceRecord?.cccdPhoto) {
        setAttendanceApproveImage(attendanceRecord.cccdPhoto)
        setAttendanceApproveImageName('Ảnh CCCD')
      }
    } catch (err) {
      setAttendancePopupError(err.message || 'Không tải được dữ liệu điểm danh hiện tại. Bạn có thể tạo điểm danh thủ công.')
    } finally {
      setAttendancePopupLoading(false)
    }
  }

  const handleUseAttendanceImage = (kind) => {
    const imageUrl = kind === 'cccd' ? attendanceDetailRecord?.cccdPhoto : attendanceDetailRecord?.attendancePhoto
    const imageLabel = kind === 'cccd' ? 'Ảnh CCCD' : 'Ảnh điểm danh fail'

    if (!imageUrl) {
      setAttendancePopupError(kind === 'cccd'
        ? 'Phiên này chưa có ảnh CCCD để dùng lại.'
        : 'Phiên này chưa có ảnh điểm danh fail để dùng lại.')
      return
    }

    setAttendanceApproveImage(imageUrl)
    setAttendanceApproveImageName(imageLabel)
    setAttendancePopupError('')
  }

  const handleUploadAttendanceImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setAttendancePopupError('Vui lòng chọn một file ảnh hợp lệ.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setAttendanceApproveImage(dataUrl)
      setAttendanceApproveImageName(file.name || 'Ảnh tải lên')
      setAttendancePopupError('')
    } catch (err) {
      setAttendancePopupError(err.message || 'Không thể tải ảnh lên.')
    }
  }

  const handleOpenAttendanceCamera = async () => {
    if (!isCameraSupported()) {
      setAttendanceCameraError('Trình duyệt này không hỗ trợ camera.')
      return
    }

    try {
      setAttendanceCameraLoading(true)
      setAttendanceCameraError('')
      if (attendanceCameraStream) {
        stopCameraStream(attendanceCameraStream)
        setAttendanceCameraStream(null)
      }

      const stream = await requestCameraAccess()
      setAttendanceCameraStream(stream)
      setAttendanceCameraOpen(true)

      window.requestAnimationFrame(() => {
        if (attendanceCameraVideoRef.current) {
          attendanceCameraVideoRef.current.srcObject = stream
          attendanceCameraVideoRef.current.play?.().catch(() => {})
        }
      })
    } catch (err) {
      setAttendanceCameraError(err.message || 'Không thể mở camera.')
      setAttendanceCameraOpen(false)
    } finally {
      setAttendanceCameraLoading(false)
    }
  }

  const handleCaptureAttendanceCamera = () => {
    if (!attendanceCameraVideoRef.current) {
      setAttendanceCameraError('Camera chưa sẵn sàng.')
      return
    }

    try {
      const captureImage = captureFrame(attendanceCameraVideoRef.current)
      setAttendanceApproveImage(captureImage)
      setAttendanceApproveImageName('Ảnh chụp từ camera')
      setAttendancePopupError('')
      setAttendanceCameraOpen(false)
      if (attendanceCameraStream) {
        stopCameraStream(attendanceCameraStream)
        setAttendanceCameraStream(null)
      }
      if (attendanceCameraVideoRef.current) {
        attendanceCameraVideoRef.current.srcObject = null
      }
    } catch (err) {
      setAttendanceCameraError(err.message || 'Không thể chụp ảnh từ camera.')
    }
  }

  const handleCloseAttendanceCamera = () => {
    setAttendanceCameraOpen(false)
    setAttendanceCameraLoading(false)
    setAttendanceCameraError('')
    if (attendanceCameraStream) {
      stopCameraStream(attendanceCameraStream)
      setAttendanceCameraStream(null)
    }
    if (attendanceCameraVideoRef.current) {
      attendanceCameraVideoRef.current.srcObject = null
    }
  }

  const handleApproveAttendance = async () => {
    const approvalImage = attendanceApproveImage
      || attendanceDetails?.attendancePhoto
      || attendanceDetails?.cccdPhoto

    if (!approvalImage) {
      setAttendancePopupError('Vui lòng chọn ảnh điểm danh fail hoặc ảnh CCCD trước khi duyệt điểm danh.')
      return
    }

    let attendanceIdToUse =
      attendanceDetails?.id
      ?? attendanceDetails?.attendanceId
      ?? attendancePopupSession?.attendanceId
      ?? attendancePopupSession?.id
      ?? null

    if (!attendanceIdToUse) {
      // try fetching attendance detail explicitly as a last resort
      try {
        const sessionId = getSessionRecordId(attendancePopupSession)
        if (sessionId) {
          const attendance = await getAttendanceSession(sessionId)
          const attendanceObj = attendance?.data ?? attendance ?? null
          attendanceIdToUse = attendanceObj?.id ?? attendanceObj?.attendanceId ?? null
          // also update local state so UI reflects fetched data
          if (attendanceObj) {
            setAttendancePopupData(attendanceObj)
          }
        }
      } catch {
        // ignore — will handle below
      }
    }

    if (!attendanceIdToUse) {
      setAttendancePopupError('Không xác định được attendanceId để duyệt. Vui lòng thử tải lại popup.')
      return
    }
    let base64ToSend = approvalImage
    try {
      base64ToSend = await normalizeAttendanceImage(approvalImage)
    } catch {
      setAttendancePopupError('Không thể chuẩn hóa ảnh để gửi. Vui lòng thử lại.')
      return
    }

    await runProctorAction('approve-attendance', { base64Image: base64ToSend, attendanceId: attendanceIdToUse, sessionId: getSessionRecordId(attendancePopupSession) })
  }

  const handleManualCheckin = async () => {
    const sessionId = getSessionRecordId(attendancePopupSession)
    if (!sessionId) {
      setAttendancePopupError('Không xác định được sessionId để tạo điểm danh thủ công.')
      return
    }

    const manualReason = String(proctorReason || '').trim()
    if (!manualReason) {
      setAttendancePopupError('Vui lòng nhập lý do trước khi tạo điểm danh thủ công.')
      return
    }

    const manualImage = attendanceApproveImage
      || attendanceDetails?.attendancePhoto
      || attendanceDetails?.cccdPhoto

    if (!manualImage) {
      setAttendancePopupError('Vui lòng chọn hoặc tải lên ảnh xác minh trước khi tạo điểm danh thủ công.')
      return
    }

    try {
      const base64ToSend = await normalizeAttendanceImage(manualImage)
      await runProctorAction('manual-checkin', {
        sessionId,
        base64Image: base64ToSend,
        reason: manualReason,
      })
    } catch (err) {
      setAttendancePopupError(err.message || 'Không thể tạo điểm danh thủ công.')
    }
  }

  const handleRejectAttendance = async () => {
    if (!hasProctorReason) {
      setAttendancePopupError('Vui lòng nhập lý do trước khi từ chối điểm danh.')
      return
    }

    const sessionId = getSessionRecordId(attendancePopupSession)
    const attendanceId =
      attendanceDetailRecord?.id
      ?? attendanceDetailRecord?.attendanceId
      ?? attendancePopupSession?.attendanceId
      ?? attendancePopupSession?.id
      ?? null

    await runProctorAction('reject-attendance', {
      sessionId,
      attendanceId,
      reason: String(proctorReason || '').trim(),
    })
  }

  const handleExportReport = async () => {
    // export report invoked
    
    if (!proctorFilter.roomId) {
      setExportErrorMessage('Vui lòng chọn phòng thi trước khi xuất báo cáo.')
      setShowExportError(true)
      return
    }
    
    try {
      await exportReport(proctorFilter.roomId)
      setExportErrorMessage('')
      setShowExportError(false)
    } catch (err) {
      setExportErrorMessage(err.message || 'Không thể xuất báo cáo')
      setShowExportError(true)
    }
  }

  // Using native <select> for simpler, browser-controlled dropdown behavior.

  const socketStatusLabel = {
    CONNECTED: 'Realtime: Đã kết nối',
    CONNECTING: 'Realtime: Đang kết nối...',
    ERROR: 'Realtime: Lỗi kết nối',
    IDLE: 'Realtime: Chưa bật',
  }[proctorSocketStatus] || 'Realtime: Chưa bật'

  return (
    <section className="panel proctor-panel">
      <div className="session-head">
        <div>
          <h2>Giám sát proctor</h2>
          <p className="student-exam-note">Xem nhanh dashboard, duyệt hoặc gắn cờ phiên thi, và tra lịch sử xác minh.</p>
          <p className="student-exam-note proctor-selected-context">
            Kỳ thi: <strong>{selectedProctorExamLabel || '-'}</strong> • Phòng: <strong>{selectedProctorRoomLabel || '-'}</strong>
          </p>
        </div>
        <div className="inline-actions">
          <button
            type="button"
            className="tiny-btn icon-only-btn proctor-hero-icon-btn"
            onClick={openProctorRoomModal}
            disabled={loadingProctorDashboard || proctorActionLoading || exporting}
            aria-label="Chọn hoặc đổi phòng"
            title="Chọn/Đổi phòng"
          >
            <LayoutGridIcon />
          </button>
          <button
            type="button"
            className="tiny-btn icon-only-btn proctor-hero-icon-btn"
            onClick={refreshProctorDashboard}
            disabled={loadingProctorDashboard || proctorActionLoading || !proctorFilter.roomId || exporting}
            aria-label="Tải lại dashboard"
            title="Tải lại dashboard"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className="tiny-btn success icon-only-btn proctor-hero-icon-btn"
            onClick={handleExportReport}
            disabled={exporting || proctorActionLoading || !proctorFilter.roomId}
            title="Xuất báo cáo phòng thi ra file Excel"
            aria-label="Xuất báo cáo"
          >
            <DownloadIcon />
          </button>
          {showExportError && (exportErrorMessage || exportError) && (
            <span className="proctor-inline-error">
              {exportErrorMessage || exportError}
              <button
                type="button"
                className="proctor-inline-error__close"
                onClick={() => {
                  setShowExportError(false)
                  setExportErrorMessage('')
                }}
                aria-label="Đóng lỗi xuất báo cáo"
              >
                <CloseIcon />
              </button>
            </span>
          )}
        </div>
      </div>

      <form ref={filterFormRef} className={`grid-form proctor-filter-form ${filterCollapsed ? 'collapsed' : ''}`} onSubmit={(e) => { e.preventDefault(); setFilterCollapsed(false); fetchProctorDashboard(null, 0) }}>
        {showFilterToggle && (
          <div className="proctor-filter-collapse-row">
            <button
              type="button"
              className={`tiny-btn proctor-filter-toggle ${filterCollapsed ? 'collapsed' : 'expanded'}`}
              aria-expanded={!filterCollapsed}
              onClick={() => { lastToggleAtRef.current = Date.now(); setShowFilterToggle(true); setFilterCollapsed((s) => !s) }}
              title={filterCollapsed ? 'Mở bộ lọc' : 'Thu gọn bộ lọc'}
            >
              <svg className={`filter-collapse-icon ${filterCollapsed ? 'collapsed' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="filter-toggle-label">Bộ lọc</span>
              <span className="visually-hidden">{filterCollapsed ? 'Hiện bộ lọc' : 'Thu gọn bộ lọc'}</span>
            </button>
          </div>
        )}
        <div className="proctor-filter-item">
          <label htmlFor="proctorStatus">Trạng thái</label>
          <select
            id="proctorStatus"
            value={proctorFilter.status}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Tất cả trạng thái</option>
            {proctorStatusOptions.map((status) => (
              <option key={status} value={status}>
                {getSessionStatusLabel(status) || status}
              </option>
            ))}
          </select>
        </div>

        <div className="proctor-filter-item">
          <label htmlFor="proctorFlagged">Flagged</label>
          <select
            id="proctorFlagged"
            className="flagged-select"
            value={proctorFilter.flagged}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, flagged: e.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="true">Có</option>
            <option value="false">Không</option>
          </select>
        </div>

        <div className="proctor-filter-item proctor-filter-keyword">
          <label htmlFor="proctorKeyword">Keyword</label>
          <input
            id="proctorKeyword"
            value={proctorFilter.keyword}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, keyword: e.target.value }))}
            placeholder="Tìm theo tên(In hoa không dấu), CCCD(9 số cuối)"
          />
        </div>

        <div className="proctor-filter-item proctor-filter-size">
          <label htmlFor="proctorSize">Size</label>
          <select
            id="proctorSize"
            className="size-select"
            value={proctorFilter.size}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, size: Number(e.target.value) }))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="proctor-filter-actions">
          <button
            className="primary icon-only-btn"
            type="submit"
            disabled={loadingProctorDashboard || !proctorFilter.roomId}
            aria-label="Áp dụng bộ lọc"
            title="Áp dụng bộ lọc"
          >
            <SearchIcon />
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setProctorFilter({ roomId: '', status: '', flagged: '', keyword: '', page: 0, size: 20 })
              setSelectedProctorSession(null)
              setProctorHistory([])
              setProctorReason('')
            }}
            disabled={loadingProctorDashboard}
            aria-label="Xóa lọc"
            title="Xóa lọc"
          >
            <CloseIcon />
          </button>
        </div>
      </form>

      <div className="proctor-alert-feed">
        <div className="session-head">
          <div>
            <h3>Cảnh báo realtime</h3>
            <p className="student-exam-note">{socketStatusLabel} • Room hiện tại: {proctorFilter.roomId || '-'}</p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="tiny-btn"
              onClick={() => setShowRealtimeAlertsPanel((current) => !current)}
              aria-expanded={showRealtimeAlertsPanel}
              aria-label={showRealtimeAlertsPanel ? 'Ẩn cảnh báo realtime' : 'Hiện cảnh báo realtime'}
              title={showRealtimeAlertsPanel ? 'Ẩn cảnh báo' : 'Hiện cảnh báo'}
            >
              {showRealtimeAlertsPanel ? 'Ẩn' : 'Hiện'}
            </button>
            <button
              type="button"
              className="tiny-btn icon-only-btn"
              onClick={clearProctorAlerts}
              disabled={proctorAlerts.length === 0}
              aria-label="Xóa feed cảnh báo"
              title="Xóa feed"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {!showRealtimeAlertsPanel ? (
          <p>Bấm <strong>Hiện</strong> để mở danh sách cảnh báo realtime. Hiện có {enrichedProctorAlerts.length} cảnh báo.</p>
        ) : enrichedProctorAlerts.length === 0 ? (
          <p>Chưa có cảnh báo mới cho phòng đang giám sát.</p>
        ) : (
          <div className="proctor-alert-list">
            {enrichedProctorAlerts.map((alert, index) => (
              <article key={`${alert.sessionId || 'session'}-${alert.timestamp}-${index}`} className="proctor-alert-item">
                <div className="proctor-alert-item-head">
                  <span className="risk-badge risk-info">
                    {alert.titleLabel}
                  </span>
                  <span className={`risk-badge risk-${String(alert.severity || 'LOW').toLowerCase()}`}>
                    {alert.severity || 'LOW'}
                  </span>
                  <small>{formatDateTime(alert.timestamp)}</small>
                </div>
                <strong>{alert.message}</strong>
                <small>{alert.subjectLabel}</small>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="proctor-list">
        <div className="session-head">
          <div>
            <h3>Hàng đợi điểm danh chờ duyệt</h3>
            <p className="student-exam-note">
              {selectedProctorRoomLabel && selectedProctorRoomLabel !== '-' ? `Phòng: ${selectedProctorRoomLabel}` : 'Đang lọc theo phòng thi hiện tại'}
            </p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="tiny-btn"
              onClick={() => {
                setShowPendingAttendancesPopup(true)
                if (!loadingPendingAttendances && pendingAttendances.length === 0 && !pendingAttendanceError && proctorFilter.roomId) {
                  void fetchPendingAttendances()
                }
              }}
              aria-label="Mở popup hàng đợi điểm danh"
              title="Mở popup hàng đợi"
            >
              Mở popup
            </button>
            <button
              type="button"
              className="tiny-btn icon-only-btn"
              onClick={() => void fetchPendingAttendances()}
              disabled={loadingPendingAttendances || !proctorFilter.roomId}
              aria-label="Tải lại hàng đợi điểm danh"
              title="Tải lại hàng đợi"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>

        <p className="student-exam-note" style={{ margin: 0 }}>
          Hiện có {pendingAttendances.length} bản ghi chờ duyệt. Danh sách chi tiết được mở trong popup.
        </p>
      </div>

      <div className="proctor-list">
        <div className="session-head">
          <h3>Dashboard</h3>
          <span className="student-exam-note">{proctorDashboard.length} phiên</span>
        </div>

        {loadingProctorDashboard ? (
          <p>Đang tải dashboard proctor...</p>
        ) : proctorDashboard.length === 0 ? (
          <p>Chưa có phiên nào phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <>
            <div className="proctor-dashboard-table-shell">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên sinh viên</th>
                      <th>CCCD</th>
                      <th>Phòng</th>
                      <th>Điểm danh</th>
                      <th>Trạng thái thi</th>
                      <th>Rủi ro</th>
                      <th>Lần vi phạm</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proctorDashboard.map((item, idx) => {
                      const sessionId = getSessionRecordId(item) ?? idx
                      const isSelected = String(sessionId) === String(selectedProctorSessionId)

                      return (
                        <tr key={`${sessionId}-${idx}`} className={isSelected ? 'selected-row' : ''} onClick={() => fetchProctorHistory(item)}>
                          <td>{idx + 1}</td>
                          <td>{item?.studentName ?? '-'}</td>
                          <td>{item?.citizenId ?? '-'}</td>
                          <td>{item?.roomCode ?? item?.roomId ?? item?.room?.id ?? '-'}</td>
                          <td>
                              <span className={`status-badge badge-${statusToBadgeClass(item?.attendanceStatus || item?.examSessionStatus || '')}`}>
                              {getSessionStatusLabel(item?.attendanceStatus || item?.examSessionStatus) || formatLabel(item?.attendanceStatus, {})}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge badge-${statusToBadgeClass(item?.examSessionStatus || '')}`}>
                              {getSessionStatusLabel(item?.examSessionStatus) || formatLabel(item?.examSessionStatus, {})}
                            </span>
                          </td>
                          <td>
                            <span className={`risk-badge risk-${(item?.riskLevel || 'LOW').toLowerCase()}`}>
                              {item?.riskLevel || 'LOW'}
                            </span>
                          </td>
                          <td className="attempt-cell">{item?.attemptNo ?? '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="tiny-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleOpenAttendancePopup(item)
                                }}
                              >
                                Điểm danh
                              </button>
                              <button
                                type="button"
                                className="tiny-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  fetchProctorHistory(item)
                                }}
                              >
                                Chi tiết
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="registration-pagination" style={{ marginTop: '12px' }}>
              <span>
                Trang {proctorPagination.currentPage + 1} / {proctorPagination.totalPages || 1} • Tổng {proctorPagination.totalElements} phiên
              </span>
              <div className="inline-actions">
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => fetchProctorDashboard(null, Math.max(0, proctorPagination.currentPage - 1))}
                  disabled={loadingProctorDashboard || proctorPagination.currentPage === 0}
                  aria-label="Trang trước"
                  title="Trang trước"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => fetchProctorDashboard(null, proctorPagination.currentPage + 1)}
                  disabled={loadingProctorDashboard || proctorPagination.currentPage >= proctorPagination.totalPages - 1}
                  aria-label="Trang sau"
                  title="Trang sau"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showProctorDetailModal && (
        <div className="proctor-modal-overlay" onClick={() => {
          setShowProctorDetailModal(false)
          setSelectedProctorSession(null)
          setProctorHistory([])
          setProctorReason('')
          safeSetProctorActionError('')
        }}>
          <div className="proctor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="proctor-modal-header">
              <h3>Chi tiết phiên xác minh</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => {
                    setShowProctorDetailModal(false)
                    setSelectedProctorSession(null)
                    setProctorHistory([])
                    setProctorReason('')
                    safeSetProctorActionError('')
                  }}
                  aria-label="Đóng chi tiết"
                >
                  <CloseIcon />
                </button>
            </div>

            <div className="proctor-modal-content">
              {!selectedProctorSession ? (
                <p>Chọn một phiên trong dashboard để xem chi tiết.</p>
              ) : (
                <>
                  <div className="proctor-student-header">
                    <div>
                      <h4>{selectedProctorSession?.studentName ?? 'Student'}</h4>
                      <div className="proctor-student-tags">
                        <span className={`status-badge badge-${statusToBadgeClass(selectedProctorSession?.attendanceStatus || selectedProctorSession?.examSessionStatus || '')}`}>
                          {getSessionStatusLabel(selectedProctorSession?.attendanceStatus || selectedProctorSession?.examSessionStatus) || formatLabel(selectedProctorSession?.attendanceStatus, {})}
                        </span>
                        <span className={`status-badge badge-${statusToBadgeClass(selectedProctorSession?.examSessionStatus || '')}`}>
                          {getSessionStatusLabel(selectedProctorSession?.examSessionStatus) || formatLabel(selectedProctorSession?.examSessionStatus, {})}
                        </span>
                        {selectedProctorSession?.flagged && (
                          <span className="flagged-indicator-badge">🚩 Flagged</span>
                        )}
                      </div>
                    </div>
                    <div className={`risk-indicator risk-${(selectedProctorSession?.riskLevel || 'LOW').toLowerCase()}`}>
                      {selectedProctorSession?.riskLevel || 'LOW'}
                    </div>
                  </div>

                  <div className="proctor-summary-grid">
                    <div><span>CCCD</span><strong>{selectedProctorSession?.citizenId ?? '-'}</strong></div>
                    <div><span>Room Code</span><strong>{selectedProctorSession?.roomCode ?? selectedProctorSession?.roomId ?? '-'}</strong></div>
                    <div><span>Device</span><strong className="device-id">{selectedProctorSession?.deviceId ?? '-'}</strong></div>
                    <div><span>Pending Device</span><strong className="device-id">{selectedProctorSession?.pendingDeviceId ?? '-'}</strong></div>

                    <div>
                      <span>Attendance Status</span>
                      <strong className={`status-text badge-${statusToBadgeClass(selectedProctorSession?.attendanceStatus || selectedProctorSession?.examSessionStatus || '')}`}>
                        {getSessionStatusLabel(selectedProctorSession?.attendanceStatus || selectedProctorSession?.examSessionStatus) || '-'}
                      </strong>
                    </div>
                    <div>
                      <span>Exam Status</span>
                      <strong>{getSessionStatusLabel(selectedProctorSession?.examSessionStatus) || '-'}</strong>
                    </div>

                    <div><span>Attempt</span><strong>{selectedProctorSession?.attemptNo ?? '-'}</strong></div>
                    <div><span>Last Verify ID</span><strong>{selectedProctorSession?.lastVerifyId ?? '-'}</strong></div>

                    <div><span>Last Verify Time</span><strong>{formatDateTime(selectedProctorSession?.lastVerifyTime)}</strong></div>
                    <div><span>Last Confidence</span><strong>{selectedProctorSession?.lastConfidence ? `${(selectedProctorSession.lastConfidence * 100).toFixed(1)}%` : '-'}</strong></div>

                    <div><span>Flagged</span><strong className={selectedProctorSession?.flagged ? 'flagged-yes' : 'flagged-no'}>
                      {selectedProctorSession?.flagged ? '🚩 YES' : '✓ NO'}
                    </strong></div>

                    {selectedProctorSession?.captureImageUrl && imagePreviewOpen && (
                      <div className="capture-image-preview">
                        <span>Ảnh xác minh</span>
                        <a href={selectedProctorSession?.captureImageUrl} target="_blank" rel="noopener noreferrer">
                          {!captureImageBroken ? (
                            <img
                              src={selectedProctorSession?.captureImageUrl}
                              alt="Capture"
                              loading="lazy"
                              onError={() => setCaptureImageBroken(true)}
                            />
                          ) : (
                            <div className="capture-image-fallback">
                              <strong>Không tải được ảnh xem trước</strong>
                              <span>Mở liên kết để xem ảnh gốc.</span>
                            </div>
                          )}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="proctor-history">
                    <div className="session-head">
                      <h4>Lịch sử xác minh</h4>
                      <button
                        type="button"
                        className="tiny-btn icon-only-btn"
                        onClick={() => fetchProctorHistory(selectedProctorSession)}
                        disabled={loadingProctorHistory}
                        aria-label="Tải lại lịch sử xác minh"
                        title="Tải lại lịch sử"
                      >
                        <RefreshIcon />
                      </button>
                    </div>

                    <VerificationHistory history={proctorHistory} loading={loadingProctorHistory} />
                  </div>
                </>
              )}
            </div>

            {selectedProctorSession && (
              <div className="proctor-modal-footer">
                <textarea
                  value={proctorReason}
                  onChange={(e) => {
                    setProctorReason(e.target.value)
                    if (proctorActionErrorMessage) {
                      safeSetProctorActionError('')
                    }
                  }}
                  placeholder="Nhập lý do gắn cờ hoặc từ chối phiên thi"
                  rows={3}
                />
                <div className="proctor-reason-hint">
                  Bắt buộc nhập lý do cho <strong>Gắn cờ</strong> và <strong>Từ chối</strong>.
                </div>
                {proctorActionErrorMessage && (
                  <div className="proctor-inline-error proctor-inline-error--modal" role="alert">
                    {proctorActionErrorMessage}
                  </div>
                )}
                <div className="proctor-footer-actions">
                  {/* Attendance popup is opened from the row-level "Điểm danh" button; modal footer button removed */}
                  {(() => {
                    const actionSessionId = getSessionRecordId(selectedProctorSession)
                    const examSessionStatus = String(selectedProctorSession?.examSessionStatus || '').toUpperCase()
                    const canApproveExamSession =
                      examSessionStatus === 'PENDING_REVIEW' || examSessionStatus === 'PENDING_VERIFY_REVIEW'
                    return (
                      <>
                        {(selectedProctorSession?.pendingDeviceId || String(selectedProctorSession?.examSessionStatus || '').toUpperCase() === 'PENDING_DEVICE_APPROVAL') && (
                          <button
                            type="button"
                            className="tiny-btn proctor-action-btn proctor-action-btn--device"
                            onClick={() => runProctorAction('approve-device', { sessionId: actionSessionId })}
                            disabled={proctorActionLoading}
                            aria-label="Duyệt thiết bị"
                            title="Duyệt thiết bị"
                          >
                            <DeviceIcon />
                            <span>Duyệt thiết bị</span>
                          </button>
                        )}
                        {String(selectedProctorSession?.attendanceStatus || '').toUpperCase() !== 'PENDING_REVIEW'
                          && !(selectedProctorSession?.pendingDeviceId || String(selectedProctorSession?.examSessionStatus || '').toUpperCase() === 'PENDING_DEVICE_APPROVAL')
                          && canApproveExamSession && (
                          <button
                            type="button"
                            className="tiny-btn proctor-action-btn proctor-action-btn--session"
                            onClick={() => runProctorAction('approve', { sessionId: actionSessionId })}
                            disabled={proctorActionLoading}
                            aria-label="Duyệt phiên thi"
                            title="Duyệt phiên thi"
                          >
                            <CheckIcon />
                            <span>Duyệt phiên</span>
                          </button>
                        )}
                        {!selectedProctorSession?.flagged ? (
                          <button
                            type="button"
                            className="tiny-btn proctor-action-btn proctor-action-btn--flag"
                            onClick={() => runProctorAction('flag', { sessionId: actionSessionId })}
                            disabled={proctorActionLoading || !hasProctorReason}
                            aria-label="Gắn cờ phiên"
                            title={hasProctorReason ? 'Gắn cờ phiên thi' : 'Nhập lý do trước khi gắn cờ'}
                          >
                            <FlagIcon />
                            <span>Gắn cờ</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="tiny-btn proctor-action-btn proctor-action-btn--unflag"
                            onClick={() => runProctorAction('unflag', { sessionId: actionSessionId })}
                            disabled={proctorActionLoading}
                            aria-label="Bỏ cờ phiên"
                            title="Bỏ cờ phiên thi"
                          >
                            <CheckIcon />
                            <span>Bỏ cờ</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="tiny-btn proctor-action-btn proctor-action-btn--reject"
                          onClick={() => runProctorAction('reject', { sessionId: actionSessionId })}
                          disabled={proctorActionLoading || !hasProctorReason}
                          aria-label="Từ chối phiên"
                          title={hasProctorReason ? 'Từ chối phiên thi' : 'Nhập lý do trước khi từ chối'}
                        >
                          <CloseIcon />
                          <span>Từ chối</span>
                        </button>
                      </>
                    )
                  })()}
                  <button
                    type="button"
                    className="tiny-btn secondary"
                    onClick={() => {
                      setShowProctorDetailModal(false)
                      setSelectedProctorSession(null)
                      setProctorHistory([])
                      setProctorReason('')
                      safeSetProctorActionError('')
                      setShowExportError(false)
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showPendingAttendancesPopup && (
        <div
          className="proctor-modal-overlay"
          onClick={() => setShowPendingAttendancesPopup(false)}
          style={{ zIndex: 1190 }}
        >
          <div className="proctor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
            <div className="proctor-modal-header">
              <div>
                <h3>Hàng đợi điểm danh chờ duyệt</h3>
                <p className="student-exam-note">
                  {selectedProctorRoomLabel && selectedProctorRoomLabel !== '-' ? `Phòng: ${selectedProctorRoomLabel}` : 'Đang lọc theo phòng thi hiện tại'}
                </p>
              </div>
              <div className="inline-actions">
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => void fetchPendingAttendances()}
                  disabled={loadingPendingAttendances || !proctorFilter.roomId}
                  aria-label="Tải lại hàng đợi điểm danh"
                  title="Tải lại hàng đợi"
                >
                  <RefreshIcon />
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowPendingAttendancesPopup(false)}
                  aria-label="Đóng popup hàng đợi"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="proctor-modal-content">
              {pendingAttendanceError && (
                <div className="proctor-inline-error proctor-inline-error--modal" role="alert">
                  {pendingAttendanceError}
                </div>
              )}

              {loadingPendingAttendances ? (
                <p>Đang tải hàng đợi điểm danh...</p>
              ) : pendingAttendances.length === 0 ? (
                <p>Không có điểm danh nào đang chờ duyệt cho phòng hiện tại.</p>
              ) : (
                <div className="table-wrap">
                  <table className="pending-attendance-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>CCCD</th>
                        <th>Room</th>
                        <th>Attendance</th>
                        <th>Exam Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingAttendances.map((item, idx) => {
                        const recordKey = item?.attendanceId ?? item?.sessionId ?? idx
                        return (
                          <tr key={`${recordKey}-${idx}`}>
                            <td>{item?.studentName || '-'}</td>
                            <td>{item?.citizenId || '-'}</td>
                            <td>{item?.roomCode || (selectedProctorRoomLabel && selectedProctorRoomLabel !== '-' ? selectedProctorRoomLabel : '-')}</td>
                            <td>
                              <span className={`status-badge badge-${statusToBadgeClass(item?.attendanceStatus || 'PENDING_REVIEW')}`}>
                                {getSessionStatusLabel(item?.attendanceStatus || 'PENDING_REVIEW') || 'Chờ duyệt'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge badge-${statusToBadgeClass(item?.examSessionStatus || 'PENDING_REVIEW')}`}>
                                {getSessionStatusLabel(item?.examSessionStatus || 'PENDING_REVIEW') || 'Chờ duyệt'}
                              </span>
                            </td>
                            <td>{formatDateTime(item?.createdAt)}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="tiny-btn"
                                  onClick={() => void handleOpenPendingAttendancePopup(item)}
                                >
                                  Xử lý
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAttendancePopup && attendancePopupSession && (
        <div
          className="proctor-modal-overlay"
          onClick={() => {
            setShowAttendancePopup(false)
            setAttendancePopupSession(null)
          }}
          style={{ zIndex: 1200 }}
        >
          <div className="proctor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className="proctor-modal-header">
              <h3>{hasAttendanceRecord ? 'Điểm danh / Ảnh xác minh' : 'Điểm danh thủ công'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setShowAttendancePopup(false)
                  setAttendancePopupSession(null)
                }}
                aria-label="Đóng popup điểm danh"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="proctor-modal-content">
              {attendancePopupError && (
                <div className="proctor-inline-error proctor-inline-error--modal" role="alert">
                  {attendancePopupError}
                </div>
              )}

              <div className="proctor-summary-grid">
                <div><span>Student</span><strong>{attendanceDetailRecord?.studentName ?? attendancePopupSession?.studentName ?? '-'}</strong></div>
                <div><span>CCCD</span><strong>{attendanceDetailRecord?.citizenId ?? attendancePopupSession?.citizenId ?? '-'}</strong></div>
                <div><span>Attendance Status</span><strong>{getSessionStatusLabel(attendanceDetailRecord?.status || attendanceDetailRecord?.attendanceStatus || attendancePopupSession?.attendanceStatus) || '-'}</strong></div>
                <div><span>Exam Status</span><strong>{getSessionStatusLabel(attendanceDetailRecord?.examSessionStatus || attendancePopupSession?.examSessionStatus) || '-'}</strong></div>
                <div><span>Check-in Time</span><strong>{attendanceDetailRecord?.checkinTime || '-'}</strong></div>
                <div><span>Verified At</span><strong>{attendanceDetailRecord?.verifiedAt || '-'}</strong></div>
                <div><span>Verified By</span><strong>{attendanceDetailRecord?.verifiedByName || attendanceDetailRecord?.verifiedById || '-'}</strong></div>
                <div><span>Confidence</span><strong>{typeof attendanceDetailRecord?.confidence === 'number' ? `${(attendanceDetailRecord.confidence * 100).toFixed(1)}%` : '-'}</strong></div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label className="student-exam-note" style={{ display: 'block', marginBottom: '8px' }}>
                  Ảnh xác minh
                </label>
                <div className="attendance-approval-panel">
                  <div className="attendance-approval-sources">
                    <div className="attendance-source-actions">
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => handleUseAttendanceImage('fail')}
                        disabled={!attendanceDetailRecord?.attendancePhoto}
                      >
                        Dùng ảnh điểm danh fail
                      </button>
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => handleUseAttendanceImage('cccd')}
                        disabled={!attendanceDetailRecord?.cccdPhoto}
                      >
                        Dùng ảnh CCCD
                      </button>
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => void handleOpenAttendanceCamera()}
                        disabled={attendanceCameraLoading}
                      >
                        {attendanceCameraLoading ? 'Đang mở camera...' : 'Bật camera chụp ảnh'}
                      </button>
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => attendanceUploadInputRef.current?.click()}
                      >
                        Tải ảnh lên
                      </button>
                      <input
                        ref={attendanceUploadInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleUploadAttendanceImage}
                      />
                    </div>

                    {attendanceCameraError && (
                      <div className="proctor-inline-error proctor-inline-error--modal" role="alert">
                        {attendanceCameraError}
                      </div>
                    )}

                    {attendanceCameraOpen && (
                      <div className="capture-image-preview attendance-camera-card">
                        <span>Camera chụp ảnh duyệt</span>
                        <video
                          ref={attendanceCameraVideoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '6px', background: '#000' }}
                        />
                        <div className="proctor-footer-actions attendance-camera-actions" style={{ justifyContent: 'flex-start' }}>
                          <button type="button" className="tiny-btn proctor-action-btn proctor-action-btn--session" onClick={handleCaptureAttendanceCamera}>
                            <CheckIcon />
                            <span>Chụp ảnh</span>
                          </button>
                          <button type="button" className="tiny-btn secondary" onClick={handleCloseAttendanceCamera}>
                            Đóng camera
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="attendance-approval-preview">
                    {attendanceApproveImage ? (
                      <div className="capture-image-preview attendance-selected-preview">
                        <span>Ảnh sẽ gửi lên backend</span>
                        <img src={attendanceApproveImage} alt="Attendance approval" loading="lazy" />
                        <div className="student-exam-note">
                          Đã chọn: <strong>{attendanceApproveImageName}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="attendance-empty-state">
                        <strong>Chưa chọn ảnh duyệt</strong>
                        <span>Chọn ảnh fail, ảnh CCCD, hoặc chụp mới từ camera.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="attendance-reason-card">
                <label className="student-exam-note" style={{ display: 'block', marginBottom: '8px' }}>
                  {hasAttendanceRecord ? 'Lý do từ chối điểm danh' : 'Lý do / ghi chú điểm danh thủ công'}
                </label>
                <textarea
                  value={proctorReason}
                  onChange={(e) => {
                    setProctorReason(e.target.value)
                    if (attendancePopupError) setAttendancePopupError('')
                    if (proctorActionErrorMessage) safeSetProctorActionError('')
                  }}
                  placeholder={hasAttendanceRecord ? 'Nhập lý do từ chối nếu cần' : 'Nhập lý do và ghi chú cho điểm danh thủ công'}
                  rows={3}
                />
              </div>

              {attendancePopupLoading ? (
                <div className="capture-image-fallback" style={{ marginTop: '16px' }}>
                  <strong>Đang tải thông tin điểm danh...</strong>
                  <span>Vui lòng chờ trong giây lát.</span>
                </div>
              ) : (
                <div className="capture-image-preview" style={{ marginTop: '16px' }}>
                  <span>Ảnh điểm danh</span>
                  <div className="images-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {attendanceDetailRecord?.cccdPhoto ? (
                      <div className="capture-image-preview" style={{ marginTop: 0 }}>
                        <span>Ảnh CCCD</span>
                        <a href={attendanceDetailRecord.cccdPhoto} target="_blank" rel="noopener noreferrer">
                          <img src={attendanceDetailRecord.cccdPhoto} alt="Ảnh CCCD" loading="lazy" />
                        </a>
                      </div>
                    ) : (
                      <div className="capture-image-fallback">
                        <strong>Không có ảnh CCCD</strong>
                        <span>Backend chưa trả cccdPhoto.</span>
                      </div>
                    )}

                    {attendanceDetailRecord?.attendancePhoto ? (
                      <div className="capture-image-preview" style={{ marginTop: 0 }}>
                        <span>Ảnh điểm danh</span>
                        <a href={attendanceDetailRecord.attendancePhoto} target="_blank" rel="noopener noreferrer">
                          <img src={attendanceDetailRecord.attendancePhoto} alt="Ảnh điểm danh" loading="lazy" />
                        </a>
                      </div>
                    ) : (
                      <div className="capture-image-fallback">
                        <strong>Không có ảnh điểm danh</strong>
                        <span>Backend chưa trả attendancePhoto.</span>
                      </div>
                    )}
                  </div>

                  {attendanceDetailRecord?.reviewNote && (
                    <div className="verification-note" style={{ marginTop: '12px' }}>
                      {attendanceDetailRecord.reviewNote}
                    </div>
                  )}
                </div>
              )}

              <div className="proctor-footer-actions" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
                {hasAttendanceRecord ? (
                  <>
                    <button
                      type="button"
                      className="tiny-btn proctor-action-btn proctor-action-btn--session"
                      onClick={() => void handleApproveAttendance()}
                      disabled={attendancePopupLoading || proctorActionLoading}
                    >
                      <CheckIcon />
                      <span>Duyệt điểm danh</span>
                    </button>
                    <button
                      type="button"
                      className="tiny-btn proctor-action-btn proctor-action-btn--reject"
                      onClick={() => void handleRejectAttendance()}
                      disabled={attendancePopupLoading || proctorActionLoading || !hasProctorReason}
                    >
                      <CloseIcon />
                      <span>Từ chối điểm danh</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="tiny-btn proctor-action-btn proctor-action-btn--session"
                    onClick={() => void handleManualCheckin()}
                    disabled={attendancePopupLoading || proctorActionLoading || !String(proctorReason || '').trim() || !attendanceApproveImage}
                  >
                    <CheckIcon />
                    <span>Tạo điểm danh thủ công</span>
                  </button>
                )}
                <button
                  type="button"
                  className="tiny-btn secondary"
                  onClick={() => {
                    setShowAttendancePopup(false)
                    setAttendancePopupSession(null)
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
