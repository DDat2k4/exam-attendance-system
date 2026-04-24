import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../../hooks/useRbacManagement'
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
  rolePageSize,
  allRoles,
  handleEditRole,
  handleDeleteRole,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [localRolePage, setLocalRolePage] = useState(1)

  const filteredRoles = useMemo(() => {
    const keyword = String(roleNameFilter || '')
      .trim()
      .toLowerCase()

    if (!keyword) {
      return allRoles
    }

    return allRoles.filter((item) => {
      const name = String(item?.name || item?.code || '').toLowerCase()
      const description = String(item?.description || '').toLowerCase()
      const id = String(item?.id || '')
      return name.includes(keyword) || description.includes(keyword) || id.includes(keyword)
    })
  }, [allRoles, roleNameFilter])

  const normalizedPageSize = Number(rolePageSize) > 0 ? Number(rolePageSize) : DEFAULT_PAGE_SIZE

  const localTotalPages = useMemo(() => {
    if (filteredRoles.length === 0) return 0
    return Math.ceil(filteredRoles.length / normalizedPageSize)
  }, [filteredRoles.length, normalizedPageSize])

  const paginatedRoles = useMemo(() => {
    if (filteredRoles.length === 0) return []
    const startIndex = (localRolePage - 1) * normalizedPageSize
    return filteredRoles.slice(startIndex, startIndex + normalizedPageSize)
  }, [filteredRoles, localRolePage, normalizedPageSize])

  const localIsFirst = localRolePage <= 1
  const localIsLast = localTotalPages === 0 || localRolePage >= localTotalPages

  useEffect(() => {
    setLocalRolePage(1)
  }, [roleNameFilter])

  useEffect(() => {
    if (localTotalPages === 0) {
      if (localRolePage !== 1) {
        setLocalRolePage(1)
      }
      return
    }

    if (localRolePage > localTotalPages) {
      setLocalRolePage(localTotalPages)
    }
  }, [localRolePage, localTotalPages])

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
                setLocalRolePage(1)
              }
            }}
          />
          <button type="button" onClick={() => setLocalRolePage(1)} className="btn-search">
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
            {paginatedRoles.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  Không có vai trò
                </td>
              </tr>
            ) : (
              paginatedRoles.map((role, idx) => (
                <tr key={role.id}>
                  <td>{(localRolePage - 1) * normalizedPageSize + idx + 1}</td>
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
        <button type="button" disabled={localIsFirst || localTotalPages === 0} onClick={() => setLocalRolePage(1)}>
          Đầu
        </button>
        <button
          type="button"
          disabled={localIsFirst || localTotalPages === 0}
          onClick={() => setLocalRolePage((prev) => Math.max(prev - 1, 1))}
        >
          Trước
        </button>
        <span className="page-info">
          {localRolePage}/{Math.max(localTotalPages, 1)}
        </span>
        <button
          type="button"
          disabled={localIsLast || localTotalPages === 0}
          onClick={() => setLocalRolePage((prev) => Math.min(prev + 1, Math.max(localTotalPages, 1)))}
        >
          Sau
        </button>
        <button
          type="button"
          disabled={localIsLast || localTotalPages === 0}
          onClick={() => setLocalRolePage(Math.max(localTotalPages, 1))}
        >
          Cuối
        </button>
      </div>
    </section>
  )
}
