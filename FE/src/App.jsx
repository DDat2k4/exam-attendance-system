import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/ui/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import Forbidden from './pages/Forbidden/Forbidden'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Profile from './pages/Profile/Profile'
import ExamOverviewPage from './pages/ExamHub/ExamOverviewPage'
import ExamsPage from './pages/ExamHub/ExamsPage'
import RegistrationsPage from './pages/ExamHub/RegistrationsPage'
import ProctorPage from './pages/ExamHub/ProctorPage'
import RoomsPage from './pages/ExamHub/RoomsPage'
import StudentExamsPage from './pages/ExamHub/StudentExamsPage'
import VerificationPage from './pages/ExamHub/VerificationPage'
import RBACOverviewPage from './pages/RBAC/RBACOverviewPage'
import RBACRolesPage from './pages/RBAC/RBACRolesPage'
import RBACPermissionsPage from './pages/RBAC/RBACPermissionsPage'
import RBACAssignmentsPage from './pages/RBAC/RBACAssignmentsPage'
import RBACUsersPage from './pages/RBAC/RBACUsersPage'

function RootRedirect() {
  const { isAuthenticated, authLoading } = useAuth()

  if (authLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/home" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="/exams" element={<Navigate to="/exam-hub" replace />} />
        <Route
          path="/exam-hub"
          element={
            <ProtectedRoute
              allowRoles={['ADMIN', 'PROCTOR', 'STUDENT']}
              allowPermissions={['EXAM_VIEW', 'EXAM_MANAGE', 'ROOM_CREATE', 'EXAM_CREATE']}
              match="any"
            >
              <ExamOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-hub/exams"
          element={
            <ProtectedRoute allowRoles={['ADMIN', 'PROCTOR', 'STUDENT']}>
              <ExamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-hub/registrations"
          element={
            <ProtectedRoute allowRoles={['ADMIN']}>
              <RegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-hub/proctor"
          element={
            <ProtectedRoute allowRoles={['ADMIN', 'PROCTOR']}>
              <ProctorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-hub/rooms"
          element={
            <ProtectedRoute allowRoles={['ADMIN', 'PROCTOR']}>
              <RoomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-hub/student-exams"
          element={
            <ProtectedRoute allowRoles={['STUDENT']}>
              <StudentExamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-hub/verification"
          element={
            <ProtectedRoute allowRoles={['STUDENT']}>
              <VerificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profiles"
          element={
            <ProtectedRoute allowRoles={['ADMIN', 'PROCTOR', 'STUDENT']}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac"
          element={
            <ProtectedRoute allowRoles={['ADMIN']}>
              <RBACOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/roles"
          element={
            <ProtectedRoute allowRoles={['ADMIN']}>
              <RBACRolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/permissions"
          element={
            <ProtectedRoute allowRoles={['ADMIN']}>
              <RBACPermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/assignments"
          element={
            <ProtectedRoute allowRoles={['ADMIN']}>
              <RBACAssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/users"
          element={
            <ProtectedRoute allowRoles={['ADMIN']}>
              <RBACUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
