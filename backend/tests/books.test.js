const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/bookModel');
jest.mock('../src/services/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateForBookChange: jest.fn(),
}));
const cache = require('../src/services/cache');
const BookModel = require('../src/models/bookModel');
const app = require('../src/app');

function tokenFor(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const regularUser = { id: 1, email: 'user@example.com', role: 'user' };
const otherUser = { id: 2, email: 'other@example.com', role: 'user' };
const adminUser = { id: 99, email: 'admin@example.com', role: 'admin' };

describe('Book routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(401);
  });

  describe('GET /api/books', () => {
    it('returns only the logged-in user\'s books for a regular user', async () => {
      BookModel.findByUser.mockResolvedValue({ rows: [{ id: 1, title: 'Dune', user_id: 1 }], total: 1 });

      const res = await request(app)
        .get('/api/books')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

      expect(res.status).toBe(200);
      expect(BookModel.findByUser).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 20,
        search: '',
        sortColumn: 'books.created_at',
        sortDir: 'DESC',
      });
      expect(BookModel.findAll).not.toHaveBeenCalled();
      expect(res.body.books).toHaveLength(1);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('returns all books for an admin', async () => {
      BookModel.findAll.mockResolvedValue({
        rows: [
          { id: 1, title: 'Dune', user_id: 1 },
          { id: 2, title: '1984', user_id: 2 },
        ],
        total: 2,
      });

      const res = await request(app)
        .get('/api/books')
        .set('Authorization', `Bearer ${tokenFor(adminUser)}`);

      expect(res.status).toBe(200);
      expect(BookModel.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: '',
        sortColumn: 'books.created_at',
        sortDir: 'DESC',
      });
      expect(res.body.books).toHaveLength(2);
    });

    it('respects page/limit query params', async () => {
      BookModel.findByUser.mockResolvedValue({ rows: [], total: 45 });

      const res = await request(app)
        .get('/api/books?page=2&limit=10')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

      expect(res.status).toBe(200);
      expect(BookModel.findByUser).toHaveBeenCalledWith(1, {
        page: 2,
        limit: 10,
        search: '',
        sortColumn: 'books.created_at',
        sortDir: 'DESC',
      });
      expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
    });

    it('passes a search term through to the model', async () => {
      BookModel.findByUser.mockResolvedValue({ rows: [], total: 0 });

      const res = await request(app)
        .get('/api/books?search=dune')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

      expect(res.status).toBe(200);
      expect(BookModel.findByUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ search: 'dune' })
      );
      expect(res.body.search).toBe('dune');
    });

    it('passes a valid sortBy/sortDir through to the model', async () => {
      BookModel.findByUser.mockResolvedValue({ rows: [], total: 0 });

      const res = await request(app)
        .get('/api/books?sortBy=price&sortDir=asc')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

      expect(res.status).toBe(200);
      expect(BookModel.findByUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ sortColumn: 'books.price', sortDir: 'ASC' })
      );
      expect(res.body.sort).toEqual({ sortBy: 'price', sortDir: 'asc' });
    });

    it('ignores an invalid sortBy and falls back to created_at', async () => {
      BookModel.findByUser.mockResolvedValue({ rows: [], total: 0 });

      const res = await request(app)
        .get('/api/books?sortBy=password')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

      expect(res.status).toBe(200);
      expect(BookModel.findByUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ sortColumn: 'books.created_at' })
      );
    });
  });

  describe('POST /api/books', () => {
    it('creates a book for the authenticated user', async () => {
      BookModel.create.mockResolvedValue({ id: 5, title: 'Dune', author: 'Frank Herbert', user_id: 1 });

      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
        .send({ title: 'Dune', author: 'Frank Herbert', genre: 'Sci-Fi' });

      expect(res.status).toBe(201);
      expect(BookModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, title: 'Dune', author: 'Frank Herbert' })
      );
      expect(cache.invalidateForBookChange).toHaveBeenCalledWith(1);
    });

    it('rejects a book without required fields', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
        .send({ genre: 'Sci-Fi' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('allows the owner to update their own book', async () => {
      BookModel.findById.mockResolvedValue({ id: 1, user_id: 1, title: 'Old Title' });
      BookModel.update.mockResolvedValue({ id: 1, user_id: 1, title: 'New Title' });

      const res = await request(app)
        .put('/api/books/1')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.book.title).toBe('New Title');
    });

    it('blocks a non-owner, non-admin from updating the book', async () => {
      BookModel.findById.mockResolvedValue({ id: 1, user_id: 1, title: 'Old Title' });

      const res = await request(app)
        .put('/api/books/1')
        .set('Authorization', `Bearer ${tokenFor(otherUser)}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(BookModel.update).not.toHaveBeenCalled();
    });

    it('allows an admin to update any book', async () => {
      BookModel.findById.mockResolvedValue({ id: 1, user_id: 1, title: 'Old Title' });
      BookModel.update.mockResolvedValue({ id: 1, user_id: 1, title: 'Admin Edited' });

      const res = await request(app)
        .put('/api/books/1')
        .set('Authorization', `Bearer ${tokenFor(adminUser)}`)
        .send({ title: 'Admin Edited' });

      expect(res.status).toBe(200);
      expect(res.body.book.title).toBe('Admin Edited');
      // invalidates the book OWNER's cache (user 1), not the acting admin's
      expect(cache.invalidateForBookChange).toHaveBeenCalledWith(1);
    });

    it('returns 404 for a nonexistent book', async () => {
      BookModel.findById.mockResolvedValue(undefined);

      const res = await request(app)
        .put('/api/books/999')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
        .send({ title: 'Whatever' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('allows the owner to delete their own book', async () => {
      BookModel.findById.mockResolvedValue({ id: 1, user_id: 1 });
      BookModel.delete.mockResolvedValue();

      const res = await request(app)
        .delete('/api/books/1')
        .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

      expect(res.status).toBe(204);
      expect(BookModel.delete).toHaveBeenCalledWith('1');
      expect(cache.invalidateForBookChange).toHaveBeenCalledWith(1);
    });

    it('blocks a non-owner, non-admin from deleting the book', async () => {
      BookModel.findById.mockResolvedValue({ id: 1, user_id: 1 });

      const res = await request(app)
        .delete('/api/books/1')
        .set('Authorization', `Bearer ${tokenFor(otherUser)}`);

      expect(res.status).toBe(403);
      expect(BookModel.delete).not.toHaveBeenCalled();
    });
  });
});
