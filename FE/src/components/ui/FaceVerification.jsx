import { useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { getExamSessionById } from '../../api/examSessionApi'
import { verifyIdentity } from '../../api/verificationApi'
import './FaceVerification.css'

export default function FaceVerification({ examSessionId, onVerified, onFailed, onPending, onAttempt, onClose }) {
  const videoRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [remainingAttempts, setRemainingAttempts] = useState(3)
  const [verificationResult, setVerificationResult] = useState(null)
  const [awaitingProctorApproval, setAwaitingProctorApproval] = useState(false)
  const streamRef = useRef(null)
  const onAttemptRef = useRef(onAttempt)
  const onPendingRef = useRef(onPending)
  const confidence = Number(verificationResult?.confidence)
  const hasValidConfidence = Number.isFinite(confidence) && confidence >= 0

  useEffect(() => {
    onAttemptRef.current = onAttempt
  }, [onAttempt])

  useEffect(() => {
    onPendingRef.current = onPending
  }, [onPending])

  const attachStreamToVideo = async (stream) => {
    if (!videoRef.current || !stream) return false

    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
    }

    try {
      await videoRef.current.play()
    } catch {
      // Some browsers block autoplay until metadata is loaded or user interaction.
    }

    return true
  }

  // Initialize camera
  useEffect(() => {
    let cancelled = false

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }

    const shouldLockCameraByStatus = (session) => {
      const sessionStatus = String(session?.examSessionStatus || session?.status || '').toUpperCase()
      return sessionStatus === 'PENDING_DEVICE_APPROVAL' || sessionStatus === 'PENDING_REVIEW' || sessionStatus === 'PENDING_VERIFY_REVIEW'
    }

    const syncSession = async () => {
      if (!examSessionId) return null
      try {
        const session = await getExamSessionById(examSessionId)
        if (cancelled) return null

        const serverAttempt = Number(session?.attempt ?? session?.attemptCount)
        if (Number.isInteger(serverAttempt) && serverAttempt >= 0) {
          setAttempts(serverAttempt)
          onAttemptRef.current?.(serverAttempt)
        }

        const serverMaxAttempt = Number(session?.maxAttempt ?? session?.maxAttempts)
        if (Number.isInteger(serverMaxAttempt) && serverMaxAttempt > 0) {
          setMaxAttempts(serverMaxAttempt)
        }

        const serverRemainingAttempt = Number(session?.remainingAttempt ?? session?.remainingAttempts)
        if (Number.isInteger(serverRemainingAttempt) && serverRemainingAttempt >= 0) {
          setRemainingAttempts(serverRemainingAttempt)
        }

        const sessionStatus = String(session?.examSessionStatus || session?.status || '').toUpperCase()
        const approvedStates = ['CHECKED_IN', 'IN_PROGRESS', 'APPROVED']

        if (sessionStatus === 'PENDING_DEVICE_APPROVAL') {
          setAwaitingProctorApproval(true)
          const backendMsg = session?.message || ''
          setMessage('')
          setError(backendMsg || 'Thiết bị đã thay đổi — chờ giám thị xác nhận')
          onPendingRef.current?.('PENDING_DEVICE_APPROVAL', serverAttempt, backendMsg)
        } else if (sessionStatus === 'PENDING_REVIEW' || sessionStatus === 'PENDING_VERIFY_REVIEW') {
          setAwaitingProctorApproval(true)
          const backendMsg = session?.message || ''
          setMessage('')
          setError(backendMsg || 'Phiên đang chờ giám thị duyệt xác minh')
          onPendingRef.current?.(sessionStatus, serverAttempt, backendMsg)
        } else {
          // detect local device mismatch compared to stored session deviceId
          try {
            const localDeviceId = getDeviceInfo().deviceId
            const serverDeviceId = session?.deviceId || session?.device_id || null
            if (!approvedStates.includes(sessionStatus) && localDeviceId && serverDeviceId && String(localDeviceId) !== String(serverDeviceId)) {
              setAwaitingProctorApproval(true)
              setMessage('')
              setError('Phát hiện đổi thiết bị — chờ giám thị duyệt')
              onPendingRef.current?.('PENDING_DEVICE_APPROVAL', serverAttempt)
            }
          } catch {
            // ignore device comparison errors
          }
        }

        return session
      } catch {
        // ignore sync errors
        return null
      }
    }

    const initCamera = async () => {
      try {
        setError('')
        setCameraActive(false)
        setMessage('Đang yêu cầu quyền truy cập camera...')

        const session = await syncSession()
        if (cancelled) return

        if (shouldLockCameraByStatus(session)) {
          setCameraActive(false)
          setMessage('')
          stopStream()
          return
        }

        const stream = await requestCameraAccess()
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        setCameraActive(true)
        setMessage('')

        const attached = await attachStreamToVideo(stream)
        if (!attached) {
          // Retry attaching shortly in case ref is not ready yet.
          setTimeout(() => {
            void attachStreamToVideo(stream)
          }, 100)
        }
      } catch (err) {
        setCameraActive(false)
        setError(err.message)
        setMessage('')
      }
    }

    void initCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [examSessionId])

  // Keep video element synced with stream in case DOM re-renders while stream is alive.
  useEffect(() => {
    if (!streamRef.current) return
    void attachStreamToVideo(streamRef.current)
  }, [cameraActive])

  // Handle verification
  const handleVerify = async () => {
    if (!videoRef.current || !cameraActive) {
      setError('Camera not ready')
      return
    }

    // Prevent further attempts if we already hit max attempts or waiting for proctor
    if (attempts >= maxAttempts || awaitingProctorApproval) {
      setAwaitingProctorApproval(true)
      setError('Bạn đã vượt quá số lần xác minh. Phiên đang chờ giám thị duyệt')
      return
    }

    // Do NOT enforce pending/review locally — rely on backend `sessionStatus` and `attempt`.

    try {
      // starting verification attempt
      setLoading(true)
      setError('')
      setMessage('Đang xử lý xác minh khuôn mặt...')

      // Capture image
      const captureImage = captureFrame(videoRef.current)
      const deviceInfo = getDeviceInfo()

      // Send to backend
      const response = await verifyIdentity({
        examSessionId,
        captureImage,
        type: 'INITIAL',
        ...deviceInfo,
      })

      // response should be normalized by API wrapper: { passed, confidence, attempt, sessionStatus, reconnect }
      const isReconnect = Boolean(response?.reconnect)
      if (!response || (typeof response.passed !== 'boolean' && !isReconnect)) {
        throw new Error('API /verify trả dữ liệu không hợp lệ.')
      }

      setVerificationResult(response)

      if (Number.isInteger(response?.maxAttempt) && response.maxAttempt > 0) {
        setMaxAttempts(response.maxAttempt)
      }

      if (Number.isInteger(response?.remainingAttempt) && response.remainingAttempt >= 0) {
        setRemainingAttempts(response.remainingAttempt)
      }

      // Use attempt from backend to keep FE in sync
      if (typeof response.attempt === 'number') {
        setAttempts(response.attempt)
        onAttemptRef.current?.(response.attempt)
      }

      // Handle session status from backend
      const status = (response.sessionStatus || '').toUpperCase()

      if (status === 'PENDING_DEVICE_APPROVAL') {
        const backendMsg = response?.message || ''
        setVerificationResult(null)
        setError(backendMsg || 'Thiết bị đã thay đổi — chờ giám thị xác nhận')
        setMessage('')
        setAwaitingProctorApproval(true)
        setLoading(false)
        onPendingRef.current?.('PENDING_DEVICE_APPROVAL', response?.attempt, backendMsg)
        if (typeof response?.attempt === 'number') onAttemptRef.current?.(response.attempt)
        return
      }

      if (status === 'PENDING_REVIEW' || status === 'PENDING_VERIFY_REVIEW') {
        const backendMsg = response?.message || ''
        setVerificationResult(null)
        setError(backendMsg || 'Phiên đang chờ giám thị duyệt xác minh')
        setMessage('')
        setAwaitingProctorApproval(true)
        onPendingRef.current?.(status, response?.attempt, backendMsg)
        if (typeof response?.attempt === 'number') onAttemptRef.current?.(response.attempt)
        return
      }

      if (status === 'BLOCKED') {
        const backendMsg = response?.message || ''
        setVerificationResult(null)
        setError(backendMsg || 'Phiên thi đã bị khóa')
        setMessage('')
        onFailed?.('BLOCKED')
        return
      }

      if (response.passed || isReconnect) {
        const pct = response.confidence ? (response.confidence * 100).toFixed(1) : '—'

        if (isReconnect) {
          setMessage(`✓ Reconnected — vào lại phiên thành công.`)
        } else {
          setMessage(`✓ Check-in thành công! Độ tin cậy: ${pct}%`)
        }

        setTimeout(() => {
          onVerified?.(response)
          if (typeof response.attempt === 'number') onAttemptRef.current?.(response.attempt)
        }, 1500)
      } else {
        const backendAttempt = typeof response.attempt === 'number' ? response.attempt : attempts
        const backendMaxAttempt = typeof response.maxAttempt === 'number' ? response.maxAttempt : maxAttempts
        const backendRemainingAttempt =
          typeof response.remainingAttempt === 'number'
            ? response.remainingAttempt
            : Math.max(0, backendMaxAttempt - backendAttempt)

        setAttempts(backendAttempt)
        setMaxAttempts(backendMaxAttempt)
        setRemainingAttempts(backendRemainingAttempt)
        onAttemptRef.current?.(backendAttempt)
        const confidenceText = Number.isFinite(response.confidence)
          ? `${(response.confidence * 100).toFixed(1)}%`
          : '—'
        const defaultErr = `✗ Xác minh thất bại (Lần ${backendAttempt}/${backendMaxAttempt}). Độ tin cậy: ${confidenceText}. Vui lòng thử lại.`
        setError(response?.message || defaultErr)

        // If we've reached max attempts, wait for backend-driven pending review state.
        if (backendRemainingAttempt <= 0 || backendAttempt >= backendMaxAttempt) {
          // Enter awaiting state and notify parent
          setAwaitingProctorApproval(true)
          onPendingRef.current?.('PENDING_VERIFY_REVIEW', backendAttempt)
        }
        // Do not move to pending purely on client-side count — backend will return sessionStatus when appropriate.
      }
    } catch (err) {
      setVerificationResult(null)
      setError(`✗ Lỗi xác minh (Lần ${attempts}/${maxAttempts}): ${err.message}`)
      // Do not trigger pending/review here; backend determines when session becomes PENDING_REVIEW.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="face-verification">
      <div className="face-verification-container">
        <div className="face-verification-header">
          <div>
            <p className="verification-eyebrow">Bước xác minh bắt đầu</p>
            <h2>Xác minh khuôn mặt để check-in</h2>
          </div>
          <div className="verification-badge">Lần thử {typeof attempts === 'number' ? `${attempts}/${maxAttempts}` : '—'}</div>
        </div>

        <div className="face-verification-body">
          <div className="video-section">
            <div className={`video-frame ${!cameraActive ? 'inactive' : ''}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="verification-video"
              />
              {!cameraActive && (
                <div className="video-placeholder">
                  {awaitingProctorApproval ? 'Camera tạm khóa - đang chờ giám thị duyệt' : 'Đang tải camera...'}
                </div>
              )}
            </div>
          </div>

          <div className="verification-info">
            <p className="instruction">
              Nhìn thẳng camera, giữ mặt rõ và đủ sáng. Fail 1-2 lần vẫn được thử lại; fail lần 3 sẽ chuyển chờ giám thị duyệt.
            </p>
            <p className="instruction">
              Nếu bạn quay lại phiên thi bằng thiết bị cũ trong khoảng an toàn, hệ thống có thể cho reconnect tự động.
              Nếu đổi thiết bị, phiên sẽ chờ giám thị xác nhận.
            </p>

            <div className="verification-tips">
              <div className="verification-tip verification-tip--good">Ánh sáng đều, không ngược sáng</div>
              <div className="verification-tip verification-tip--warn">Giữ khuôn mặt nằm giữa khung hình</div>
              <div className="verification-tip verification-tip--info">Fail đủ số lần sẽ chờ giám thị duyệt</div>
            </div>

            <div className="attempt-counter">
              Lần thử: <strong>{typeof attempts === 'number' ? attempts : '—'}</strong>/<strong>{maxAttempts}</strong>
              <span style={{ marginLeft: 8 }}>Còn lại: <strong>{remainingAttempts}</strong></span>
            </div>
          </div>
        </div>

        <div className="verification-status-stack">
          {message && <div className="message success-message">{message}</div>}
          {error && <div className="message error-message">{error}</div>}
        </div>

        {hasValidConfidence && (
          <div className="confidence-section">
            <p>
              Độ tin cậy: <strong>{(confidence * 100).toFixed(1)}%</strong>
            </p>
            <div className="confidence-bar">
              <div
                className={`confidence-fill ${confidence >= 0.7 ? 'pass' : 'fail'}`}
                style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="button-group button-group--split">
          <button
            className="btn-verify"
            onClick={handleVerify}
            disabled={loading || !cameraActive || awaitingProctorApproval || attempts >= maxAttempts}
          >
            {loading ? 'Đang xử lý...' : awaitingProctorApproval ? 'Đang chờ giám thị duyệt' : 'Xác Minh'}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
