import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'

export default function ProtectedRoute({
  allowRoles = [],
  allowPermissions = [],
  match = 'any',
  children,
}) {
  const { user, isAuthenticated, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!canAccess(user, { allowRoles, allowPermissions, match })) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />
  }

  return children
}
