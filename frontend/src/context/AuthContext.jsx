import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('rideshare_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('rideshare_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate and rehydrate auth state on app start
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('rideshare_token');
      if (storedToken) {
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('rideshare_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await authService.login({ email, password });
      if (res.success && res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('rideshare_token', res.token);
        localStorage.setItem('rideshare_user', JSON.stringify(res.user));
        return { success: true, user: res.user, isVerified: res.user?.isVerified };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to login';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, phone, password) => {
    setAuthError(null);
    try {
      const res = await authService.register({ name, email, phone, password });
      if (res.success && res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('rideshare_token', res.token);
        localStorage.setItem('rideshare_user', JSON.stringify(res.user));
        return {
          success: true,
          user: res.user,
          isVerified: res.user?.isVerified,
          devOtp: res.devOtp,
        };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to register';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const sendOtp = async (email) => {
    try {
      const res = await authService.sendOtp(email);
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP';
      return { success: false, message: msg };
    }
  };

  const verifyOtp = async (otp, email) => {
    try {
      const res = await authService.verifyOtp({ otp, email });
      if (res.success && res.user) {
        setUser(res.user);
        if (res.token) {
          setToken(res.token);
          localStorage.setItem('rideshare_token', res.token);
        }
        localStorage.setItem('rideshare_user', JSON.stringify(res.user));
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification failed';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthError(null);
    localStorage.removeItem('rideshare_token');
    localStorage.removeItem('rideshare_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isVerified: user?.isVerified === true,
        loading,
        authError,
        login,
        register,
        sendOtp,
        verifyOtp,
        logout,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
