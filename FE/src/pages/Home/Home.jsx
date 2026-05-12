import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllExams } from '../../api/examApi'
import { getMyExamRegistrations } from '../../api/examRegistrationApi'
import { getAllExamSessions, getMyExamSessions } from '../../api/examSessionApi'
import { getUsers } from '../../api/userApi'
import { getMyUserProfile, getUserProfile } from '../../api/userProfileApi'
import { getUserFromToken } from '../../utils/jwt'
import { useAuth } from '../../context/AuthContext'
import { canAccess, getRoleCodes } from '../../utils/rbac'
import './Home.css'

const DASHBOARD_BY_ROLE = {
  ADMIN: {
    heading: 'Hệ thống quản lý kỳ thi',
    lead: 'Theo dõi số liệu vận hành theo thời gian thực.',
    kpis: [
      { key: 'examsTotal', label: 'Kỳ thi' },
      { key: 'roomsTotal', label: 'Phòng thi' },
      { key: 'activeSessions', label: 'Phiên đang hoạt động' },
      { key: 'usersTotal', label: 'Người dùng' },
    ],
    timeline: [
      'Hôm nay 08:00 - Kích hoạt ca thi sáng',
      'Hôm nay 14:00 - Bắt đầu ca thi chiều',
    ],
    focus: 'Ưu tiên: Theo dõi các phiên có cảnh báo',
  },
  PROCTOR: {
    heading: 'Quản lý phòng thi',
    lead: 'Giám sát phiên thi, cảnh báo và tiến độ xác minh.',
    kpis: [
      { key: 'activeSessions', label: 'Phiên đang hoạt động' },
      { key: 'flaggedSessions', label: 'Phiên gắn cờ' },
      { key: 'pendingSessions', label: 'Chờ duyệt' },
      { key: 'sessionsTotal', label: 'Tổng phiên thi' },
    ],
    timeline: [
      'Hôm nay 08:00 - Mở phòng B203',
      'Hôm nay 12:00 - Kiểm tra hoàn tất',
    ],
    focus: 'Ưu tiên: Xác thực các sinh viên đợi',
  },
  STUDENT: {
    heading: 'Lịch thi của bạn',
    lead: 'Xem đăng ký, phiên thi và trạng thái hồ sơ của bạn.',
    kpis: [
      { key: 'registrationsTotal', label: 'Kỳ thi đã đăng ký' },
      { key: 'mySessionsTotal', label: 'Phiên thi của tôi' },
      { key: 'verification', label: 'Trạng thái hồ sơ' },
      { key: 'readiness', label: 'Sẵn sàng vào phòng' },
    ],
    timeline: [
      'Ngày mai 08:45 - Mở cửa kỳ thi',
      'Ngày mai 09:00 - Bắt đầu',
    ],
    focus: 'Chuẩn bị: Kiểm tra camera, CCCD',
  },
}

const ACTIVE_ROLE_ORDER = ['ADMIN', 'PROCTOR', 'STUDENT']

const HOME_ACTIONS = [
  {
    key: 'exam-hub',
    label: 'Trung tâm thi',
    to: '/exams',
    allowRoles: ['ADMIN', 'PROCTOR'],
    allowPermissions: ['EXAM_VIEW', 'EXAM_MANAGE', 'ROOM_CREATE', 'EXAM_CREATE'],
    match: 'any',
  },
  {
    key: 'profile',
    label: 'Thông tin cá nhân',
    to: '/profiles',
    allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'],
  },
]

