import { useNavigate } from 'react-router-dom'
import AssignmentsSection from '../../components/RBAC/AssignmentsSection'
import useRbacManagement from '../../hooks/useRbacManagement'
import '../../components/RBAC/RBAC.css'

export default function RBACAssignmentsPage() {
  const rbac = useRbacManagement()
  const navigate = useNavigate()

  return (
    <div className="rbac-page">
      <div className="rbac-head">
        <div>
          <h2>Gán Quyền</h2>
          <p>Gán Vai trò-Quyền và Người dùng-Vai trò theo bộ lọc và thao tác hàng loạt.</p>
        </div>
        <div className="assignment-nav-buttons">
          <button type="button" className="btn-nav" onClick={() => navigate('/rbac/roles')}>
            Quản lý vai trò
          </button>
          <button type="button" className="btn-nav" onClick={() => navigate('/rbac/permissions')}>
            Quản lý quyền
          </button>
        </div>
      </div>

      {rbac.loading && <p className="status-line">Đang xử lý...</p>}
      {rbac.message && <p className="status-line success">{rbac.message}</p>}
      {rbac.error && <p className="status-line error">{rbac.error}</p>}

      <AssignmentsSection
        roleSelectorInput={rbac.roleSelectorInput}
        handleRoleSelectorInputChange={rbac.handleRoleSelectorInputChange}
        filteredRoleSelectorOptions={rbac.filteredRoleSelectorOptions}
        selectedRolePermissionIds={rbac.selectedRolePermissionIds}
        assignmentPermissionSearch={rbac.assignmentPermissionSearch}
        setAssignmentPermissionSearch={rbac.setAssignmentPermissionSearch}
        assignmentPermissionPage={rbac.assignmentPermissionPage}
        setAssignmentPermissionPage={rbac.setAssignmentPermissionPage}
        assignmentPermissionPageSize={rbac.assignmentPermissionPageSize}
        handleSelectAllFilteredPermissions={rbac.handleSelectAllFilteredPermissions}
        handleClearAllFilteredPermissions={rbac.handleClearAllFilteredPermissions}
        filteredAssignmentPermissions={rbac.filteredAssignmentPermissions}
        paginatedAssignmentPermissions={rbac.paginatedAssignmentPermissions}
        assignmentPermissionTotalPages={rbac.assignmentPermissionTotalPages}
        assignmentPermissionIsFirst={rbac.assignmentPermissionIsFirst}
        assignmentPermissionIsLast={rbac.assignmentPermissionIsLast}
        toggleRolePermissionSelection={rbac.toggleRolePermissionSelection}
        selectedRoleId={rbac.selectedRoleId}
        handleRemovePermissionFromRole={rbac.handleRemovePermissionFromRole}
        handleAddSelectedPermissions={rbac.handleAddSelectedPermissions}
        handleReplaceRolePermissions={rbac.handleReplaceRolePermissions}
        userSelectorInput={rbac.userSelectorInput}
        handleUserSelectorInputChange={rbac.handleUserSelectorInputChange}
        filteredUsers={rbac.filteredUsers}
        selectedUserRoleIds={rbac.selectedUserRoleIds}
        assignmentRoleSearch={rbac.assignmentRoleSearch}
        setAssignmentRoleSearch={rbac.setAssignmentRoleSearch}
        handleSelectAllFilteredRoles={rbac.handleSelectAllFilteredRoles}
        handleClearAllFilteredRoles={rbac.handleClearAllFilteredRoles}
        filteredAssignmentRoles={rbac.filteredAssignmentRoles}
        toggleUserRole={rbac.toggleUserRole}
        handleReplaceUserRoles={rbac.handleReplaceUserRoles}
        selectedUserId={rbac.selectedUserId}
      />
    </div>
  )
}
