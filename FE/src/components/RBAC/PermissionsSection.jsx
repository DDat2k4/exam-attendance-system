import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../../hooks/useRbacManagement'
import FormModal from './FormModal'

const emptyPermissionForm = { code: '', description: '' }

export default function PermissionsSection({
  permissionForm,
  setPermissionForm,
  editingPermissionId,
  setEditingPermissionId,
  handleCreateOrUpdatePermission,
  permissionCodeFilter,
  setPermissionCodeFilter,
  permissionPageSize,
  assignmentPermissions,
  handleEditPermission,
  handleDeletePermission,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [localPermissionPage, setLocalPermissionPage] = useState(1)

  const filteredPermissions = useMemo(() => {
    const keyword = String(permissionCodeFilter || '')
      .trim()
      .toLowerCase()

    if (!keyword) {
      return assignmentPermissions
    }

    return assignmentPermissions.filter((item) => {
      const code = String(item?.code || '').toLowerCase()
      const description = String(item?.description || '').toLowerCase()
      const id = String(item?.id || '')
      return code.includes(keyword) || description.includes(keyword) || id.includes(keyword)
    })
  }, [assignmentPermissions, permissionCodeFilter])

  const normalizedPageSize = Number(permissionPageSize) > 0 ? Number(permissionPageSize) : DEFAULT_PAGE_SIZE

  const localTotalPages = useMemo(() => {
    if (filteredPermissions.length === 0) return 0
    return Math.ceil(filteredPermissions.length / normalizedPageSize)
  }, [filteredPermissions.length, normalizedPageSize])

  const paginatedPermissions = useMemo(() => {
    if (filteredPermissions.length === 0) return []
    const startIndex = (localPermissionPage - 1) * normalizedPageSize
    return filteredPermissions.slice(startIndex, startIndex + normalizedPageSize)
  }, [filteredPermissions, localPermissionPage, normalizedPageSize])

  const localIsFirst = localPermissionPage <= 1
  const localIsLast = localTotalPages === 0 || localPermissionPage >= localTotalPages

  useEffect(() => {
    setLocalPermissionPage(1)
  }, [permissionCodeFilter])

  useEffect(() => {
    if (localTotalPages === 0) {
      if (localPermissionPage !== 1) {
        setLocalPermissionPage(1)
      }
      return
    }

    if (localPermissionPage > localTotalPages) {
      setLocalPermissionPage(localTotalPages)
    }
  }, [localPermissionPage, localTotalPages])

  const handleOpenModal = () => {
    setPermissionForm(emptyPermissionForm)
    setEditingPermissionId(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setPermissionForm(emptyPermissionForm)
    setEditingPermissionId(null)
  }

  const handleSubmitForm = (e) => {
    e.preventDefault()
    handleCreateOrUpdatePermission(e)
    handleCloseModal()
  }

  const handleEditClick = (permission) => {
    handleEditPermission(permission)
    setIsModalOpen(true)
  }

  return (
    <section className="rbac-minimal">
      <div className="rbac-header">
        <div className="search-bar">
          <input
            value={permissionCodeFilter}
            onChange={(e) => setPermissionCodeFilter(e.target.value)}
            placeholder="Tìm kiếm theo mã permission..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setLocalPermissionPage(1)
              }
            }}
          />
          <button type="button" onClick={() => setLocalPermissionPage(1)} className="btn-search">
            🔍
          </button>
        </div>
        <button type="button" className="btn-new" onClick={handleOpenModal}>
          + TẠO QUYỀN
        </button>
      </div>

      <FormModal
        isOpen={isModalOpen}
        title={editingPermissionId ? 'Chỉnh sửa quyền' : 'Tạo quyền mới'}
        onClose={handleCloseModal}
        onSubmit={handleSubmitForm}
      >
        <label>Mã Permission</label>
        <input
          value={permissionForm.code}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, code: e.target.value }))}
          placeholder="VD: EXAM_CREATE"
          required
        />
        <label>Mô tả</label>
        <input
          value={permissionForm.description}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Mô tả chi tiết về quyền"
        />
      </FormModal>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Mã</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPermissions.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  Không có quyền phù hợp
                </td>
              </tr>
            ) : (
              paginatedPermissions.map((permission, idx) => (
                <tr key={permission.id}>
                  <td>{(localPermissionPage - 1) * normalizedPageSize + idx + 1}</td>
                  <td>{permission.code || '-'}</td>
                  <td>{permission.description || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-edit" onClick={() => handleEditClick(permission)}>
                        Sửa
                      </button>
                      <button type="button" className="btn-delete" onClick={() => handleDeletePermission(permission.id)}>
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
        <button type="button" disabled={localIsFirst || localTotalPages === 0} onClick={() => setLocalPermissionPage(1)}>
          Đầu
        </button>
        <button
          type="button"
          disabled={localIsFirst || localTotalPages === 0}
          onClick={() => setLocalPermissionPage((prev) => Math.max(prev - 1, 1))}
        >
          Trước
        </button>
        <span className="page-info">
          {localPermissionPage}/{Math.max(localTotalPages, 1)}
        </span>
        <button
          type="button"
          disabled={localIsLast || localTotalPages === 0}
          onClick={() => setLocalPermissionPage((prev) => Math.min(prev + 1, Math.max(localTotalPages, 1)))}
        >
          Sau
        </button>
        <button
          type="button"
          disabled={localIsLast || localTotalPages === 0}
          onClick={() => setLocalPermissionPage(Math.max(localTotalPages, 1))}
        >
          Cuối
        </button>
      </div>
    </section>
  )
}
