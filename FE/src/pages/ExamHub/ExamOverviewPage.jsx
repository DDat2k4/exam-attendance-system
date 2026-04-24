import { useEffect, useMemo, useState } from 'react'
import { getAllExams } from '../../api/examApi'
import { getMyExamRegistrations } from '../../api/examRegistrationApi'
import { getAllExamSessions } from '../../api/examSessionApi'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import '../../components/ExamHub/ExamHub.css'

const REGISTRATION_PAGE_SIZE = 10

export default function ExamOverviewPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionActivities, setSessionActivities] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [studentExams, setStudentExams] = useState([])

  const canViewExams = canAccess(user, {
    allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'],
    allowPermissions: ['EXAM_VIEW', 'EXAM_MANAGE'],
    match: 'any',
  })

  const canCreateExams = canAccess(user, {
    allowRoles: ['ADMIN'],
    allowPermissions: ['EXAM_CREATE', 'EXAM_MANAGE'],
    match: 'any',
  })

  const canManageRegistrations = canAccess(user, {
    allowRoles: ['ADMIN'],
    allowPermissions: ['EXAM_MANAGE'],
    match: 'any',
  })

  const canControlSessions = canAccess(user, {
    allowRoles: ['ADMIN', 'PROCTOR'],
    allowPermissions: ['EXAM_MANAGE', 'EXAM_SESSION_START', 'EXAM_SESSION_END'],
    match: 'any',
  })

  const canStudentTakeExam = canAccess(user, {
    allowRoles: ['STUDENT'],
  })

  const canCreateRooms = canAccess(user, {
    allowRoles: ['ADMIN', 'PROCTOR'],
    allowPermissions: ['ROOM_CREATE', 'EXAM_MANAGE'],
    match: 'any',
  })

  const roomRows = useMemo(
    () =>
      exams.flatMap((exam) =>
        (Array.isArray(exam.rooms) ? exam.rooms : []).map((room) => ({
          examId: exam.id,
          examTitle: exam.title,
          room,
          roomId: room.id ?? room.roomId,
        })),
      ),
    [exams],
  )

  const activeSessionCount = useMemo(
    () =>
      sessionActivities.filter((item) => {
        if (item?.status === 1) return true
        if (item?.status === 2) return false
        return String(item?.status || '').toUpperCase() === 'ACTIVE'
      }).length,
    [sessionActivities],
  )

  async function fetchExams() {
    try {
      setLoading(true)
      setError('')
      const items = await getAllExams()
      setExams(Array.isArray(items) ? items : [])
    } catch (err) {
      setError(err.message || 'Cannot load exams.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const items = await getAllExamSessions()
      setSessionActivities(Array.isArray(items) ? items.slice(0, 12) : [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách phiên thi.')
    }
  }

  const fetchRegistrations = async () => {
    try {
      const result = await getMyExamRegistrations({ page: 1, size: 100 })
      setRegistrations(Array.isArray(result?.content) ? result.content : [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đăng ký.')
    }
  }

  const fetchStudentExams = async () => {
    try {
      const result = await getMyExamRegistrations({ page: 1, size: REGISTRATION_PAGE_SIZE })
      setStudentExams(Array.isArray(result?.content) ? result.content : [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách kỳ thi.')
    }
  }

  useEffect(() => {
    if (canViewExams) {
      fetchExams()
    }
  }, [canViewExams])

  useEffect(() => {
    if (canControlSessions) {
      fetchSessions()
    }
  }, [canControlSessions])

  useEffect(() => {
    if (canManageRegistrations) {
      fetchRegistrations()
    }
  }, [canManageRegistrations])

  useEffect(() => {
    if (canStudentTakeExam) {
      fetchStudentExams()
    }
  }, [canStudentTakeExam])

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Trung tâm thi</h1>
          <p className="exam-subtitle">Bảng điều khiển tổng quan - Theo dõi toàn bộ hoạt động</p>
        </div>
        {canViewExams && (
          <button type="button" onClick={fetchExams} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        )}
      </header>

      <section className="hub-summary">
        <div className="summary-cards">
          <article className="summary-card">
            <h3>{exams.length}</h3>
            <p>Kỳ thi</p>
          </article>
          <article className="summary-card">
            <h3>{roomRows.length}</h3>
            <p>Phòng thi</p>
          </article>
          <article className="summary-card">
            <h3>{activeSessionCount}</h3>
            <p>Phiên đang hoạt động</p>
          </article>
          <article className="summary-card">
            <h3>{canStudentTakeExam ? studentExams.length : registrations.length}</h3>
            <p>{canStudentTakeExam ? 'Kỳ thi của tôi' : 'Bản ghi đăng ký'}</p>
          </article>
        </div>
      </section>

      {error && <p className="feedback error">{error}</p>}

      <section className="panel overview-panel">
        <div className="overview-head">
          <h2>Mục tiêu quản lý</h2>
          <p>Chọn một mục dưới đây để bắt đầu làm việc.</p>
        </div>

        <div className="overview-actions">
          {canCreateExams && (
            <a href="/exam-hub/exams" className="tiny-btn">
              Quản lý kỳ thi
            </a>
          )}
          {canManageRegistrations && (
            <a href="/exam-hub/registrations" className="tiny-btn">
              Đăng ký thí sinh
            </a>
          )}
          {canCreateRooms && (
            <a href="/exam-hub/rooms" className="tiny-btn">
              Quản lý phòng thi
            </a>
          )}
          {canStudentTakeExam && (
            <>
              <a href="/exam-hub/student-exams" className="tiny-btn">
                Kỳ thi của tôi
              </a>
              <a href="/exam-hub/verification" className="tiny-btn">
                Xác thực CCCD
              </a>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
