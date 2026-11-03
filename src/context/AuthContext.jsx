import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearLegacyTokens } from '../lib/api';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user?.role) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.username
    || user.email;
  return {
    ...user,
    name,
    avatar: name?.[0]?.toUpperCase() || '?',
    title: {
      student: 'Student Learner',
      instructor: 'Instructor',
      admin: 'Platform Administrator',
    }[user.role] || user.role,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;
    clearLegacyTokens();
    api.me()
      .then((profile) => {
        if (active) setUser(normalizeUser(profile));
      })
      .catch((error) => {
        if (active && error.status !== 401) setAuthError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setAuthError('');
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let timer;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        logout().catch((error) => {
          setAuthError(`Automatic sign-out failed: ${error.message}`);
        });
      }, 5 * 60 * 1000);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [user, logout]);

  const login = useCallback(async (email, password) => {
    setAuthError('');
    const response = await api.login(email, password);
    const nextUser = normalizeUser(response?.user);
    if (!nextUser) {
      throw new Error('The server did not return a valid user session.');
    }
    setUser(nextUser);
    return nextUser;
  }, []);

  const updateProfile = useCallback((profile) => {
    setUser((current) => current ? normalizeUser({ ...current, ...profile }) : current);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
