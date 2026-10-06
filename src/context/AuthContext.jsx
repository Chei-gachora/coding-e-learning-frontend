import { createContext, useContext, useState, useEffect } from 'react';

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

  const login = (email, password, customName = '') => {
    // Auto-detect role from the email — no manual role selection needed
    const role = detectRoleFromEmail(email);
    let userData = DEFAULT_USERS[role] || DEFAULT_USERS.student;

    if (email) {
      userData = {
        ...userData,
        email: email,
        name:
          customName ||
          email.split('@')[0].charAt(0).toUpperCase() +
            email.split('@')[0].slice(1),
        avatar: (customName || email)[0].toUpperCase(),
        role: role,
        id: 'usr_' + role + '_' + email.toLowerCase().replace(/[^a-z0-9]/g, ''),
      };
    }

    setUser(userData);
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('codelearn_user');
  };

  const switchRole = (newRole) => {
    if (DEFAULT_USERS[newRole]) {
      setUser(DEFAULT_USERS[newRole]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
