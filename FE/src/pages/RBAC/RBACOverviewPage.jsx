import { Link } from 'react-router-dom'
import useRbacManagement from '../../hooks/useRbacManagement'
import '../../components/RBAC/RBAC.css'

export default function RBACOverviewPage() {
  const { loading, error, message, roles, permissions, filteredUsers } = useRbacManagement()

  return (
    <div className="rbac-page">
      <div className="rbac-head">
        <h2>Quản trị phân quyền</h2>
        <p>Quản trị vai trò, quyền và gán quyền theo mô hình phân quyền theo vai trò (RBAC).</p>
      </div>

      {loading && <p className="status-line">Đang tải dữ liệu...</p>}
      {message && <p className="status-line success">{message}</p>}
      {error && <p className="status-line error">{error}</p>}

      <section className="rbac-overview-grid">
        <article className="rbac-overview-card">
          <h3>{roles.length}</h3>
          <p>Vai trò hiện có</p>
        </article>
        <article className="rbac-overview-card">
          <h3>{permissions.length}</h3>
          <p>Quyền hiện có</p>
        </article>
        <article className="rbac-overview-card">
          <h3>{filteredUsers.length}</h3>
          <p>Người dùng có thể gán vai trò</p>
        </article>
      </section>

      <section className="rbac-overview-links">
        <Link className="rbac-overview-link" to="/rbac/roles">
          <strong>Quản lý vai trò</strong>
          <span>Tạo/sửa/xóa vai trò, tìm kiếm và phân trang.</span>
        </Link>
        <Link className="rbac-overview-link" to="/rbac/permissions">
          <strong>Quản lý quyền</strong>
          <span>Tạo/sửa/xóa quyền, tìm kiếm và phân trang.</span>
        </Link>
        <Link className="rbac-overview-link" to="/rbac/assignments">
          <strong>Gán Quyền</strong>
          <span>Gán Vai trò-Quyền và Người dùng-Vai trò trong một màn hình.</span>
        </Link>
        <Link className="rbac-overview-link" to="/rbac/users">
          <strong>Quản lý người dùng</strong>
          <span>Tạo/sửa/xóa người dùng, lọc theo vai trò và theo dõi trạng thái tài khoản.</span>
        </Link>
      </section>
    </div>
  )
}
