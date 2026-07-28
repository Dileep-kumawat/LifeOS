import axios from 'axios';
import { env } from './env';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor (Inject Bearer token)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lifeos_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor (Unify error parsing)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Handle 401 token expiration
    if (error.response?.status === 401) {
      localStorage.removeItem('lifeos_access_token');
    }

    return Promise.reject(new Error(message));
  },
);
