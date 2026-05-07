import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endExamSession } from '../api/examSessionApi'
import FaceVerification from './ui/FaceVerification'
import ExamProctor from './ui/ExamProctor'
import { useAuth } from '../context/AuthContext'
import { useExamSessionAlerts } from '../hooks/useExamSessionAlerts'
import { showConfirmDialog } from '../utils/confirmDialog'
import './TakeExamModal.css'

const verificationFlowCards = [
  {
    title: 'Verify ban đầu',
    text: 'AI so khớp mặt với embedding CCCD. Pass thì vào thi, fail 1-2 lần thì được thử lại, fail lần 3 sẽ chờ giám thị duyệt.',
    tone: 'success',
  },
  {
    title: 'Trong lúc thi',
    text: 'Hệ thống kiểm tra ngẫu nhiên theo chu kỳ. Pass thì giữ trạng thái đang thi, fail nhẹ chỉ ghi log và cảnh báo.',
    tone: 'warning',
  },
  {
    title: 'Đổi thiết bị / reconnect',
    text: 'Nếu quay lại bằng thiết bị cũ trong khoảng an toàn, hệ thống có thể cho vào lại; đổi thiết bị sẽ chờ giám thị duyệt.',
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
  const endSessionCalledRef = useRef(false)
  const stepRef = useRef(step)

  useEffect(() => {
    stepRef.current = step
  }, [step])

  const currentUserId = useMemo(() => user?.id ?? user?.userId ?? user?.sub ?? null, [user])

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

      if (alertType === 'VERIFY_SUCCESS') {
        setRealtimeNotice({
          variant: 'success',
          title: 'Xác minh thành công',
          message,
        })

        return
      }

      if (alertType === 'VERIFY_FAIL') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Xác minh thất bại',
          message,
        })

        return
      }

      if (alertType === 'DEVICE_CHANGED') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Đã phát hiện đổi thiết bị',
          message,
        })

        return
      }

      if (alertType === 'MULTIPLE_VERIFY_FAILED') {
        setRealtimeNotice({
          variant: 'danger',
          title: 'Nhiều lần xác minh thất bại',
          message,
        })

        return
      }

      if (alertType === 'MANUAL_REVIEW_REQUIRED' || alertType === 'SUSPICIOUS_ACTIVITY') {
        setRealtimeNotice({
          variant: 'warning',
          title: 'Cần giám thị kiểm tra',
          message,
        })

        return
      }

      if (alertType === 'SESSION_BLOCKED') {
        setRealtimeNotice({
          variant: 'danger',
          title: 'Phiên thi đã bị khóa',
          message,
        })

        void handleExamEnded({
          status: 'BLOCKED',
          message,
        })
        return
      }

      if (alertType === 'APPROVED') {
        setRealtimeNotice({
          variant: 'success',
          title: 'Phiên thi đã được duyệt',
          message,
        })

        setVerificationWaiting(false)

        if (stepRef.current === 'verification') {
          setStep('exam')
        }

        return
      }

      if (alertType === 'REJECTED') {
        setRealtimeNotice({
          variant: 'danger',
          title: 'Phiên thi bị từ chối',
          message,
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
          message,
        })
        return
      }

      if (alertType === 'UNFLAGGED') {
        setRealtimeNotice({
          variant: 'info',
          title: 'Phiên thi đã được bỏ cờ',
          message,
        })
        return
      }

      setRealtimeNotice({
        variant: 'info',
        title: 'Realtime update',
        message,
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

  const handleVerificationPending = (status) => {
    const nextStatus = String(status || 'PENDING_REVIEW').toUpperCase()
    setVerificationWaiting(true)
    setRealtimeNotice({
      variant: 'warning',
      title: 'Đang chờ giám thị duyệt',
      message:
        nextStatus === 'PENDING_DEVICE_APPROVAL'
          ? 'Thiết bị đã thay đổi. Vui lòng chờ giám thị phê duyệt để tiếp tục vào thi.'
          : 'Bạn đã được chuyển sang trạng thái chờ xử lý. Khi giám thị duyệt, hệ thống sẽ tự mở phiên thi.',
    })
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
                  Phòng thi: {roomInfo.roomCode || roomInfo.roomId}
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
              <span>Fail 3 lần rồi thì hệ thống đã khóa thử lại. Khi giám thị duyệt, phiên sẽ mở tự động.</span>
            </div>
          )}
          <FaceVerification
            examSessionId={examId}
            onVerified={handleVerificationSuccess}
            onFailed={handleVerificationFailed}
            onPending={handleVerificationPending}
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
