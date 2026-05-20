import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { hasAnyRole } from '../../utils/rbac'
import { useEffect, useState, useRef } from 'react'
import { getMyUserProfile } from '../../api/userProfileApi'
import './AppShell.css'

const NAV_ITEMS = [
  {
    to: '/home',
    label: 'Dashboard',
    allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'],
  },
  {
    to: '/exam-hub',
    label: 'Trung tâm thi',
    allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'],
    submenu: [
      { to: '/exam-hub', label: 'Tổng quan', allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'] },
      { to: '/exam-hub/exams', label: 'Kỳ thi', allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'] },
      { to: '/exam-hub/registrations', label: 'Đăng ký thí sinh', allowRoles: ['ADMIN'] },
      { to: '/exam-hub/rooms', label: 'Phòng thi', allowRoles: ['ADMIN', 'PROCTOR'] },
      { to: '/exam-hub/proctor', label: 'Giám sát', allowRoles: ['ADMIN', 'PROCTOR'] },
      { to: '/exam-hub/student-exams', label: 'Kỳ thi của tôi', allowRoles: ['STUDENT'] },
      // verification moved to mobile app; menu entry removed
    ],
  },
  {
    to: '/rbac',
    label: 'Quản trị phân quyền',
    allowRoles: ['ADMIN'],
    submenu: [
      { to: '/rbac', label: 'Tổng quan', allowRoles: ['ADMIN'] },
      { to: '/rbac/roles', label: 'Quản lý vai trò', allowRoles: ['ADMIN'] },
      { to: '/rbac/permissions', label: 'Quản lý quyền', allowRoles: ['ADMIN'] },
      { to: '/rbac/assignments', label: 'Gán quyền', allowRoles: ['ADMIN'] },
      { to: '/rbac/users', label: 'Quản lý người dùng', allowRoles: ['ADMIN'] },
    ],
  },
]

export default function AppShell() {
  const { user, refreshUser } = useAuth()
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showRotateHint, setShowRotateHint] = useState(false)
  const navigate = useNavigate()
  const [expandedMenu, setExpandedMenu] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const userBoxRef = useRef(null)
  const [profileDetails, setProfileDetails] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const userProfileKey = `${user?.id ?? ''}|${user?.userId ?? ''}|${user?.username ?? ''}|${user?.email ?? ''}`
  

  const menu = NAV_ITEMS.filter((item) => hasAnyRole(user, item.allowRoles))

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('theme-dark') === '1'
    } catch (e) {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('theme-dark', darkMode ? '1' : '0')
    } catch (e) {}
  }, [darkMode])

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const loadProfile = async () => {
      try {
        setProfileLoading(true)
        setProfileError('')
        const profile = await getMyUserProfile()
        if (!cancelled) {
          setProfileDetails(profile ?? null)
        }
      } catch (err) {
        if (!cancelled && err?.response?.status !== 404) {
          setProfileError(err.message || 'Không thể tải thông tin cá nhân.')
        }
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [userProfileKey])

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (!showProfileMenu) return
      const el = userBoxRef.current
      if (!el) return
      if (!el.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [showProfileMenu])

  const displayProfile = profileDetails || null

  const popoverTitle = displayProfile?.fullName || displayProfile?.name || displayProfile?.username || user?.username || user?.email || 'Tài khoản'
  const popoverSubtitle = displayProfile?.email || displayProfile?.username || user?.email || ''

  const formatGender = (gender) => {
    if (gender === 1) return 'Nam'
    if (gender === 2) return 'Nữ'
    if (gender === 0) return 'Khác/Không xác định'
    return '-'
  }

  

  const handleLogout = async () => {
    await logout()
    refreshUser()
    navigate('/login', { replace: true })
  }

  const toggleSubmenu = (label) => {
    setExpandedMenu(expandedMenu === label ? null : label)
  }

  // prevent body scroll when mobile nav is open
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (showMobileNav) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showMobileNav])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(max-width: 920px) and (orientation: portrait)')

    const updateHint = () => {
      setShowRotateHint(media.matches)
    }

    updateHint()
    media.addEventListener?.('change', updateHint)
    window.addEventListener('resize', updateHint)

    return () => {
      media.removeEventListener?.('change', updateHint)
      window.removeEventListener('resize', updateHint)
    }
  }, [])

  return (
    <div className={`app-shell ${darkMode ? 'theme-dark' : ''} ${showMobileNav ? 'mobile-nav-open' : ''}`}>
      <aside className="shell-sidebar">
        <Link className="brand" to="/home">
          <p>Attendance Platform</p>
          <strong>Control Center</strong>
        </Link>
        <nav className="shell-nav" aria-label="Main navigation">
          {menu.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0
            const visibleSubmenu = hasSubmenu
              ? item.submenu.filter((sub) => hasAnyRole(user, sub.allowRoles))
              : []
            const isExpanded = expandedMenu === item.label

            if (hasSubmenu && visibleSubmenu.length > 0) {
              return (
                <div key={item.to} className="nav-section">
                  <button
                    type="button"
                    className={`nav-item menu-toggle ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleSubmenu(item.label)}
                  >
                    {item.label}
                    <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▾</span>
                  </button>
                  {isExpanded && (
                    <div className="nav-submenu">
                      {visibleSubmenu.map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={({ isActive }) => (isActive ? 'nav-subitem active' : 'nav-subitem')}
                          onClick={() => { setExpandedMenu(null); setShowMobileNav(false) }}
                        >
                          {sub.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                onClick={() => setShowMobileNav(false)}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>

      </aside>
      {/* mobile backdrop to close nav */}
      {showMobileNav && <div className="mobile-nav-backdrop" onClick={() => setShowMobileNav(false)} />}

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setShowMobileNav((s) => !s)} aria-label="Toggle menu">☰</button>
            <div>
            <p className="eyebrow">Digital Exam Attendance</p>
            <h1>Exam Operations</h1>
            </div>
          </div>

          <div className="user-box" ref={userBoxRef}>
            <div className="user-box__actions compact">
              <button
                type="button"
                className="user-icon-btn"
                onClick={() => setDarkMode((s) => !s)}
                aria-label="Toggle theme"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀' : '🌙'}
              </button>

              <button
                type="button"
                className="user-avatar-btn"
                onClick={() => setShowProfileMenu((s) => !s)}
                aria-label="Profile menu"
                title={displayProfile?.fullName || user?.username || 'Profile'}
              >
                {displayProfile?.avatarUrl ? (
                  <img className="avatar-img" src={displayProfile.avatarUrl} alt="avatar" />
                ) : (
                  <svg className="avatar-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path fill="#9aa3b2" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
                <span className="avatar-caret">▾</span>
              </button>
            </div>

            {showProfileMenu && (
              <div className="profile-popover" role="dialog" aria-label="Profile menu">
                <div className="profile-popover__header">
                  <div className="profile-popover__header-left">
                    <div className="profile-popover__title">{popoverTitle}</div>
                    {popoverSubtitle ? (
                      <p className="profile-popover__eyebrow">{popoverSubtitle}</p>
                    ) : null}
                  </div>
                  <button type="button" className="profile-popover__close" onClick={() => setShowProfileMenu(false)}>×</button>
                </div>
                {/* Debug info visible in UI to help identify missing name */}
                {/* debug info removed */}
                <div className="profile-popover__actions" style={{ marginTop: 12 }}>
                  <button className="ghost" onClick={() => { setShowProfileMenu(false); navigate('/profile') }}>Xem hồ sơ</button>
                  <button className="user-box__profile-btn" onClick={() => { setShowProfileMenu(false); navigate('/change-password') }}>Đổi mật khẩu</button>
                  <button className="user-box__profile-btn" onClick={handleLogout}>Đăng xuất</button>
                </div>
              </div>
            )}
          </div>
        </header>

        {showRotateHint && (
          <div className="rotate-hint" role="status" aria-live="polite">
            <strong>Giao diện đang ở chế độ dọc</strong>
            <span>Nếu nội dung bị chật, hãy xoay ngang màn hình để xem dễ hơn.</span>
          </div>
        )}

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
