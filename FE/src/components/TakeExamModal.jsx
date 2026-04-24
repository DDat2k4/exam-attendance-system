import { useRef, useState } from 'react'
import { endExamSession } from '../api/examSessionApi'
import FaceVerification from './ui/FaceVerification'
import ExamProctor from './ui/ExamProctor'
import { showConfirmDialog } from '../utils/confirmDialog'
import './TakeExamModal.css'

/**
 * Modal flow for exam taking:
 * 1. Show instructions
 * 2. Face verification (INITIAL)
 * 3. Exam proctor (if verification passed)
 */
export default function TakeExamModal({ examId, exam, onClose, onExamEnded }) {
  const [step, setStep] = useState('instructions') // instructions, verification, exam, ended
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [examResult, setExamResult] = useState(null)
  const endSessionCalledRef = useRef(false)

  const handleStartVerification = () => {
    setStep('verification')
  }

  const handleVerificationSuccess = (result) => {
    setExamResult({ status: 'VERIFIED', message: 'Xác minh khuôn mặt thành công', result })
    setStep('exam')
  }

  const handleVerificationFailed = (reason = 'Xác minh khuôn mặt thất bại') => {
    setStep('ended')
    setExamResult({ status: 'VERIFICATION_FAILED', message: reason })
  }

  const handleExamEnded = async (reason) => {
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
            <button className="modal-close" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="modal-content">
            <div className="exam-info">
              <h3>{exam?.title || 'Kỳ Thi'}</h3>
              {exam?.description && <p className="description">{exam.description}</p>}
            </div>

            <div className="instructions">
              <h4>📋 Hướng Dẫn:</h4>
              <ul>
                <li>✓ Hãy chuẩn bị một nơi yên tĩnh, thoáng đãng</li>
                <li>✓ Kết nối internet ổn định (không sử dụng mạng di động)</li>
                <li>✓ Sử dụng như máy tính (không dùng điện thoại)</li>
                <li>✓ Bật camera theo yêu cầu xác minh</li>
                <li>✓ Đảm bảo ánh sáng đủ sáng để nhận diện khuôn mặt</li>
                <li>✓ Không được tắt camera trong suốt quá trình thi</li>
              </ul>
            </div>

            <div className="warnings">
              <h4>⚠️ Quy Định Kỷ Luật:</h4>
              <ul>
                <li>• Xác minh khuôn mặt không thành công → Không được vào thi</li>
                <li>• Thất bại xác minh trên 2 lần trong thi → BỊ HỦY BÀI</li>
                <li>• Thay đổi thiết bị trong quá trình thi → Phiên bị đánh dấu</li>
                <li>• Tắt camera hoặc từ chối xác minh → Phiên bị kết thúc</li>
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
        <FaceVerification
          examSessionId={examId}
          onVerified={handleVerificationSuccess}
          onFailed={handleVerificationFailed}
          onClose={handleClose}
        />
      )}

      {step === 'exam' && (
        <div className="exam-fullscreen">
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
