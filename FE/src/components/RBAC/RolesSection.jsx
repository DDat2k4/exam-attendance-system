import { useState } from 'react'
import FormModal from './FormModal'
import { ChevronsLeftIcon, ChevronsRightIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../ui/AppIcons'

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
          <button type="button" onClick={() => handleRolePageChange(1)} className="btn-search icon-only-btn" aria-label="Tìm kiếm" title="Tìm kiếm">
            <SearchIcon />
          </button>
        </div>
        <button type="button" className="btn-new" onClick={handleOpenModal}>
          <PlusIcon size={16} />
          TẠO VAI TRÒ
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
                      <button type="button" className="btn-edit icon-only-btn" onClick={() => handleEditClick(role)} aria-label={`Sửa vai trò ${role.id}`} title="Sửa">
                        <PencilIcon />
                      </button>
                      <button type="button" className="btn-delete icon-only-btn" onClick={() => handleDeleteRole(role.id)} aria-label={`Xóa vai trò ${role.id}`} title="Xóa">
                        <TrashIcon />
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
        <button type="button" disabled={roleIsFirst || roleTotalPages === 0} onClick={() => handleRolePageChange(1)} className="icon-only-btn" aria-label="Trang đầu" title="Trang đầu">
          <ChevronsLeftIcon />
        </button>
        <button
          type="button"
          disabled={roleIsFirst || roleTotalPages === 0}
          onClick={() => handleRolePageChange(Math.max(rolePage - 1, 1))}
          className="icon-only-btn"
          aria-label="Trang trước"
          title="Trang trước"
        >
          <ChevronLeftIcon />
        </button>
        <span className="page-info">
          {rolePage}/{Math.max(roleTotalPages, 1)}
        </span>
        <button
          type="button"
          disabled={roleIsLast || roleTotalPages === 0}
          onClick={() => handleRolePageChange(Math.min(rolePage + 1, Math.max(roleTotalPages, 1)))}
          className="icon-only-btn"
          aria-label="Trang sau"
          title="Trang sau"
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          disabled={roleIsLast || roleTotalPages === 0}
          onClick={() => handleRolePageChange(Math.max(roleTotalPages, 1))}
          className="icon-only-btn"
          aria-label="Trang cuối"
          title="Trang cuối"
        >
          <ChevronsRightIcon />
        </button>
      </div>
    </section>
  )
}
