import { useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { getExamSessionById } from '../../api/examSessionApi'
import { verifyIdentity } from '../../api/verificationApi'
import { flagExamSession } from '../../api/examSessionApi'
import './FaceVerification.css'

export default function FaceVerification({ examSessionId, onVerified, onFailed, onPending, onAttempt, onClose }) {
  const videoRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [verificationResult, setVerificationResult] = useState(null)
  const [awaitingProctorApproval, setAwaitingProctorApproval] = useState(false)
  const MAX_ATTEMPTS = 3
  const streamRef = useRef(null)

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        setMessage('Đang yêu cầu quyền truy cập camera...')
        const stream = await requestCameraAccess()
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraActive(true)
          setMessage('')
        }
      } catch (err) {
        setError(err.message)
        setMessage('')
      }
    }

    initCamera()

    // Sync session status/attempts and detect device mismatch on mount
    const syncSession = async () => {
      if (!examSessionId) return
      try {
        const session = await getExamSessionById(examSessionId)
        const serverAttempt = Number(session?.attemptNo ?? session?.attempt ?? session?.attemptNo)
        if (Number.isInteger(serverAttempt) && serverAttempt >= 0) {
          setAttempts(serverAttempt)
          onAttempt?.(serverAttempt)
        }

        const sessionStatus = String(session?.examSessionStatus || session?.status || '').toUpperCase()
        const approvedStates = ['CHECKED_IN', 'IN_PROGRESS', 'APPROVED']
        if (sessionStatus === 'PENDING_DEVICE_APPROVAL') {
          setAwaitingProctorApproval(true)
          setError('Thiết bị đã thay đổi — chờ giám thị xác nhận')
          onPending?.('PENDING_DEVICE_APPROVAL', serverAttempt)
        } else if (sessionStatus === 'PENDING_REVIEW') {
          setAwaitingProctorApproval(true)
          setError('Phiên đang chờ giám thị duyệt')
          onPending?.('PENDING_REVIEW', serverAttempt)
        } else {
          // detect local device mismatch compared to stored session deviceId
          try {
            const localDeviceId = getDeviceInfo().deviceId
            const serverDeviceId = session?.deviceId || session?.device_id || null
            // Only consider device mismatch as pending when the session is NOT already approved/checked-in
            if (!approvedStates.includes(sessionStatus) && localDeviceId && serverDeviceId && String(localDeviceId) !== String(serverDeviceId)) {
              setAwaitingProctorApproval(true)
              setError('Phát hiện đổi thiết bị — chờ giám thị duyệt')
              onPending?.('PENDING_DEVICE_APPROVAL', serverAttempt)
            }
          } catch {}
        }
      } catch (err) {
        // ignore sync errors
      }
    }

    void syncSession()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Handle verification
  const handleVerify = async () => {
    if (!videoRef.current || !cameraActive) {
      setError('Camera not ready')
      return
    }

    // Prevent further attempts if we already hit max attempts or waiting for proctor
    if (attempts >= MAX_ATTEMPTS || awaitingProctorApproval) {
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

      // Use attempt from backend to keep FE in sync
      if (typeof response.attempt === 'number') {
        setAttempts(response.attempt)
        onAttempt?.(response.attempt)
      }

      // Handle session status from backend
      const status = (response.sessionStatus || '').toUpperCase()

      if (status === 'PENDING_DEVICE_APPROVAL') {
        setError('Thiết bị đã thay đổi — chờ giám thị xác nhận')
        setMessage('')
        setAwaitingProctorApproval(true)
        setLoading(false)
        onPending?.('PENDING_DEVICE_APPROVAL', response?.attempt)
        if (typeof response?.attempt === 'number') onAttempt?.(response.attempt)
        return
      }

      if (status === 'PENDING_REVIEW') {
        setError('Phiên đang chờ giám thị duyệt')
        setMessage('')
        setAwaitingProctorApproval(true)
        onPending?.('PENDING_REVIEW', response?.attempt)
        if (typeof response?.attempt === 'number') onAttempt?.(response.attempt)
        return
      }

      if (status === 'BLOCKED') {
        setError('Phiên thi đã bị khóa')
        setMessage('')
        onFailed?.('BLOCKED')
        return
      }

      if (response.passed || isReconnect) {
        const pct = response.confidence ? (response.confidence * 100).toFixed(1) : '—'

        if (isReconnect) {
          setMessage(`✓ Reconnected — vào lại phiên thành công.`)
        } else {
          setMessage(`✓ Xác minh thành công! Độ tin cậy: ${pct}%`)
        }

        setTimeout(() => {
          onVerified?.(response)
          if (typeof response.attempt === 'number') onAttempt?.(response.attempt)
        }, 1500)
      } else {
        // Use backend attempt if provided, otherwise increment local counter
        const newAttempts = typeof response.attempt === 'number' ? response.attempt : attempts + 1
        // verification failed
        setAttempts(newAttempts)
        onAttempt?.(newAttempts)
        const confidenceText = Number.isFinite(response.confidence)
          ? `${(response.confidence * 100).toFixed(1)}%`
          : '—'
        setError(
          `✗ Xác minh thất bại (Lần ${newAttempts}/${MAX_ATTEMPTS}). Độ tin cậy: ${confidenceText}. Vui lòng thử lại.`,
        )

        // If we've reached max attempts, inform backend so it can mark session as pending review.
        if (newAttempts >= MAX_ATTEMPTS) {
          try {
            // Best-effort notify backend that multiple verify attempts occurred
            await flagExamSession(examSessionId, 'MULTIPLE_VERIFY_FAILED')
          } catch (err) {
            // failed to flag session (suppressed)
          }

          // Enter awaiting state and notify parent
          setAwaitingProctorApproval(true)
          onPending?.('PENDING_REVIEW', newAttempts)
        }
        // Do not move to pending purely on client-side count — backend will return sessionStatus when appropriate.
      }
    } catch (err) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      onAttempt?.(newAttempts)
      setError(`✗ Lỗi xác minh (Lần ${newAttempts}/${MAX_ATTEMPTS}): ${err.message}`)
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
            <h2>Xác minh khuôn mặt khi vào thi</h2>
          </div>
            <div className="verification-badge">Lần thử {typeof attempts === 'number' ? `${attempts}/${MAX_ATTEMPTS}` : '—'}</div>
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
              {!cameraActive && <div className="video-placeholder">Đang tải camera...</div>}
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
              <div className="verification-tip verification-tip--info">Fail 3 lần sẽ chờ giám thị duyệt</div>
            </div>

              <div className="attempt-counter">
                Lần thử: <strong>{typeof attempts === 'number' ? attempts : '—'}</strong>/<strong>{MAX_ATTEMPTS}</strong>
              </div>
          </div>
        </div>

        <div className="verification-status-stack">
          {message && <div className="message success-message">{message}</div>}
          {error && <div className="message error-message">{error}</div>}
        </div>

        {verificationResult && (
          <div className="confidence-section">
            <p>
              Độ tin cậy: <strong>{(verificationResult.confidence * 100).toFixed(1)}%</strong>
            </p>
            <div className="confidence-bar">
              <div
                className={`confidence-fill ${verificationResult.confidence >= 0.7 ? 'pass' : 'fail'}`}
                style={{ width: `${verificationResult.confidence * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="button-group button-group--split">
          <button
            className="btn-verify"
            onClick={handleVerify}
            disabled={loading || !cameraActive || awaitingProctorApproval || attempts >= MAX_ATTEMPTS}
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
