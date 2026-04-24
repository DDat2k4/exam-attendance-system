import { canAccess } from '../../utils/rbac'
import { useAuth } from '../../context/AuthContext'

export default function PermissionGate({
  allowRoles = [],
  allowPermissions = [],
  match = 'any',
  fallback = null,
  children,
}) {
  const { user } = useAuth()

  if (!canAccess(user, { allowRoles, allowPermissions, match })) {
    return fallback
  }

  return children
}
