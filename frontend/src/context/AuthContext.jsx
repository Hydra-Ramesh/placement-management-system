import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('spms_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res.success) {
          setUser(res.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to authenticate stored token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    if (res.success && res.token) {
      localStorage.setItem('spms_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (studentData) => {
    const res = await api.register(studentData);
    if (res.success && res.token) {
      localStorage.setItem('spms_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('spms_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isStudent: user?.role === 'Student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

