import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endExamSession, getExamSessionById } from '../api/examSessionApi'
import FaceVerification from './ui/FaceVerification'
import ExamProctor from './ui/ExamProctor'
import { useAuth } from '../context/AuthContext'
import { useExamSessionAlerts } from '../hooks/useExamSessionAlerts'
import { showConfirmDialog } from '../utils/confirmDialog'
import { isApprovedSessionStatus, normalizeSessionStatus, getSessionStatusLabel } from '../utils/examSessionStatus'
import './TakeExamModal.css'

const verificationFlowCards = [
  {
    title: 'Xác minh ban đầu',
    text: 'Hệ thống so khớp khuôn mặt với dữ liệu CCCD. Đạt thì vào thi, sai 1-2 lần vẫn được thử lại, sai lần 3 sẽ chuyển sang chờ giám thị duyệt.',
    tone: 'success',
  },
  {
    title: 'Trong lúc thi',
    text: 'Hệ thống kiểm tra ngẫu nhiên theo chu kỳ. Đạt thì tiếp tục làm bài, thất bại nhẹ chỉ ghi nhận log và cảnh báo.',
    tone: 'warning',
  },
  {
    title: 'Đổi thiết bị / reconnect',
    text: 'Nếu quay lại bằng thiết bị cũ trong khoảng an toàn, hệ thống có thể cho vào lại; nếu đổi thiết bị, phiên sẽ chờ giám thị duyệt.',
    tone: 'info',
  },
]

/**
 * Modal flow for exam taking:
 * 1. Show instructions
 * 2. Face verification (INITIAL)
 * 3. Exam proctor (if verification passed)
 */
