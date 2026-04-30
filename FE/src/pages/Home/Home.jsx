import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserProfile } from '../../api/userProfileApi'
import { getUserFromToken } from '../../utils/jwt'
import { useAuth } from '../../context/AuthContext'
import { canAccess, getRoleCodes } from '../../utils/rbac'
import './Home.css'

const DASHBOARD_BY_ROLE = {
  ADMIN: {
    heading: 'Hệ thống quản lý kỳ thi',
    lead: 'Giám sát điểm danh, check-in và tiến độ các ca thi.',
    kpis: [
      { value: '126', label: 'Kỳ thi hiện tại' },
      { value: '98.9%', label: 'Check-in hợp lệ' },
      { value: '34', label: 'Cảnh báo mới' },
      { value: '12', label: 'Đơn vị hoạt động' },
    ],
    timeline: [
      'Hôm nay 08:00 - Kích hoạt ca thi sáng',
      'Hôm nay 14:00 - Bắt đầu ca thi chiều',
    ],
    focus: 'Ưu tiên: Theo dõi các phiên có cảnh báo',
  },
  PROCTOR: {
    heading: 'Quản lý phòng thi',
    lead: 'Giám sát lưu lượng vào phòng và xác thực sinh viên.',
    kpis: [
      { value: '4', label: 'Ca thi phụ trách' },
      { value: '213', label: 'Sinh viên đã check-in' },
      { value: '6', label: 'Đợi xác minh' },
      { value: '01:42', label: 'Thời gian trung bình' },
    ],
    timeline: [
      'Hôm nay 08:00 - Mở phòng B203',
      'Hôm nay 12:00 - Kiểm tra hoàn tất',
    ],
    focus: 'Ưu tiên: Xác thực các sinh viên đợi',
  },
  STUDENT: {
    heading: 'Lịch thi của bạn',
    lead: 'Xem lịch thi, trạng thái xác minh và hướng dẫn vào phòng.',
    kpis: [
      { value: '2', label: 'Kỳ thi sắp tới' },
      { value: '100%', label: 'Hồ sơ hoàn tất' },
      { value: '09:00', label: 'Kỳ thi gần nhất' },
      { value: '✓', label: 'Xác minh' },
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
  const roles = getRoleCodes(user)
  const activeRole = ACTIVE_ROLE_ORDER.find((role) => roles.includes(role)) || 'STUDENT'

  useEffect(() => {
    if (activeRole !== 'STUDENT') return

    const tokenUser = getUserFromToken()
    const profileIdRaw =
      tokenUser?.profileId ??
      tokenUser?.id ??
      tokenUser?.userId ??
      localStorage.getItem('profileId')
    const profileId = Number(profileIdRaw)

    if (!profileId) {
      Promise.resolve().then(() => {
        setVerificationKpi({ value: '-', label: 'Chưa có hồ sơ' })
      })
      return
    }

    let cancelled = false

    const loadVerificationStatus = async () => {
      try {
        const profile = await getUserProfile(profileId)
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
          setVerificationKpi({ value: '-', label: 'Chưa có hồ sơ' })
          return
        }
        setVerificationKpi({ value: '?', label: 'Lỗi xác minh' })
      }
    }

    loadVerificationStatus()

    return () => {
      cancelled = true
    }
  }, [activeRole])

  const dashboard = useMemo(() => {
    const base = DASHBOARD_BY_ROLE[activeRole]
    if (activeRole !== 'STUDENT') return base

    return {
      ...base,
      kpis: [
        base.kpis[0],
        base.kpis[1],
        base.kpis[2],
        { value: verificationKpi.value, label: verificationKpi.label },
      ],
    }
  }, [activeRole, verificationKpi])

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
        <h2>{dashboard.heading}</h2>
        <p className="lead">{dashboard.lead}</p>

        <div className="action-row">
          {visibleActions.map((action) => (
            <Link key={action.key} className="btn-main" to={action.to}>
              {action.label}
            </Link>
          ))}
        </div>

        <div className="metric-grid">
          {dashboard.kpis.map((item) => (
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
            {dashboard.timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel focus">
          <header>
            <p className="mini">Focus</p>
            <h3>Ưu tiên</h3>
          </header>
          <p>{dashboard.focus}</p>
        </article>
      </section>
    </div>
  )
}