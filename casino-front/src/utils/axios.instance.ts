import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur : ajoute automatiquement le JWT à chaque requête
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur : gère les erreurs 401 (token expiré)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      const message = error.response?.data?.message || '';
      if (
        message.includes('banned') ||
        message.includes('suspended')
      ) {
        localStorage.removeItem('access_token');
        window.location.href = `/login?reason=${encodeURIComponent(message)}`;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;