export default function TakeExamModal({ examId, exam, roomInfo, onClose, onExamEnded }) {
  const { user } = useAuth()
  const [step, setStep] = useState('instructions') // instructions, verification, exam, ended
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [examResult, setExamResult] = useState(null)
  const [realtimeNotice, setRealtimeNotice] = useState(null)
  const [verificationWaiting, setVerificationWaiting] = useState(false)
  const [verificationClearedAt, setVerificationClearedAt] = useState(null)
  const [externalFailures, setExternalFailures] = useState(0)
  const endSessionCalledRef = useRef(false)
  const stepRef = useRef(step)

  useEffect(() => {
    stepRef.current = step
  }, [step])

  // Log step changes
  useEffect(() => {}, [step])

  const currentUserId = useMemo(() => user?.id ?? user?.userId ?? user?.sub ?? null, [user])

  const getPendingReviewNotice = useCallback((status, message) => {
    if (status === 'PENDING_DEVICE_APPROVAL') {
      return {
        variant: 'warning',
        title: 'Thiết bị đang chờ giám thị duyệt',
        message:
          message || 'Hệ thống đã phát hiện đổi thiết bị. Bạn vui lòng chờ giám thị phê duyệt để tiếp tục vào thi.',
      }
    }

    return {
      variant: 'warning',
      title: 'Đang chờ giám thị duyệt',
      message:
        message || 'Phiên thi đã được chuyển sang trạng thái chờ xử lý. Khi giám thị duyệt, hệ thống sẽ tự mở lại phiên thi.',
    }
  }, [])

  const handleExamEnded = useCallback(
    async (reason) => {
      const status = typeof reason === 'string' ? reason : reason?.status || 'SUBMITTED'

      try {
        if (!endSessionCalledRef.current && examId) {
          endSessionCalledRef.current = true
          await endExamSession(examId)
        }
        setExamResult({
          status,
          endSessionStatus: 'success',
          endSessionMessage: 'Đã chốt phiên thi thành công.',
        })
      } catch (err) {
        setExamResult({
          status,
          message: err?.message || 'Không thể kết thúc phiên thi trên hệ thống.',
          endSessionStatus: 'failed',
          endSessionMessage: err?.message || 'Chốt phiên thi thất bại. Vui lòng liên hệ giám thị.',
        })
      } finally {
        setStep('ended')
      }
    },
    [examId],
  )

  const handleSocketAlert = useCallback(
    (alert) => {
      const alertType = String(alert?.type || '').toUpperCase()
      const message = alert?.message || 'Có cập nhật mới từ giám thị.'
      const normalizedMessage = String(message || '').toLowerCase()
      
      const looksApproved =
        alertType === 'APPROVED' ||
        alertType === 'DEVICE_APPROVAL_ACCEPTED' ||
        alertType === 'PENDING_REVIEW_APPROVED' ||
        alertType === 'SESSION_RESUMED' ||
        normalizedMessage.includes('đã được duyệt') ||
        normalizedMessage.includes('đã được giám thị duyệt') ||
        normalizedMessage.includes('giám thị đã duyệt') ||
        normalizedMessage.includes('phê duyệt')
      const looksRejected =
        alertType === 'REJECTED' ||
        alertType === 'DEVICE_APPROVAL_REJECTED' ||
        alertType === 'PENDING_REVIEW_REJECTED' ||
        normalizedMessage.includes('bị từ chối') ||
        normalizedMessage.includes('giám thị đã từ chối') ||
        normalizedMessage.includes('rejected')

      if (looksApproved || looksRejected) {
        // fuzzy match check
      }

      if (alertType === 'PENDING_REVIEW' || alertType === 'PENDING_DEVICE_APPROVAL') {
        setVerificationWaiting(true)
        setRealtimeNotice(getPendingReviewNotice(alertType, message))

        // Also check current status in case it was already approved
        if (examId) {
          setTimeout(() => {
            getExamSessionById(examId)
              .then((session) => {
                const status = normalizeSessionStatus(
                  session?.examSessionStatus ?? session?.status ?? session ?? ''
                )
                if (isApprovedSessionStatus(status)) {
                  setVerificationWaiting(false)
                  setVerificationClearedAt(Date.now())
                  setRealtimeNotice({
                    variant: 'success',
                    title: 'Giám thị đã duyệt',
                    message: 'Giám thị đã duyệt phiên thi. Bắt đầu vào thi ngay bây giờ.',
                  })
                  if (stepRef.current === 'verification') {
                    setStep('exam')
                  }
                }
              })
              .catch(() => {})
          }, 500)
        }

        return
      }

      if (alertType === 'VERIFY_SUCCESS') {
        setRealtimeNotice({
          variant: 'success',
          title: 'Xác minh thành công',
          message: message || 'Hệ thống đã xác minh thành công khuôn mặt của bạn.',
        })

        return
      }

      if (alertType === 'VERIFY_FAIL') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Xác minh thất bại',
          message: message || 'Lần xác minh này chưa đạt. Bạn có thể thử lại nếu còn lượt.',
        })

        return
      }

      if (alertType === 'DEVICE_CHANGED') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Phát hiện đổi thiết bị',
          message: message || 'Hệ thống ghi nhận bạn đã đổi thiết bị. Phiên thi đang chờ giám thị xem xét.',
        })

        return
      }

      if (alertType === 'MULTIPLE_VERIFY_FAILED') {
        setRealtimeNotice({
          variant: 'danger',
          title: 'Nhiều lần xác minh thất bại',
          message: message || 'Bạn đã fail nhiều lần. Phiên thi đang được giám thị kiểm tra.',
        })

        return
      }

      if (alertType === 'MANUAL_REVIEW_REQUIRED' || alertType === 'SUSPICIOUS_ACTIVITY') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Cần giám thị kiểm tra',
          message: message || 'Phiên thi đang chờ giám thị xác minh trước khi tiếp tục.',
        })

        return
      }

      if (alertType === 'SESSION_BLOCKED') {
        setRealtimeNotice({
          variant: 'danger',
          title: 'Phiên thi đã bị khóa',
          message: message || 'Phiên thi đã bị khóa và không thể tiếp tục.',
        })

        void handleExamEnded({
          status: 'BLOCKED',
          message,
        })
        return
      }

      if (looksApproved) {
        // approval detected
        setVerificationWaiting(false)
        setVerificationClearedAt(Date.now())
        setRealtimeNotice({
          variant: 'success',
          title: 'Giám thị đã duyệt',
          message: 'Giám thị đã duyệt phiên thi. Bắt đầu vào thi ngay bây giờ.',
        })
        
        if (stepRef.current === 'verification') {
          setStep('exam')
        }
        
        // Cũng fetch status để log
        if (examId) {
          getExamSessionById(examId).catch(() => {})
        }
        return
      }

      if (looksRejected) {
        setRealtimeNotice({
          variant: 'danger',
          title: 'Giám thị đã từ chối',
          message: message || 'Phiên thi bị từ chối. Vui lòng liên hệ giám thị để được hướng dẫn tiếp theo.',
        })

        void handleExamEnded({
          status: 'PROCTOR_REJECTED',
          message,
        })
        return
      }

      if (alertType === 'FLAGGED') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Phiên thi bị gắn cờ',
          message: message || 'Giám thị đã gắn cờ phiên thi để theo dõi.',
        })
        return
      }

      if (alertType === 'UNFLAGGED') {
        setRealtimeNotice({
          variant: 'info',
          title: 'Phiên thi đã được bỏ cờ',
          message: message || 'Giám thị đã bỏ cờ cho phiên thi này.',
        })
        return
      }

      // unknown alert type
      setRealtimeNotice({
        variant: 'info',
        title: 'Cập nhật realtime',
        message: message || 'Có cập nhật mới từ hệ thống giám sát.',
      })
    },
    [handleExamEnded],
  )

  const { socketStatus } = useExamSessionAlerts({
    sessionId: examId,
    roomId: roomInfo?.roomId,
    userId: currentUserId,
    enabled: step !== 'ended',
    onAlert: handleSocketAlert,
  })

  // Socket status changes (noisy logs removed)
  useEffect(() => {}, [socketStatus])

  useEffect(() => {}, [verificationWaiting, examId, step])

  useEffect(() => {}, [externalFailures])

  // Poll session status while waiting for proctor approval — auto transition if approved
  useEffect(() => {
    if (!verificationWaiting || !examId) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const session = await getExamSessionById(examId)
        const sessionStatus = normalizeSessionStatus(session?.examSessionStatus)

        // If proctor approved (status changed to CHECKED_IN/IN_PROGRESS), auto transition to exam
        if (isApprovedSessionStatus(sessionStatus)) {
          setVerificationWaiting(false)
          setVerificationClearedAt(Date.now())
          setRealtimeNotice({
            variant: 'success',
            title: 'Giám thị đã duyệt',
            message: 'Giám thị đã duyệt phiên thi. Bắt đầu vào thi ngay bây giờ.',
          })
          if (stepRef.current === 'verification') {
            setStep('exam')
          }
        }
      } catch (err) {
        console.error('Error polling approval status:', err.message)
      }
    }, 1000) // Poll every 1 second
    return () => {
      clearInterval(pollInterval)
    }
  }, [verificationWaiting, examId])

  const handleStartVerification = () => {
    setRealtimeNotice(null)
    setVerificationWaiting(false)
    setStep('verification')
  }

  const handleVerificationSuccess = (result) => {
    setVerificationWaiting(false)
    setExamResult({ status: 'VERIFIED', message: 'Xác minh khuôn mặt thành công', result })
    setStep('exam')
  }

  const handleVerificationPending = (status, attempt) => {
    const nextStatus = String(status || 'PENDING_REVIEW').toUpperCase()
    setVerificationWaiting(true)
    setRealtimeNotice(getPendingReviewNotice(nextStatus))

    // Sync external failure count from FaceVerification if provided
    if (typeof attempt === 'number') {
      setExternalFailures(attempt)
    } else {
      setExternalFailures((prev) => Math.min(prev + 1, 3))
    }

    // Also do a quick status check to ensure we sync with backend
    if (examId) {
      setTimeout(() => {
        getExamSessionById(examId)
          .then((session) => {
            const sessionStatus = normalizeSessionStatus(session?.examSessionStatus)
            // quick check - no auto-approve
          })
          .catch(() => {})
      }, 500)
    }
  }

  const handleVerificationFailed = (reason = 'Xác minh khuôn mặt thất bại') => {
    setStep('ended')
    setExamResult({ status: 'VERIFICATION_FAILED', message: reason })
  }

  const handleClose = async () => {
    if (step === 'instructions' || step === 'ended') {
      onClose?.()
      onExamEnded?.(examResult)
    } else if (
      await showConfirmDialog('Bạn có chắc muốn thoát khỏi kỳ thi? Hành động này không thể hoàn tác.', {
        title: 'Xác nhận thoát kỳ thi',
        confirmText: 'Thoát',
        cancelText: 'Ở lại',
        danger: true,
      })
    ) {
      onClose?.()
    }
  }

  return (
    <div className="take-exam-modal-overlay">
      {step === 'instructions' && (
        <div className="take-exam-modal">
          <div className="modal-header">
            <h2>Chuẩn Bị Thi Trực Tuyến</h2>
            <span className={`socket-status socket-status--${socketStatus.toLowerCase()}`}>
              {socketStatus === 'CONNECTED'
                ? 'Realtime: đã kết nối'
                : socketStatus === 'CONNECTING'
                  ? 'Realtime: đang kết nối'
                  : socketStatus === 'ERROR'
                    ? 'Realtime: lỗi kết nối'
                    : 'Realtime: chờ kết nối'}
            </span>
            <button className="modal-close" onClick={handleClose}>
              ×
            </button>
          </div>

            <div className="modal-content">
            {realtimeNotice && (
              <div className={`realtime-notice realtime-notice--${realtimeNotice.variant}`}>
                <strong>{realtimeNotice.title}</strong>
                <span>{realtimeNotice.message}</span>
              </div>
            )}

              <div className="exam-info">
              <h3>{exam?.title || 'Kỳ Thi'}</h3>
              {exam?.description && <p className="description">{exam.description}</p>}
              {roomInfo?.roomId && (
                <p className="description">
                  Phòng thi: {roomInfo.roomName || roomInfo.roomCode || roomInfo.roomId}
                  {roomInfo.seatNumber != null ? ` · Ghế ${roomInfo.seatNumber}` : ''}
                </p>
              )}
            </div>

            <div className="verification-flow">
              {verificationFlowCards.map((card) => (
                <article key={card.title} className={`verification-flow__card verification-flow__card--${card.tone}`}>
                  <h4>{card.title}</h4>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>

            <div className="instructions">
              <h4>Chuẩn bị trước khi bắt đầu</h4>
              <ul>
                <li>Chuẩn bị không gian yên tĩnh, đủ sáng và có camera rõ mặt.</li>
                <li>Dùng máy tính hoặc laptop, hạn chế đổi thiết bị trong lúc thi.</li>
                <li>Nếu mất kết nối hoặc quay lại phiên thi, hệ thống sẽ ưu tiên reconnect an toàn trước khi chấp nhận verify mới.</li>
                <li>Fail 3 lần ở bước xác minh sẽ chuyển sang trạng thái chờ giám thị duyệt.</li>
              </ul>
            </div>

            <div className="warnings">
              <h4>Quy tắc xử lý</h4>
              <ul>
                <li>Fail 1-2 lần: không block, chỉ lưu ảnh và cho thử lại.</li>
                <li>Fail lần 3: chuyển chờ giám thị duyệt.</li>
                <li>Đổi thiết bị: chuyển chờ duyệt thiết bị.</li>
                <li>Giám thị có thể approve, reject hoặc bỏ cờ từ dashboard.</li>
              </ul>
            </div>

            <div className="confirmation">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                />
                <span>Tôi đã đọc và đồng ý với các quy định trên</span>
              </label>
            </div>

            <div className="button-group">
              <button
                className="btn-start"
                onClick={handleStartVerification}
                disabled={!isConfirmed}
              >
                Bắt Đầu Xác Minh
              </button>
              <button className="btn-cancel" onClick={handleClose}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'verification' && (
        <>
          {verificationWaiting && (
            <div className="realtime-notice realtime-notice--warning" style={{ marginBottom: '12px' }}>
              <strong>Đang chờ giám thị duyệt</strong>
              <span>Phiên thi đã tạm dừng để chờ giám thị xác nhận. Khi được duyệt, hệ thống sẽ tự mở lại phiên thi.</span>
            </div>
          )}
          <FaceVerification
            examSessionId={examId}
            onVerified={handleVerificationSuccess}
            onFailed={handleVerificationFailed}
            onPending={handleVerificationPending}
            onAttempt={(attempt) => {
                if (typeof attempt === 'number') {
                  setExternalFailures(attempt)
                }
              }}
            onClose={handleClose}
          />
        </>
      )}

      {step === 'exam' && (
        <div className="exam-fullscreen">
          {realtimeNotice && (
            <div className={`realtime-notice realtime-notice--${realtimeNotice.variant}`}>
              <strong>{realtimeNotice.title}</strong>
              <span>{realtimeNotice.message}</span>
            </div>
          )}

          <ExamProctor
            examSessionId={examId}
            onSessionEnd={handleExamEnded}
            questions={exam?.questions}
            verificationWaiting={verificationWaiting}
            verificationClearedAt={verificationClearedAt}
            externalFailures={externalFailures}
          />
        </div>
      )}

      {step === 'ended' && (
        <div className="take-exam-modal">
          <div className="modal-header">
            <h2>Kỳ Thi Kết Thúc</h2>
          </div>

          <div className="modal-content">
            {realtimeNotice && (
              <div className={`realtime-notice realtime-notice--${realtimeNotice.variant}`}>
                <strong>{realtimeNotice.title}</strong>
                <span>{realtimeNotice.message}</span>
              </div>
            )}

            {examResult?.endSessionMessage && (
              <div className={`session-end-notice ${examResult?.endSessionStatus === 'failed' ? 'failed' : 'success'}`}>
                {examResult.endSessionMessage}
              </div>
            )}

            <div className="result-section">
              {examResult?.status === 'VERIFICATION_FAILED' && (
                <>
                  <div className="result-icon failed">✗</div>
                  <h3>Xác Minh Thất Bại</h3>
                  <p>{examResult?.message || 'Không thể xác minh danh tính của bạn. Vui lòng thử lại.'}</p>
                </>
              )}

              {examResult?.status === 'TIME_UP' && (
                <>
                  <div className="result-icon success">✓</div>
                  <h3>Hết Thời Gian</h3>
                  <p>Kỳ thi của bạn đã kết thúc. Bài thi đã được nộp tự động.</p>
                </>
              )}

              {examResult?.status === 'SUBMITTED' && (
                <>
                  <div className="result-icon success">✓</div>
                  <h3>Nộp Bài Thành Công</h3>
                  <p>Bài thi của bạn đã được nộp. Cảm ơn bạn đã tham gia!</p>
                </>
              )}

              {examResult?.status === 'VERIFICATION_FAILED_EXAM' && (
                <>
                  <div className="result-icon failed">✗</div>
                  <h3>Phiên Thi Bị Hủy</h3>
                  <p>Xác minh khuôn mặt thất bại quá nhiều lần. Phiên thi được kết thúc.</p>
                </>
              )}
            </div>

            <div className="button-group">
              <button className="btn-close" onClick={handleClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
