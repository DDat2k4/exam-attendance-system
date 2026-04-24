import { useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { verifyIdentity } from '../../api/verificationApi'
import './FaceVerification.css'

export default function FaceVerification({ examSessionId, onVerified, onFailed, onClose }) {
  const videoRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [verificationResult, setVerificationResult] = useState(null)
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
      setError(`Bạn đã vượt quá ${MAX_ATTEMPTS} lần thử. Vui lòng thử lại sau.`)
      onFailed?.(`Bạn đã vượt quá ${MAX_ATTEMPTS} lần xác minh.`)
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

      if (!response || typeof response.passed !== 'boolean') {
        throw new Error('API /verify chưa trả dữ liệu passed/confidence như FE yêu cầu.')
      }

      setVerificationResult(response)

      if (response.passed) {
        setMessage(`✓ Xác minh thành công! Độ tin cậy: ${(response.confidence * 100).toFixed(1)}%`)
        setTimeout(() => {
          onVerified?.(response)
        }, 1500)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setError(
          `✗ Xác minh thất bại (Lần ${newAttempts}/${MAX_ATTEMPTS}). Độ tin cậy: ${(response.confidence * 100).toFixed(1)}%. Vui lòng thử lại.`,
        )

        if (newAttempts >= MAX_ATTEMPTS) {
          setTimeout(() => {
            onFailed?.('Xác minh khuôn mặt thất bại quá số lần cho phép.')
          }, 600)
        }
      }
    } catch (err) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setError(`✗ Lỗi xác minh (Lần ${newAttempts}/${MAX_ATTEMPTS}): ${err.message}`)

      if (newAttempts >= MAX_ATTEMPTS) {
        setTimeout(() => {
          onFailed?.('Không thể hoàn tất xác minh khuôn mặt do lỗi hệ thống hoặc dữ liệu không hợp lệ.')
        }, 600)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="face-verification">
      <div className="face-verification-container">
        <h2>Xác Minh Khuôn Mặt (INITIAL)</h2>

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
            Hãy nhìn thẳng vào camera. Khuôn mặt của bạn phải rõ ràng và đủ sáng.
          </p>

          <div className="attempt-counter">
            Lần thử: <strong>{attempts}</strong>/<strong>{MAX_ATTEMPTS}</strong>
          </div>
        </div>

        {message && <div className="message success-message">{message}</div>}
        {error && <div className="message error-message">{error}</div>}

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

        <div className="button-group">
          <button
            className="btn-verify"
            onClick={handleVerify}
            disabled={loading || !cameraActive || attempts >= MAX_ATTEMPTS}
          >
            {loading ? 'Đang xử lý...' : 'Xác Minh'}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
