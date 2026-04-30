import { useState } from 'react'
import FormModal from './FormModal'

const emptyRoleForm = { name: '', description: '' }

export default function RolesSection({
  roleForm,
  setRoleForm,
  editingRoleId,
  setEditingRoleId,
  handleCreateOrUpdateRole,
  roleNameFilter,
  setRoleNameFilter,
  rolePage,
  rolePageSize,
  roleTotalPages,
  roleIsFirst,
  roleIsLast,
  roles,
  handleRolePageChange,
  handleEditRole,
  handleDeleteRole,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const normalizedPageSize = Number(rolePageSize) > 0 ? Number(rolePageSize) : 10

  const handleOpenModal = () => {
    setRoleForm(emptyRoleForm)
    setEditingRoleId(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setRoleForm(emptyRoleForm)
    setEditingRoleId(null)
  }

  const handleSubmitForm = (e) => {
    e.preventDefault()
    handleCreateOrUpdateRole(e)
    handleCloseModal()
  }

  const handleEditClick = (role) => {
    handleEditRole(role)
    setIsModalOpen(true)
  }

  return (
    <section className="rbac-minimal">
      <div className="rbac-header">
        <div className="search-bar">
          <input
            value={roleNameFilter}
            onChange={(e) => setRoleNameFilter(e.target.value)}
            placeholder="Tìm kiếm theo tên role..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRolePageChange(1)
              }
            }}
          />
          <button type="button" onClick={() => handleRolePageChange(1)} className="btn-search">
            🔍
          </button>
        </div>
        <button type="button" className="btn-new" onClick={handleOpenModal}>
          + TẠO VAI TRÒ
        </button>
      </div>

      <FormModal
        isOpen={isModalOpen}
        title={editingRoleId ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
        onClose={handleCloseModal}
        onSubmit={handleSubmitForm}
      >
        <label>Tên vai trò</label>
        <input
          value={roleForm.name}
          onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="VD: ADMIN"
          required
        />
        <label>Mô tả</label>
        <input
          value={roleForm.description}
          onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Mô tả chi tiết về role"
        />
      </FormModal>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tên</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  Không có vai trò
                </td>
              </tr>
            ) : (
              roles.map((role, idx) => (
                <tr key={role.id}>
                  <td>{(rolePage - 1) * normalizedPageSize + idx + 1}</td>
                  <td>{role.name || '-'}</td>
                  <td>{role.description || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-edit" onClick={() => handleEditClick(role)}>
                        Sửa
                      </button>
                      <button type="button" className="btn-delete" onClick={() => handleDeleteRole(role.id)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={roleIsFirst || roleTotalPages === 0} onClick={() => handleRolePageChange(1)}>
          Đầu
        </button>
        <button
          type="button"
          disabled={roleIsFirst || roleTotalPages === 0}
          onClick={() => handleRolePageChange(Math.max(rolePage - 1, 1))}
        >
          Trước
        </button>
        <span className="page-info">
          {rolePage}/{Math.max(roleTotalPages, 1)}
        </span>
        <button
          type="button"
          disabled={roleIsLast || roleTotalPages === 0}
          onClick={() => handleRolePageChange(Math.min(rolePage + 1, Math.max(roleTotalPages, 1)))}
        >
          Sau
        </button>
        <button
          type="button"
          disabled={roleIsLast || roleTotalPages === 0}
          onClick={() => handleRolePageChange(Math.max(roleTotalPages, 1))}
        >
          Cuối
        </button>
      </div>
    </section>
  )
}
