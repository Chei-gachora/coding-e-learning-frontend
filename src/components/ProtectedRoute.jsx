import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      logout();
    }
  }, [user, allowedRoles, logout]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Return them to login, the useEffect above will log them out
    return <Navigate to="/login" replace />;
  }

  return children;
}
