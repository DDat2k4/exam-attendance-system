import { useEffect, useState, useCallback } from 'react'
import { getExamById } from '../../api/examApi'
import { getMyExamRegistrations } from '../../api/examRegistrationApi'
import { startExamSession, getMyExamSessions, getMyRoomInfo } from '../../api/examSessionApi'
import StudentSection from '../../components/ExamHub/StudentSection'
import TakeExamModal from '../../components/TakeExamModal'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import { getDeviceInfo } from '../../utils/faceCapture'
import '../../components/ExamHub/ExamHub.css'

const REGISTRATION_PAGE_SIZE = 10

export default function StudentExamsPage() {
  const { user } = useAuth()
  const [studentRegisteredExams, setStudentRegisteredExams] = useState([])
  const [loadingStudentExams, setLoadingStudentExams] = useState(false)
  const [studentExamPage, setStudentExamPage] = useState(1)
  const [studentExamTotalPages, setStudentExamTotalPages] = useState(0)
  const [takingExamId, setTakingExamId] = useState(null)
  const [activeTakeExam, setActiveTakeExam] = useState(null)
  const [myRoomInfo, setMyRoomInfo] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canStudentTakeExam = canAccess(user, {
    allowRoles: ['STUDENT'],
  })

  const formatDateTime = (raw) => {
    if (!raw) return '-'
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return raw
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const loadMyRoomInfo = useCallback(async () => {
    if (!canStudentTakeExam) return

    try {
      const room = await getMyRoomInfo()
      setMyRoomInfo(room || null)
      return room || null
    } catch {
      setMyRoomInfo(null)
      return null
    }
  }, [canStudentTakeExam])

  const fetchStudentRegisteredExams = useCallback(async (page = 1) => {
    if (!canStudentTakeExam) return

    try {
      setLoadingStudentExams(true)
      const result = await getMyExamRegistrations({ page, size: REGISTRATION_PAGE_SIZE })
      const registrations = Array.isArray(result?.content) ? result.content : []

      // Fetch sessions to determine completion status and get session IDs
      let sessionMap = {}
      try {
        const sessions = await getMyExamSessions()
        const sessionsList = Array.isArray(sessions) ? sessions : []
        sessionMap = sessionsList.reduce((acc, session) => {
          if (session?.examId) {
            const currentData = acc[session.examId]
            const newStatus = session.status
            // Prioritize DONE and BLOCKED status - don't override them with other statuses
            if (currentData?.status === 'DONE' || currentData?.status === 'BLOCKED') {
              return acc
            }
            acc[session.examId] = { status: newStatus, id: session.id }
          }
          return acc
        }, {})
      } catch {
        // Silently fail if sessions can't be fetched
      }

      const enriched = await Promise.all(
        registrations.map(async (reg) => {
          try {
            const exam = await getExamById(reg.examId)
            return { 
              ...reg, 
              exam, 
              sessionStatus: sessionMap[reg.examId]?.status || null,
              existingSessionId: sessionMap[reg.examId]?.id || null,
            }
          } catch {
            return {
              ...reg,
              exam: {
                id: reg.examId,
                title: `Kỳ thi #${reg.examId}`,
              },
              sessionStatus: sessionMap[reg.examId]?.status || null,
              existingSessionId: sessionMap[reg.examId]?.id || null,
            }
          }
        }),
      )

      setStudentRegisteredExams(enriched)
      setStudentExamPage(Number(result?.number ?? page - 1) + 1)
      setStudentExamTotalPages(Number(result?.totalPages ?? 0))
      await loadMyRoomInfo()
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách kỳ thi đã đăng ký.')
    } finally {
      setLoadingStudentExams(false)
    }
  }, [canStudentTakeExam, loadMyRoomInfo])

  const handleTakeExam = async (registrationRow) => {
    setError('')
    setSuccess('')

    try {
      const examId = Number(registrationRow?.examId ?? registrationRow?.exam?.id)
      if (!examId) {
        throw new Error('Không xác định được examId để vào thi.')
      }

      setTakingExamId(examId)

      const roomInfo = await loadMyRoomInfo()
      const assignedExamId = Number(roomInfo?.examId)
      if (!roomInfo?.roomId) {
        throw new Error('Bạn chưa được gán phòng thi. Vui lòng liên hệ ADMIN.')
      }
      if (assignedExamId && assignedExamId !== examId) {
        throw new Error(`Phòng thi được gán không khớp với kỳ thi #${examId}. Vui lòng kiểm tra lại.`)
      }
      
      // If session already exists and is still ongoing (STARTED/CHECKED_IN), use existing session
      const existingSessionId = registrationRow?.existingSessionId
      const sessionStatus = registrationRow?.sessionStatus
      
      let sessionId
      if (existingSessionId && (sessionStatus === 'IN_PROGRESS' || sessionStatus === 'CHECKED_IN')) {
        // Use existing session, don't start a new one
        sessionId = existingSessionId
        setSuccess(`Tiếp tục phiên thi #${sessionId}.`)
      } else {
        // Start a new session
        const deviceInfo = getDeviceInfo()
        const session = await startExamSession({
          examId,
          deviceId: String(deviceInfo.deviceId || '').trim(),
        })

        sessionId = session?.id ?? session?.sessionId
        if (!sessionId) {
          throw new Error('Không lấy được sessionId để vào thi.')
        }
        setSuccess(
          roomInfo?.roomCode
            ? `Đã bắt đầu phiên thi #${sessionId} tại phòng ${roomInfo.roomCode}.`
            : `Đã bắt đầu phiên thi #${sessionId}.`,
        )
      }

      setActiveTakeExam({
        sessionId: Number(sessionId),
        exam: registrationRow?.exam ?? { id: examId, title: `Kỳ thi #${examId}` },
        roomInfo,
      })
    } catch (err) {
      setError(err.message || 'Không thể bắt đầu vào thi.')
    } finally {
      setTakingExamId(null)
    }
  }

  const closeTakeExamModal = () => {
    setActiveTakeExam(null)
  }

  useEffect(() => {
    if (canStudentTakeExam) {
      fetchStudentRegisteredExams()
    }
  }, [canStudentTakeExam, fetchStudentRegisteredExams])

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Kỳ thi của tôi</h1>
          <p className="exam-subtitle">Xem danh sách kỳ thi đã đăng ký và vào thi</p>
        </div>
        <button type="button" onClick={() => fetchStudentRegisteredExams(studentExamPage)} disabled={loadingStudentExams}>
          {loadingStudentExams ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      {error && <p className="feedback error">{error}</p>}
      {success && <p className="feedback success">{success}</p>}

      <StudentSection
        studentExamPage={studentExamPage}
        fetchStudentRegisteredExams={fetchStudentRegisteredExams}
        loadingStudentExams={loadingStudentExams}
        studentRegisteredExams={studentRegisteredExams}
        formatDateTime={formatDateTime}
        handleTakeExam={handleTakeExam}
        takingExamId={takingExamId}
        studentExamTotalPages={studentExamTotalPages}
        myRoomInfo={myRoomInfo}
      />

      {activeTakeExam && (
        <TakeExamModal
          examId={activeTakeExam.sessionId}
          exam={activeTakeExam.exam}
          roomInfo={activeTakeExam.roomInfo}
          onClose={closeTakeExamModal}
          onExamEnded={() => {
            fetchStudentRegisteredExams(studentExamPage)
          }}
        />
      )}
    </div>
  )
}
