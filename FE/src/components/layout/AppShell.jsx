import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { hasAnyRole } from '../../utils/rbac'
import { useState } from 'react'
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
      { to: '/exam-hub/rooms', label: 'Phòng thi', allowRoles: ['ADMIN', 'PROCTOR'] },
      { to: '/exam-hub/registrations', label: 'Đăng ký thí sinh', allowRoles: ['ADMIN'] },
      { to: '/exam-hub/proctor', label: 'Giám sát proctor', allowRoles: ['ADMIN', 'PROCTOR'] },
      { to: '/exam-hub/student-exams', label: 'Kỳ thi của tôi', allowRoles: ['STUDENT'] },
      { to: '/exam-hub/verification', label: 'Xác thực CCCD', allowRoles: ['STUDENT'] },
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
    {
    to: '/profiles',
    label: 'Thông tin cá nhân',
    allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'],
  },
]

export default function AppShell() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [expandedMenu, setExpandedMenu] = useState(null)

  const menu = NAV_ITEMS.filter((item) => hasAnyRole(user, item.allowRoles))

  const handleLogout = async () => {
    await logout()
    refreshUser()
    navigate('/login', { replace: true })
  }

  const toggleSubmenu = (label) => {
    setExpandedMenu(expandedMenu === label ? null : label)
  }

  return (
    <div className="app-shell">
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
                          onClick={() => setExpandedMenu(null)}
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
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div>
            <p className="eyebrow">Digital Exam Attendance</p>
            <h1>Exam Operations</h1>
          </div>

          <div className="user-box">
            <div className="identity">
              <p>{user?.userId != null ? `User #${user.userId}` : user?.username || 'Tài khoản'}</p>
            </div>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
