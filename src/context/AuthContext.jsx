import { createContext, useContext, useState, useEffect } from 'react';
import * as auth from '../lib/auth';
const AuthContext = createContext();

export const DEFAULT_USERS = {
  student: {
    id: 'usr_student_1',
    name: 'Alex Johnson',
    email: 'student@codelearn.com',
    role: 'student',
    avatar: 'S',
    title: 'Student Learner'
  },
  instructor: {
    id: 'usr_inst_1',
    name: 'Dr. Sarah Jenkins',
    email: 'instructor@codelearn.com',
    role: 'instructor',
    avatar: 'I',
    title: 'Senior Instructor'
  },
  admin: {
    id: 'usr_admin_1',
    name: 'System Admin',
    email: 'admin@codelearn.com',
    role: 'admin',
    avatar: 'A',
    title: 'Platform Administrator'
  }
};

/**
 * Detect user role from their email address.
 * - local part is/starts with "admin"      -> admin
 * - local part is/starts with "instructor" -> instructor
 * - everything else                        -> student
 */
export function detectRoleFromEmail(email) {
  const lower = (email || '').toLowerCase().trim();
  const localPart = lower.split('@')[0];

  if (
    localPart === 'admin' ||
    localPart.startsWith('admin.') ||
    localPart.startsWith('admin_')
  ) {
    return 'admin';
  }
  if (
    localPart === 'instructor' ||
    localPart.startsWith('instructor.') ||
    localPart.startsWith('instructor_')
  ) {
    return 'instructor';
  }
  return 'student';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('codelearn_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    return null;
  });

  // 5 minute inactivity timeout
  useEffect(() => {
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (user) {
        inactivityTimer = setTimeout(() => {
          logout();
          alert('You have been logged out due to 5 minutes of inactivity.');
        }, 5 * 60 * 1000);
      }
    };

    if (user) {
      resetTimer();
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
    }

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('codelearn_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('codelearn_user');
    }
  }, [user]);

  const login = async (email, password, customName = '') => {
    try {
      const response = await auth.login(email, password, customName);
      const { access, refresh, user: userData } = response;
      localStorage.setItem('codelearn_user', JSON.stringify(userData));
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Login failed', err);
      throw err;
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      await auth.logout(refresh);
    }
    setUser(null);
    localStorage.removeItem('codelearn_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  // Placeholder for token refresh (no-op for mock)
  const refreshAccess = async () => {
    // In a real app, you would call your backend to refresh tokens.
    return Promise.resolve();
  };


  const switchRole = (newRole) => {
    if (DEFAULT_USERS[newRole]) {
      setUser(DEFAULT_USERS[newRole]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
