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
    // Default logged in user as student for quick preview, or null if unauthenticated
    return DEFAULT_USERS.student;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('codelearn_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('codelearn_user');
    }
  }, [user]);

  const login = (email, password, role = 'student', customName = '') => {
    let userData = DEFAULT_USERS[role] || DEFAULT_USERS.student;
    
    // If user provided a custom email or name, override
    if (email) {
      userData = {
        ...userData,
        email: email,
        name: customName || (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)),
        avatar: (customName || email)[0].toUpperCase(),
        role: role
      };
    } else {
      userData = {
        ...userData,
        role: role
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
