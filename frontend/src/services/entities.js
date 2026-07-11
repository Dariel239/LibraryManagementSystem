import api from './api';

export const bookService = {
  list: (page = 1, limit = 20) =>
    api.get('/books', { params: { page, limit } }).then((res) => res.data),
  create: (data) => api.post('/books', data).then((res) => res.data.book),
  update: (id, data) => api.put(`/books/${id}`, data).then((res) => res.data.book),
  remove: (id) => api.delete(`/books/${id}`),
};

export const aiService = {
  query: (question) => api.post('/ai/query', { question }).then((res) => res.data),
  insights: () => api.get('/insights').then((res) => res.data),
  recommendations: () => api.get('/recommendations').then((res) => res.data),
};

export const adminService = {
  listUsers: (page = 1, limit = 20) =>
    api.get('/admin/users', { params: { page, limit } }).then((res) => res.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  listAllBooks: (page = 1, limit = 20) =>
    api.get('/admin/books', { params: { page, limit } }).then((res) => res.data),
};
