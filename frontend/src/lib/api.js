import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Clients API
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// Contracts API
export const contractsAPI = {
  getAll: (clientId) => api.get('/contracts', { params: { client_id: clientId } }),
  getOne: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  delete: (id) => api.delete(`/contracts/${id}`),
};

// Quotes API
export const quotesAPI = {
  getAll: (clientId) => api.get('/quotes', { params: { client_id: clientId } }),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  updateStatus: (id, stato) => api.put(`/quotes/${id}/status`, null, { params: { stato } }),
  delete: (id) => api.delete(`/quotes/${id}`),
};

// Invoices API
export const invoicesAPI = {
  getAll: (clientId) => api.get('/invoices', { params: { client_id: clientId } }),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, stato) => api.put(`/invoices/${id}/status`, null, { params: { stato } }),
  delete: (id) => api.delete(`/invoices/${id}`),
};

// Deadlines API
export const deadlinesAPI = {
  getAll: () => api.get('/deadlines'),
  create: (data) => api.post('/deadlines', data),
  complete: (id) => api.put(`/deadlines/${id}/complete`),
  delete: (id) => api.delete(`/deadlines/${id}`),
};

// Services API
export const servicesAPI = {
  getAll: () => api.get('/services'),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

// Projects API
export const projectsAPI = {
  getAll: (clientId) => api.get('/projects', { params: { client_id: clientId } }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  updateStatus: (id, stato) => api.put(`/projects/${id}/status`, null, { params: { stato } }),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Time Entries API
export const timeEntriesAPI = {
  getAll: (projectId) => api.get('/time-entries', { params: { project_id: projectId } }),
  create: (data) => api.post('/time-entries', data),
  delete: (id) => api.delete(`/time-entries/${id}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getProjectsInProgress: () => api.get('/dashboard/projects-in-progress'),
  getRevenueChart: () => api.get('/dashboard/revenue-chart'),
  getServicesDistribution: () => api.get('/dashboard/services-distribution'),
};

export default api;
