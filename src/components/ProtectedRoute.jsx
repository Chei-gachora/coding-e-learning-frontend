import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div role="status" aria-live="polite">Checking your session…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardByRole = {
      student: '/dashboard',
      instructor: '/instructor',
      admin: '/admin',
    };
    return <Navigate to={dashboardByRole[user.role] || '/'} replace />;
  }

  return children;
}
