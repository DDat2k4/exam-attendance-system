import { useMemo, useState } from 'react'
import FormModal from './FormModal'
import { ChevronsLeftIcon, ChevronsRightIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../ui/AppIcons'

const emptyUserForm = {
  username: '',
  email: '',
  phone: '',
  password: '',
  active: true,
}

export default function UsersSection({
  users,
  loading,
  keyword,
  setKeyword,
  roleFilter,
  setRoleFilter,
  roleOptions,
  fetchUsers,
  page,
  totalPages,
  isFirst,
  isLast,
  pageSize,
  setPageSize,
  totalElements,
  userForm,
  setUserForm,
  editingUserId,
  setEditingUserId,
  selectedRoleIds,
  setSelectedRoleIds,
  handleCreateOrUpdateUser,
  handleDeleteUser,
  handleCreateStudentAccount,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [studentForm, setStudentForm] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    fullName: '',
    birthDate: '',
    gender: '0',
    citizenId: '',
  })

  const filteredUsers = useMemo(() => {
    const term = keyword.trim().toLowerCase()
    if (!term) return users

    return users.filter((user) => {
      const username = String(user?.username || '').toLowerCase()
      const email = String(user?.email || '').toLowerCase()
      const phone = String(user?.phone || '').toLowerCase()
      const id = String(user?.id || '')
      return username.includes(term) || email.includes(term) || phone.includes(term) || id.includes(term)
    })
  }, [users, keyword])

  const openCreateModal = () => {
    setUserForm(emptyUserForm)
    setEditingUserId(null)
    setSelectedRoleIds([])
    setIsModalOpen(true)
  }

  const openCreateStudentModal = () => {
    setStudentForm({
      username: '',
      password: '',
      email: '',
      phone: '',
      fullName: '',
      birthDate: '',
      gender: '1',
      citizenId: '',
    })
    setIsStudentModalOpen(true)
  }

  const closeStudentModal = () => {
    setIsStudentModalOpen(false)
    setStudentForm({
      username: '',
      password: '',
      email: '',
      phone: '',
      fullName: '',
      birthDate: '',
      gender: '1',
      citizenId: '',
    })
  }

  const submitStudentForm = async (e) => {
    e.preventDefault()
    const ok = await handleCreateStudentAccount?.(studentForm)
    if (ok) {
      closeStudentModal()
    }
  }

  const openEditModal = (user) => {
    const userRoleNames = Array.isArray(user?.roles)
      ? user.roles.filter((role) => typeof role === 'string').map((role) => role.toUpperCase())
      : []

    const roleIds = roleOptions
      .filter((role) => userRoleNames.includes(String(role?.name || '').toUpperCase()))
      .map((role) => Number(role.id))

    setUserForm({
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      password: '',
      active: resolveUserActive(user),
    })
    setEditingUserId(Number(user?.id))
    setSelectedRoleIds(roleIds)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setUserForm(emptyUserForm)
    setEditingUserId(null)
    setSelectedRoleIds([])
  }

  const submitForm = async (e) => {
    e.preventDefault()
    const ok = await handleCreateOrUpdateUser()
    if (ok) {
      closeModal()
    }
  }

  const handleRoleFilterChange = (e) => {
    const nextRole = e.target.value
    setRoleFilter(nextRole)
    fetchUsers(1, nextRole, pageSize, keyword)
  }

  const toggleSelectedRole = (roleId) => {
    const normalizedRoleId = Number(roleId)
    setSelectedRoleIds((prev) => {
      if (prev.includes(normalizedRoleId)) {
        return prev.filter((id) => id !== normalizedRoleId)
      }
      return [...prev, normalizedRoleId]
    })
  }

  const formatRoles = (user) => {
    const roles = Array.isArray(user?.roles) ? user.roles : []
    if (roles.length === 0) return '-'

    const labels = roles
      .map((role) => {
        if (typeof role === 'string') return role
        return role?.name || role?.code || role?.label
      })
      .filter(Boolean)

    return labels.length > 0 ? labels.join(', ') : '-'
  }

  const resolveUserActive = (user) => {
    if (typeof user?.status === 'number') return user.status === 1
    if (typeof user?.status === 'string') {
      const normalizedStatusNumber = user.status.trim()
      if (normalizedStatusNumber === '1') return true
      if (normalizedStatusNumber === '0') return false
    }

    if (typeof user?.active === 'boolean') return user.active
    if (typeof user?.active === 'number') return user.active > 0
    if (typeof user?.active === 'string') {
      const normalizedActive = user.active.trim().toLowerCase()
      if (['1', 'true', 'active', 'enabled', 'activated'].includes(normalizedActive)) return true
      if (['0', 'false', 'inactive', 'disabled', 'deactivated'].includes(normalizedActive)) return false
    }

    if (typeof user?.isActive === 'boolean') return user.isActive
    if (typeof user?.isActive === 'number') return user.isActive > 0
    if (typeof user?.enabled === 'boolean') return user.enabled
    if (typeof user?.enabled === 'number') return user.enabled > 0

    const normalizedStatus = String(user?.status || '')
      .trim()
      .toUpperCase()
    if (normalizedStatus) {
      return ['ACTIVE', 'ENABLED', 'ACTIVATED'].includes(normalizedStatus)
    }

    // Backend may omit active flag in list response; default to active to avoid false negative.
    return true
  }

  return (
    <section className="rbac-minimal">
      <div className="rbac-header">
        <div className="search-bar">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const term = String(e.target.value || '')
                fetchUsers(1, roleFilter, pageSize, term)
              }
            }}
            placeholder="Tìm theo ID, email, phone hoặc tài khoản..."
          />
          <button
            type="button"
            onClick={() => fetchUsers(1, roleFilter, pageSize, keyword)}
            className="btn-search icon-only-btn"
            aria-label="Tìm kiếm"
            title="Tìm kiếm"
          >
            <SearchIcon />
          </button>
        </div>

        <div className="inline-actions">
          <button type="button" className="btn-new" onClick={openCreateStudentModal} disabled={loading}>
            <PlusIcon size={16} />
            CẤP TÀI KHOẢN SV
          </button>
          <button type="button" className="btn-new" onClick={openCreateModal} disabled={loading}>
            <PlusIcon size={16} />
            TẠO USER
          </button>
        </div>
      </div>

      <div className="rbac-toolbar">
        <div className="rbac-toolbar-item">
          <label>Lọc theo vai trò</label>
          <select value={roleFilter} onChange={handleRoleFilterChange}>
            <option value="">Tất cả vai trò</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rbac-toolbar-item">
          <label>Kích thước trang</label>
          <select
            value={pageSize}
            onChange={(e) => {
              const nextSize = Number(e.target.value) || 10
              setPageSize(nextSize)
              fetchUsers(1, roleFilter, nextSize, keyword)
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <FormModal
        isOpen={isStudentModalOpen}
        title="Cấp tài khoản sinh viên"
        subtitle="Điền thông tin đăng nhập và hồ sơ cá nhân để tạo tài khoản cho sinh viên."
        onClose={closeStudentModal}
        onSubmit={submitStudentForm}
      >
        <div className="user-form-grid">
          <div className="form-field">
            <label>Tên đăng nhập</label>
            <input
              value={studentForm.username}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Nhập tên đăng nhập"
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label>Mật khẩu</label>
            <input
              value={studentForm.password}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Nhập mật khẩu"
              type="password"
              required
              minLength={6}
            />
          </div>

          <div className="form-field">
            <label>Email</label>
            <input
              value={studentForm.email}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="VD: student@example.com"
              type="email"
              required
            />
          </div>

          <div className="form-field">
            <label>Số điện thoại</label>
            <input
              value={studentForm.phone}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="VD: 0987654321"
            />
          </div>

          <div className="form-field">
            <label>Họ và tên</label>
            <input
              value={studentForm.fullName}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="VD: Nguyễn Văn A"
              required
            />
          </div>

          <div className="form-field">
            <label>CCCD</label>
            <input
              value={studentForm.citizenId}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, citizenId: e.target.value }))}
              placeholder="VD: 001204123456"
            />
          </div>

          <div className="form-field">
            <label>Ngày sinh</label>
            <input
              value={studentForm.birthDate}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              type="date"
            />
          </div>

          <div className="form-field">
            <label>Giới tính</label>
            <select
              value={studentForm.gender}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, gender: e.target.value }))}
              required
            >
              <option value="1">Nam</option>
              <option value="2">Nữ</option>
            </select>
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isModalOpen}
        title={editingUserId ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}
        onClose={closeModal}
        onSubmit={submitForm}
      >
        <div className="user-form-grid">
          <div className="form-field">
            <label>Tên đăng nhập</label>
            <input
              value={userForm.username}
              onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="VD: admin"
              required
              disabled={Boolean(editingUserId)}
              autoFocus={!editingUserId}
            />
          </div>

          <div className="form-field">
            <label>Email</label>
            <input
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="VD: user@mail.com"
              type="email"
              required
            />
          </div>

          <div className="form-field">
            <label>Số điện thoại</label>
            <input
              value={userForm.phone}
              onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="VD: 0909123456"
            />
          </div>

          <div className="form-field">
            <label>{editingUserId ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'}</label>
            <input
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Nhập mật khẩu"
              type="password"
              required={!editingUserId}
              minLength={6}
            />
          </div>
        </div>

        {editingUserId && (
          <div className="form-field full-width">
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={Boolean(userForm.active)}
                onChange={(e) => setUserForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Kích hoạt tài khoản
            </label>
          </div>
        )}

        <div className="role-assignment-block full-width">
          <label className="role-assignment-title">Gán vai trò</label>
          <div className="role-assignment-list">
            {roleOptions.length === 0 ? (
              <p className="role-assignment-empty">Chưa có vai trò để gán</p>
            ) : (
              roleOptions.map((role) => {
                const roleId = Number(role.id)
                const checked = selectedRoleIds.includes(roleId)

                return (
                  <label key={roleId} className="role-assignment-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectedRole(roleId)}
                    />
                    <span>{role.name || `Vai trò ${roleId}`}</span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      </FormModal>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tài khoản</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                  Đang tải danh sách user...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                  Không có user phù hợp
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => {
                const isUserActive = resolveUserActive(user)

                return (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>{user.username || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{formatRoles(user)}</td>
                    <td>
                      <span className={isUserActive ? 'status-chip active' : 'status-chip inactive'}>
                        {isUserActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button type="button" className="btn-edit icon-only-btn" onClick={() => openEditModal(user)} aria-label={`Sửa user ${user.id}`} title="Sửa">
                          <PencilIcon />
                        </button>
                        <button type="button" className="btn-delete icon-only-btn" onClick={() => handleDeleteUser(user.id)} aria-label={`Xóa user ${user.id}`} title="Xóa">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={isFirst} onClick={() => fetchUsers(1, roleFilter, pageSize, keyword)} className="icon-only-btn" aria-label="Trang đầu" title="Trang đầu">
          <ChevronsLeftIcon />
        </button>
        <button type="button" disabled={isFirst} onClick={() => fetchUsers(page - 1, roleFilter, pageSize, keyword)} className="icon-only-btn" aria-label="Trang trước" title="Trang trước">
          <ChevronLeftIcon />
        </button>
        <span className="page-info">
          {page}/{Math.max(totalPages, 1)}
        </span>
        <button type="button" disabled={isLast || totalPages === 0} onClick={() => fetchUsers(page + 1, roleFilter, pageSize, keyword)} className="icon-only-btn" aria-label="Trang sau" title="Trang sau">
          <ChevronRightIcon />
        </button>
        <button type="button" disabled={isLast || totalPages === 0} onClick={() => fetchUsers(totalPages, roleFilter, pageSize, keyword)} className="icon-only-btn" aria-label="Trang cuối" title="Trang cuối">
          <ChevronsRightIcon />
        </button>
      </div>

      <div className="role-page-summary">
        <span>Tổng user: {totalElements}</span>
      </div>
    </section>
  )
}
