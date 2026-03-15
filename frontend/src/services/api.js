import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('hp-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
