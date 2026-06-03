import { useEffect, useMemo, useState, useCallback } from 'react'
import { getExamById } from '../../api/examApi'
import { getMyExamRegistrations } from '../../api/examRegistrationApi'
import { initExamSession, getMyExamSessions, getMyRoomInfo } from '../../api/examSessionApi'
import StudentSection from '../../components/ExamHub/StudentSection'
import TakeExamModal from '../../components/TakeExamModal'
import { useAuth } from '../../context/AuthContext'
import { formatExamLabel } from '../../utils/examLabel'
import { canAccess } from '../../utils/rbac'
import { getDeviceInfo } from '../../utils/faceCapture'
import '../../components/ExamHub/ExamHub.css'

const REGISTRATION_PAGE_SIZE = 10

function StudentExamsPage() {
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
  const [examSearch, setExamSearch] = useState('')

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

  const filteredStudentRegisteredExams = useMemo(() => {
    const keyword = examSearch.trim().toLowerCase()
    if (!keyword) return studentRegisteredExams

    const numericExamId = Number(keyword)
    const isNumeric = Number.isInteger(numericExamId) && String(numericExamId) === keyword

    return studentRegisteredExams.filter((item) => {
      const examTitle = String(formatExamLabel(item?.exam) || '').toLowerCase()
      const examId = Number(item?.examId ?? item?.exam?.id)
      const examCode = String(item?.exam?.examCode || '').toLowerCase()
      const semester = String(item?.exam?.semester || '').toLowerCase()

      if (isNumeric) {
        return examId === numericExamId
      }

      return examTitle.includes(keyword) || examCode.includes(keyword) || semester.includes(keyword)
    })
  }, [examSearch, studentRegisteredExams])

  const loadMyRoomInfo = useCallback(async (examId) => {
    if (!canStudentTakeExam || !examId) return

    try {
      const room = await getMyRoomInfo(examId)
      setMyRoomInfo(room || null)
      return room || null
    } catch (err) {
      setMyRoomInfo(null)
      // Rethrow so callers (e.g. handleTakeExam) can show backend message
      throw err
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
                title: `Kỳ thi ${reg.examId}`,
                  examCode: '',
                  semester: '',
              },
              sessionStatus: sessionMap[reg.examId]?.status || null,
              existingSessionId: sessionMap[reg.examId]?.id || null,
            }
          }
        }),
      )

      // Fetch assigned room info for each registration so UI can display it immediately
      const withRooms = await Promise.all(
        enriched.map(async (item) => {
          try {
            const room = await getMyRoomInfo(item.examId)
            return { ...item, roomInfo: room || null }
          } catch (err) {
            return { ...item, roomInfo: null, roomError: (err && err.message) || 'Không thể lấy thông tin phòng' }
          }
        }),
      )

      setStudentRegisteredExams(withRooms)
      // set a generic myRoomInfo to the first assigned room (if any) for backwards compatibility
      const firstAssigned = withRooms.find((r) => r.roomInfo && r.roomInfo.roomId)
      setMyRoomInfo(firstAssigned?.roomInfo ?? null)
      setStudentExamPage(Number(result?.number ?? page - 1) + 1)
      setStudentExamTotalPages(Number(result?.totalPages ?? 0))
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách kỳ thi đã đăng ký.')
    } finally {
      setLoadingStudentExams(false)
    }
  }, [canStudentTakeExam])

  const handleTakeExam = async (registrationRow) => {
    setError('')
    setSuccess('')
    let examId = null

    try {
      examId = Number(registrationRow?.examId ?? registrationRow?.exam?.id)
      if (!examId) {
        throw new Error('Không xác định được examId để vào thi.')
      }

      setTakingExamId(examId)

      // Prevent duplicate concurrent starts for the same exam (synchronous guard)
      if (!handleTakeExam.starting) handleTakeExam.starting = new Set()
      if (handleTakeExam.starting.has(examId)) {
        // already starting this exam elsewhere
        return
      }
      handleTakeExam.starting.add(examId)

      const roomInfo = await loadMyRoomInfo(examId)
      const assignedExamId = Number(roomInfo?.examId)
      if (registrationRow?.roomError) {
        throw new Error(registrationRow.roomError)
      }
      if (assignedExamId && assignedExamId !== examId) {
        throw new Error(`Phòng thi được gán không khớp với kỳ thi ${examId}. Vui lòng kiểm tra lại.`)
      }
      
      // If a session already exists for this exam, reuse it instead of creating a duplicate.
      const existingSessionId = registrationRow?.existingSessionId
      const sessionStatus = registrationRow?.sessionStatus
      
      let sessionId
      if (existingSessionId) {
        sessionId = existingSessionId
        if (sessionStatus === 'IN_PROGRESS') {
          setSuccess(`Tiếp tục phiên thi ${sessionId}.`)
        } else if (sessionStatus === 'CHECKED_IN') {
          setSuccess(`Phiên thi ${sessionId} đã điểm danh. Hãy xác minh khuôn mặt để đủ điều kiện vào thi.`)
        } else {
          setSuccess(`Đã mở phiên thi ${sessionId}. Chờ giám thị điểm danh ngoài phòng thi trước khi xác minh khuôn mặt.`)
        }
      } else {
        // Start a new session
        const deviceInfo = getDeviceInfo()
        const session = await initExamSession({
          examId,
          deviceId: String(deviceInfo.deviceId || '').trim(),
        })

        sessionId = session?.id ?? session?.sessionId
        if (!sessionId) {
          throw new Error('Không lấy được sessionId để vào thi.')
        }
        setSuccess(
          roomInfo?.roomCode
            ? `Đã khởi tạo phiên thi ${sessionId} tại phòng ${roomInfo.roomCode}. Chờ giám thị điểm danh ngoài phòng thi.`
            : `Đã khởi tạo phiên thi ${sessionId}. Chờ giám thị điểm danh ngoài phòng thi.`,
        )
      }

      setActiveTakeExam({
        sessionId: Number(sessionId),
        exam: registrationRow?.exam ?? { id: examId, title: `Kỳ thi ${examId}` },
        roomInfo,
        sessionStatus,
      })
    } catch (err) {
      setError(err.message || 'Không thể bắt đầu vào thi.')
      } finally {
        handleTakeExam.starting.delete(examId)
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
        filteredStudentRegisteredExams={filteredStudentRegisteredExams}
        formatDateTime={formatDateTime}
        handleTakeExam={handleTakeExam}
        takingExamId={takingExamId}
        studentExamTotalPages={studentExamTotalPages}
        examSearch={examSearch}
        setExamSearch={setExamSearch}
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

export { StudentExamsPage }
export default StudentExamsPage
