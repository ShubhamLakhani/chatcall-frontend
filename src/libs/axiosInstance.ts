import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}api/` || 'http://localhost:3001/api/',
  withCredentials: true, // send cookies if needed
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add request/response interceptors here
axiosInstance.interceptors.request.use(
  (config) => {
    // You can attach a token from localStorage or Redux here
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error logging or redirect
    if (error.response?.status === 401) {
      console.warn('Unauthorized – maybe redirect to login');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
