import axios from 'axios';

/**
 * Axios Centralized API Client
 *
 * INTERVIEW DESIGN DECISIONS:
 * 1. Request Interceptor: Dynamically attaches Bearer JWT to every outgoing HTTP request.
 * 2. Response Interceptor: Intercepts 401 Unauthorized globally, purges expired session data,
 *    and redirects unauthenticated users cleanly to the login screen.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rideshare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('rideshare_token');
      localStorage.removeItem('rideshare_user');
      // Only redirect if not already on auth/login pages to prevent loops
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