export default function Home() {
  const { user } = useAuth()
  const [verificationKpi, setVerificationKpi] = useState({ value: '...', label: 'Đang kiểm tra' })
  const [dashboardStats, setDashboardStats] = useState({
    examsTotal: '—',
    roomsTotal: '—',
    activeSessions: '—',
    flaggedSessions: '—',
    pendingSessions: '—',
    sessionsTotal: '—',
    usersTotal: '—',
    registrationsTotal: '—',
    mySessionsTotal: '—',
  })
  const roles = getRoleCodes(user)
  const activeRole = ACTIVE_ROLE_ORDER.find((role) => roles.includes(role)) || 'STUDENT'
  const canStudentTakeExam = canAccess(user, {
    allowRoles: ['STUDENT'],
  })

  const isActiveSession = (session) => {
    if (session?.status === 1) return true
    if (session?.status === 2) return false
    return String(session?.status || '').toUpperCase() === 'ACTIVE'
  }

  const isPendingSession = (session) => {
    const status = String(session?.status || '').toUpperCase()
    return status === 'PENDING_REVIEW' || status === 'PENDING_DEVICE_APPROVAL' || Boolean(session?.pending)
  }

  const formatCount = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '—'
    }
    return Number(value).toLocaleString('vi-VN')
  }

  useEffect(() => {
    if (activeRole !== 'STUDENT') return

    let cancelled = false

    const loadVerificationStatus = async () => {
      try {
        const profile = await getMyUserProfile()
        if (cancelled) return

        if (profile?.id) {
          localStorage.setItem('profileId', String(profile.id))
        }

        if (profile?.isVerified === true) {
          setVerificationKpi({ value: '✓', label: 'Đã xác minh' })
          return
        }

        if (profile?.isVerified === false) {
          setVerificationKpi({ value: '!', label: 'Chưa xác minh' })
          return
        }

        setVerificationKpi({ value: '-', label: 'Chưa xác minh' })
      } catch (err) {
        if (cancelled) return
        if (err?.response?.status === 404) {
          const tokenUser = getUserFromToken()
          const profileIdRaw =
            tokenUser?.profileId ??
            tokenUser?.id ??
            tokenUser?.userId ??
            localStorage.getItem('profileId')
          const profileId = Number(profileIdRaw)

          if (!profileId) {
            setVerificationKpi({ value: '-', label: 'Chưa có hồ sơ' })
            return
          }

          try {
            const legacyProfile = await getUserProfile(profileId)
            if (cancelled) return

            if (legacyProfile?.isVerified === true) {
              setVerificationKpi({ value: '✓', label: 'Đã xác minh' })
              return
            }

            if (legacyProfile?.isVerified === false) {
              setVerificationKpi({ value: '!', label: 'Chưa xác minh' })
              return
            }

            setVerificationKpi({ value: '-', label: 'Chưa xác minh' })
            return
          } catch (legacyErr) {
            if (legacyErr?.response?.status === 404) {
              setVerificationKpi({ value: '-', label: 'Chưa có hồ sơ' })
              return
            }
            throw legacyErr
          }
        }
        setVerificationKpi({ value: '?', label: 'Lỗi xác minh' })
      }
    }

    loadVerificationStatus()

    return () => {
      cancelled = true
    }
  }, [activeRole])

  useEffect(() => {
    let cancelled = false

    const loadCommonStats = async () => {
      try {
        const [examsRes, sessionsRes, usersRes] = await Promise.allSettled([
          getAllExams(),
          getAllExamSessions(),
          getUsers({ page: 1, limit: 1 }),
        ])

        if (cancelled) return

        const exams = examsRes.status === 'fulfilled' && Array.isArray(examsRes.value) ? examsRes.value : []
        const sessions = sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value) ? sessionsRes.value : []
        const usersPayload = usersRes.status === 'fulfilled' ? usersRes.value : null

        const roomsTotal = exams.reduce(
          (total, exam) => total + (Array.isArray(exam?.rooms) ? exam.rooms.length : 0),
          0,
        )

        setDashboardStats((prev) => ({
          ...prev,
          examsTotal: exams.length,
          roomsTotal,
          activeSessions: sessions.filter(isActiveSession).length,
          flaggedSessions: sessions.filter((item) => Boolean(item?.flagged)).length,
          pendingSessions: sessions.filter(isPendingSession).length,
          sessionsTotal: sessions.length,
          usersTotal: Number(usersPayload?.total ?? usersPayload?.totalElements ?? usersPayload?.items?.length ?? 0),
        }))
      } catch {
        if (!cancelled) {
          setDashboardStats((prev) => ({
            ...prev,
            examsTotal: '—',
            roomsTotal: '—',
            activeSessions: '—',
            flaggedSessions: '—',
            pendingSessions: '—',
            sessionsTotal: '—',
            usersTotal: '—',
          }))
        }
      }
    }

    loadCommonStats()

    return () => {
      cancelled = true
    }
  }, [activeRole])

  useEffect(() => {
    if (!canStudentTakeExam) return

    let cancelled = false

    const loadStudentStats = async () => {
      try {
        const [registrationsRes, sessionsRes] = await Promise.allSettled([
          getMyExamRegistrations({ page: 1, size: 1 }),
          getMyExamSessions(),
        ])

        if (cancelled) return

        const registrationTotal =
          registrationsRes.status === 'fulfilled'
            ? Number(registrationsRes.value?.totalElements ?? registrationsRes.value?.total ?? registrationsRes.value?.content?.length ?? 0)
            : 0
        const mySessionsTotal =
          sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)
            ? sessionsRes.value.length
            : 0

        setDashboardStats((prev) => ({
          ...prev,
          registrationsTotal: registrationTotal,
          mySessionsTotal,
        }))
      } catch {
        if (!cancelled) {
          setDashboardStats((prev) => ({
            ...prev,
            registrationsTotal: '—',
            mySessionsTotal: '—',
          }))
        }
      }
    }

    loadStudentStats()

    return () => {
      cancelled = true
    }
  }, [canStudentTakeExam])

  const dashboard = useMemo(() => {
    const base = DASHBOARD_BY_ROLE[activeRole]
    if (activeRole !== 'STUDENT') return base

    return {
      ...base,
      kpis: base.kpis.map((item) => {
        if (item.key === 'verification') {
          return { value: verificationKpi.value, label: verificationKpi.label }
        }

        if (item.key === 'readiness') {
          const isReady = verificationKpi.label === 'Đã xác minh'
          return {
            value: isReady ? '✓' : '!',
            label: isReady ? 'Sẵn sàng vào phòng' : 'Chưa sẵn sàng',
          }
        }

        return {
          value: formatCount(dashboardStats[item.key]),
          label: item.label,
        }
      }),
    }
  }, [activeRole, verificationKpi, dashboardStats])

  const resolvedDashboard = useMemo(() => {
    const base = DASHBOARD_BY_ROLE[activeRole]
    if (activeRole === 'STUDENT') {
      return dashboard
    }

    return {
      ...base,
      kpis: base.kpis.map((item) => ({
        value: formatCount(dashboardStats[item.key]),
        label: item.label,
      })),
    }
  }, [activeRole, dashboard, dashboardStats])

  const visibleActions = HOME_ACTIONS.filter((action) =>
    canAccess(user, {
      allowRoles: action.allowRoles,
      allowPermissions: action.allowPermissions,
      match: action.match,
    }),
  )

  return (
    <div className="rbac-home">
      <section className="hero-panel">
        <p className="tagline">Tổng quan vận hành</p>
        <h2>{resolvedDashboard.heading}</h2>
        <p className="lead">{resolvedDashboard.lead}</p>

        <div className="action-row">
          {visibleActions.map((action) => (
            <Link key={action.key} className="btn-main" to={action.to}>
              {action.label}
            </Link>
          ))}
        </div>

        <div className="metric-grid">
          {resolvedDashboard.kpis.map((item) => (
            <article key={item.label} className="metric-card">
              <h3>{item.value}</h3>
              <p>{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-grid">
        <article className="panel timeline">
          <header>
            <p className="mini">Updates</p>
            <h3>Hoạt động hôm nay</h3>
          </header>

          <ul>
            {resolvedDashboard.timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel focus">
          <header>
            <p className="mini">Focus</p>
            <h3>Ưu tiên</h3>
          </header>
          <p>{resolvedDashboard.focus}</p>
        </article>
      </section>
    </div>
  )
}