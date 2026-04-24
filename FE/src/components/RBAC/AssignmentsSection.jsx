export default function AssignmentsSection({
  roleSelectorInput,
  handleRoleSelectorInputChange,
  filteredRoleSelectorOptions,
  selectedRolePermissionIds,
  assignmentPermissionSearch,
  setAssignmentPermissionSearch,
  assignmentPermissionPage,
  setAssignmentPermissionPage,
  assignmentPermissionPageSize,
  handleSelectAllFilteredPermissions,
  handleClearAllFilteredPermissions,
  filteredAssignmentPermissions,
  paginatedAssignmentPermissions,
  assignmentPermissionTotalPages,
  assignmentPermissionIsFirst,
  assignmentPermissionIsLast,
  toggleRolePermissionSelection,
  selectedRoleId,
  handleRemovePermissionFromRole,
  handleAddSelectedPermissions,
  handleReplaceRolePermissions,
  userSelectorInput,
  handleUserSelectorInputChange,
  filteredUsers,
  selectedUserRoleIds,
  assignmentRoleSearch,
  setAssignmentRoleSearch,
  handleSelectAllFilteredRoles,
  handleClearAllFilteredRoles,
  filteredAssignmentRoles,
  toggleUserRole,
  handleReplaceUserRoles,
  selectedUserId,
}) {
  const isAllSelectedRoles = filteredAssignmentPermissions.length > 0 && filteredAssignmentPermissions.every((p) =>
    selectedRolePermissionIds.has(Number(p.id))
  )

  const handleRoleClick = (role) => {
    const roleDisplay = role.display || `${role.id} - ${role.label}`
    handleRoleSelectorInputChange(roleDisplay)
  }

  const totalAssignedPermissions = selectedRolePermissionIds.size
  const totalPermissions = filteredAssignmentPermissions?.length || 0

  return (
    <section className="assignments-container">
      <div className="assignments-grid">
        {/* Cột trái: Vai trò */}
        <article className="assignment-card">
          <div className="assignment-header">
            <h3>Vai trò</h3>
            <button type="button" className="btn-reload" onClick={() => handleRoleSelectorInputChange('')}>
              Tải lại
            </button>
          </div>

          <div className="assignment-search">
            <input
              type="text"
              value={roleSelectorInput}
              onChange={(e) => handleRoleSelectorInputChange(e.target.value)}
              placeholder="Tìm vai trò..."
            />
          </div>

          <div className="roles-list">
            {filteredRoleSelectorOptions.length === 0 ? (
              <p className="empty-state">Không có role</p>
            ) : (
              filteredRoleSelectorOptions.map((role) => (
                <div
                  key={role.id}
                  className={`role-item ${selectedRoleId === role.id ? 'active' : ''}`}
                  onClick={() => handleRoleClick(role)}
                >
                  <strong>{role.label}</strong>
                  <p>ID: {role.id}</p>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Cột phải: Quyền */}
        <article className="assignment-card">
          <div className="assignment-header">
            <h3>Quyền</h3>
            <span className="assignment-badge">
              Đã gán: {totalAssignedPermissions} / {totalPermissions}
            </span>
          </div>

          <div className="assignment-search">
            <input
              type="text"
              value={assignmentPermissionSearch}
              onChange={(e) => {
                setAssignmentPermissionSearch(e.target.value)
                setAssignmentPermissionPage(1)
              }}
              placeholder="Tìm quyền (mã/mô tả)..."
            />
          </div>

          <div className="assignment-controls">
            <button
              type="button"
              className="btn-control"
              onClick={handleSelectAllFilteredPermissions}
              disabled={!selectedRoleId || filteredAssignmentPermissions.length === 0}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              className="btn-control"
              onClick={handleClearAllFilteredPermissions}
              disabled={!selectedRoleId || selectedRolePermissionIds.size === 0}
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="permissions-table-wrap">
            <table className="permissions-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>
                    <input
                      type="checkbox"
                      checked={isAllSelectedRoles}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllFilteredPermissions()
                        } else {
                          handleClearAllFilteredPermissions()
                        }
                      }}
                      disabled={!selectedRoleId}
                    />
                  </th>
                  <th>Mã</th>
                  <th>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignmentPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      {selectedRoleId ? 'Không có permission' : 'Vui lòng chọn role'}
                    </td>
                  </tr>
                ) : (
                  paginatedAssignmentPermissions.map((permission, idx) => (
                    <tr key={permission.id}>
                      <td>{(assignmentPermissionPage - 1) * assignmentPermissionPageSize + idx + 1}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRolePermissionIds.has(Number(permission.id))}
                          onChange={() => toggleRolePermissionSelection(Number(permission.id))}
                        />
                      </td>
                      <td className="code-cell">{permission.code}</td>
                      <td>{permission.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="assignment-pagination">
            <button
              type="button"
              disabled={assignmentPermissionIsFirst || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(1)}
            >
              Đầu
            </button>
            <button
              type="button"
              disabled={assignmentPermissionIsFirst || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(assignmentPermissionPage - 1)}
            >
              Trước
            </button>
            <span className="page-info">
              {assignmentPermissionPage}/{Math.max(assignmentPermissionTotalPages, 1)}
            </span>
            <button
              type="button"
              disabled={assignmentPermissionIsLast || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(assignmentPermissionPage + 1)}
            >
              Sau
            </button>
            <button
              type="button"
              disabled={assignmentPermissionIsLast || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(assignmentPermissionTotalPages)}
            >
              Cuối
            </button>
          </div>

          <div className="assignment-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleReplaceRolePermissions}
              disabled={!selectedRoleId}
            >
              Cập nhật quyền
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}
