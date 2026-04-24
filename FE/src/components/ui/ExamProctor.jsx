import { useCallback, useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { verifyIdentity } from '../../api/verificationApi'
import './ExamProctor.css'

export default function ExamProctor({ examSessionId, onSessionEnd, questions = [] }) {
  const videoRef = useRef(null)
  const randomTimeoutRef = useRef(null)
  const cameraPromptTimeoutRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('idle') // idle, verifying, success, failed
  const [lastVerification, setLastVerification] = useState(null)
  const [totalFailures, setTotalFailures] = useState(0)
  const [verificationLog, setVerificationLog] = useState([])
  const [examTime, setExamTime] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [randomCountdown, setRandomCountdown] = useState(null)
  const streamRef = useRef(null)
  const showCameraRef = useRef(false)

  const RANDOM_MIN_INTERVAL = 10000 // 10 seconds
  const RANDOM_MAX_INTERVAL = 40000 // 40 seconds
  const RANDOM_COUNTDOWN_MIN = 3 // 3 seconds
  const RANDOM_COUNTDOWN_MAX = 5 // 5 seconds
  const CAMERA_PROMPT_DURATION = 6000 // keep camera visible after capture for random checks
  const MAX_FAILURES = 2
  const EXAM_DURATION = 3600 // 1 hour in seconds

  useEffect(() => {
    showCameraRef.current = showCamera
  }, [showCamera])

  const registerFailure = useCallback(
    (nextStatus = 'failed') => {
      setVerificationStatus(nextStatus)
      setTotalFailures((prev) => {
        const newFailures = prev + 1
        if (newFailures >= MAX_FAILURES) {
          setTimeout(() => {
            onSessionEnd?.('VERIFICATION_FAILED_EXAM')
          }, 1200)
        } else {
          setTimeout(() => setVerificationStatus('idle'), 2500)
        }
        return newFailures
      })
    },
    [onSessionEnd],
  )

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await requestCameraAccess()
        streamRef.current = stream
        setCameraActive(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Camera error:', err.message)
        setCameraActive(false)
        registerFailure('failed')
      }
    }

    initCamera()

    return () => {
      if (randomTimeoutRef.current) {
        clearTimeout(randomTimeoutRef.current)
      }
      if (cameraPromptTimeoutRef.current) {
        clearTimeout(cameraPromptTimeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [registerFailure])

  // Attach stream whenever the preview video is mounted/shown.
  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showCamera])

  // Start exam timer
  useEffect(() => {
    const timer = setInterval(() => {
      setExamTime((prev) => {
        if (prev >= EXAM_DURATION) {
          clearInterval(timer)
          onSessionEnd?.('TIME_UP')
          return prev
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onSessionEnd])

  // Perform verification
  const performRandomVerification = useCallback(async () => {
    if (!videoRef.current || !cameraActive) {
      registerFailure('failed')
      return
    }

    try {
      setVerificationStatus('verifying')

      const captureImage = captureFrame(videoRef.current)
      const deviceInfo = getDeviceInfo()

      const response = await verifyIdentity({
        examSessionId,
        captureImage,
        type: 'RANDOM',
        ...deviceInfo,
      })

      const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        type: 'RANDOM',
        passed: response.passed,
        confidence: response.confidence,
      }

      setVerificationLog((prev) => [...prev, logEntry])
      setLastVerification(response)

      if (response.passed) {
        setVerificationStatus('success')
        setTimeout(() => setVerificationStatus('idle'), 2000)
      } else {
        registerFailure('failed')
      }
    } catch (err) {
      console.error('Verification error:', err.message)
      registerFailure('failed')
    }
  }, [cameraActive, examSessionId, registerFailure])

  const scheduleNextRandomVerification = useCallback(() => {
    if (totalFailures >= MAX_FAILURES || !cameraActive) return

    const delay =
      Math.floor(Math.random() * (RANDOM_MAX_INTERVAL - RANDOM_MIN_INTERVAL + 1)) + RANDOM_MIN_INTERVAL

    randomTimeoutRef.current = setTimeout(async () => {
      const countdownSeconds =
        Math.floor(Math.random() * (RANDOM_COUNTDOWN_MAX - RANDOM_COUNTDOWN_MIN + 1)) + RANDOM_COUNTDOWN_MIN

      // Random check should briefly force camera visibility for proctoring transparency.
      const shouldAutoClose = !showCameraRef.current
      setShowCamera(true)
      setVerificationStatus('countdown')
      setRandomCountdown(countdownSeconds)

      if (cameraPromptTimeoutRef.current) {
        clearTimeout(cameraPromptTimeoutRef.current)
      }
      if (shouldAutoClose) {
        cameraPromptTimeoutRef.current = setTimeout(() => {
          setShowCamera(false)
        }, countdownSeconds * 1000 + CAMERA_PROMPT_DURATION)
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }

      let remaining = countdownSeconds
      countdownIntervalRef.current = setInterval(async () => {
        remaining -= 1
        setRandomCountdown(remaining)

        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
          setRandomCountdown(null)
          await performRandomVerification()
          scheduleNextRandomVerification()
        }
      }, 1000)
    }, delay)
  }, [cameraActive, performRandomVerification, totalFailures])

  // Periodic verification (RANDOM)
  useEffect(() => {
    if (!cameraActive || totalFailures >= MAX_FAILURES) {
      return
    }

    scheduleNextRandomVerification()

    return () => {
      if (randomTimeoutRef.current) {
        clearTimeout(randomTimeoutRef.current)
      }
      if (cameraPromptTimeoutRef.current) {
        clearTimeout(cameraPromptTimeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      setRandomCountdown(null)
    }
  }, [cameraActive, totalFailures, scheduleNextRandomVerification])

  // Manual verification
  const handleManualVerify = async () => {
    await performRandomVerification()
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verifying':
        return '⏳'
      case 'countdown':
        return '⏱️'
      case 'success':
        return '✓'
      case 'failed':
        return '✗'
      default:
        return '●'
    }
  }

  return (
    <div className="exam-proctor">
      {/* Main exam area */}
      <div className="exam-main">
        <div className="exam-header">
          <h1>Kỳ Thi Trực Tuyến</h1>
          <div className="exam-timer">{formatTime(examTime)}</div>
        </div>

        <div className="exam-content">
          {questions && questions.length > 0 ? (
            <div className="questions-list">
              {questions.map((q, idx) => (
                <div key={idx} className="question-item">
                  <p className="question-text">{q.text}</p>
                  {q.options && (
                    <div className="options">
                      {q.options.map((opt, i) => (
                        <label key={i} className="option">
                          <input type="radio" name={`q${idx}`} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="placeholder">Chưa có câu hỏi</div>
          )}
        </div>

        <div className="exam-actions">
          <button className="btn-submit" onClick={() => onSessionEnd?.('SUBMITTED')}>
            Nộp bài
          </button>
        </div>
      </div>

      {/* Sidebar - Proctor status */}
      <div className="proctor-sidebar">
        <h3 className="sidebar-title">Giám Sát</h3>

        {/* Camera preview */}
        <div className="camera-section">
          <button
            className="btn-toggle-camera"
            onClick={() => setShowCamera(!showCamera)}
          >
            {showCamera ? '🔽 Ẩn Camera' : '📷 Xem Camera'}
          </button>

          {showCamera && (
            <div className="camera-preview-wrapper">
              <div className={`camera-preview ${!cameraActive ? 'inactive' : ''}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="proctor-video"
                />
                {!cameraActive && (
                  <div className="camera-unavailable">Camera không khả dụng</div>
                )}
              </div>
              <button
                className="btn-manual-verify"
                onClick={handleManualVerify}
                disabled={verificationStatus === 'verifying' || !cameraActive}
              >
                Xác Minh Ngay
              </button>
            </div>
          )}
        </div>

        {/* Verification status */}
        <div className={`status-section status-${verificationStatus}`}>
          <div className="status-icon">{getStatusIcon()}</div>
          <div className="status-text">
            {verificationStatus === 'idle' && 'Sẵn sàng'}
            {verificationStatus === 'countdown' && `Chuẩn bị chụp sau ${randomCountdown ?? 0}s...`}
            {verificationStatus === 'verifying' && 'Đang xác minh...'}
            {verificationStatus === 'success' && 'Xác minh thành công'}
            {verificationStatus === 'failed' && 'Xác minh thất bại'}
          </div>
        </div>

        {verificationStatus === 'countdown' && randomCountdown !== null && (
          <div className="alert-block">
            <span className="alert-icon">📸</span>
            <p>Random check sẽ chụp ảnh trong {randomCountdown} giây. Giữ khuôn mặt trong khung hình.</p>
          </div>
        )}

        {lastVerification && (
          <div className="confidence-display">
            <span className="label">Độ tin cậy:</span>
            <span className="value">{(lastVerification.confidence * 100).toFixed(1)}%</span>
          </div>
        )}

        {/* Failure counter */}
        <div className={`failure-counter ${totalFailures > 0 ? 'warning' : ''}`}>
          <span className="label">Lỗi:</span>
          <span className="value">
            {totalFailures}/{MAX_FAILURES}
          </span>
        </div>

        {totalFailures >= MAX_FAILURES && (
          <div className="alert-block">
            <span className="alert-icon">⚠️</span>
            <p>Vượt quá số lần xác minh thất bại. Phiên thi sẽ kết thúc.</p>
          </div>
        )}

        {/* Verification log */}
        <div className="verification-log">
          <h4 className="log-title">Nhật Ký Xác Minh</h4>
          <div className="log-entries">
            {verificationLog.length === 0 ? (
              <p className="no-log">Chưa có xác minh</p>
            ) : (
              verificationLog.slice(-5).map((log, idx) => (
                <div key={idx} className={`log-entry ${log.passed ? 'pass' : 'fail'}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-status">{log.passed ? '✓' : '✗'}</span>
                  <span className="log-confidence">
                    {(log.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
