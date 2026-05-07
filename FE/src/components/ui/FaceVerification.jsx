import { useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { verifyIdentity } from '../../api/verificationApi'
import './FaceVerification.css'

export default function FaceVerification({ examSessionId, onVerified, onFailed, onPending, onClose }) {
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

    if (attempts >= MAX_ATTEMPTS) {
      setError(`Đã vượt quá ${MAX_ATTEMPTS} lần xác minh — đang chờ giám thị duyệt.`)
      setMessage('')
      setAwaitingProctorApproval(true)
      onPending?.('PENDING_REVIEW')
      return
    }

    try {
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
      }

      // Handle session status from backend
      const status = (response.sessionStatus || '').toUpperCase()

      if (status === 'PENDING_DEVICE_APPROVAL') {
        setError('Thiết bị đã thay đổi — chờ giám thị xác nhận')
        setMessage('')
        setAwaitingProctorApproval(true)
        setLoading(false)
        onPending?.('PENDING_DEVICE_APPROVAL')
        return
      }

      if (status === 'PENDING_REVIEW') {
        setError('Đã vượt quá 3 lần xác minh — đang chờ giám thị duyệt')
        setMessage('')
        setAwaitingProctorApproval(true)
        onPending?.('PENDING_REVIEW')
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
        }, 1500)
      } else {
        const newAttempts = response.attempt ?? attempts + 1
        setAttempts(newAttempts)
        const confidenceText = Number.isFinite(response.confidence)
          ? `${(response.confidence * 100).toFixed(1)}%`
          : '—'
        setError(
          `✗ Xác minh thất bại (Lần ${newAttempts}/${MAX_ATTEMPTS}). Độ tin cậy: ${confidenceText}. Vui lòng thử lại.`,
        )

        if (newAttempts >= MAX_ATTEMPTS) {
          setAwaitingProctorApproval(true)
          setTimeout(() => {
            onPending?.('PENDING_REVIEW')
          }, 600)
        }
      }
    } catch (err) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setError(`✗ Lỗi xác minh (Lần ${newAttempts}/${MAX_ATTEMPTS}): ${err.message}`)

      if (newAttempts >= MAX_ATTEMPTS) {
        setAwaitingProctorApproval(true)
        setTimeout(() => {
          onPending?.('PENDING_REVIEW')
        }, 600)
      }
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
          <div className="verification-badge">Lần thử {attempts}/{MAX_ATTEMPTS}</div>
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
              Lần thử: <strong>{attempts}</strong>/<strong>{MAX_ATTEMPTS}</strong>
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
            disabled={loading || !cameraActive || awaitingProctorApproval}
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
