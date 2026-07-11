const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/userModel');
jest.mock('../src/models/bookModel');
jest.mock('../src/services/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateForBookChange: jest.fn(),
}));
const UserModel = require('../src/models/userModel');
const BookModel = require('../src/models/bookModel');
const app = require('../src/app');

function tokenFor(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const admin = { id: 99, email: 'admin@example.com', role: 'admin' };
const regularUser = { id: 1, email: 'user@example.com', role: 'user' };

describe('Admin routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a non-admin from any admin route', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(regularUser)}`);
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  describe('GET /api/admin/users', () => {
    it('lists all users for an admin', async () => {
      UserModel.findAll.mockResolvedValue({
        rows: [
          { id: 1, name: 'Alice', role: 'user' },
          { id: 99, name: 'Admin', role: 'admin' },
        ],
        total: 2,
      });

      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(admin)}`);
      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('allows an admin to delete a regular user', async () => {
      UserModel.findById.mockResolvedValue({ id: 1, role: 'user' });

      const res = await request(app)
        .delete('/api/admin/users/1')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(204);
      expect(UserModel.delete).toHaveBeenCalledWith(1);
    });

    it('blocks an admin from deleting their own account', async () => {
      UserModel.findById.mockResolvedValue({ id: 99, role: 'admin' });

      const res = await request(app)
        .delete('/api/admin/users/99')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/own admin account/);
      expect(UserModel.delete).not.toHaveBeenCalled();
    });

    it('blocks deleting the last remaining admin', async () => {
      const otherAdmin = { id: 50, email: 'admin2@example.com', role: 'admin' };
      UserModel.findById.mockResolvedValue({ id: 50, role: 'admin' });
      UserModel.countAdmins.mockResolvedValue(1);

      const res = await request(app)
        .delete('/api/admin/users/50')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/last remaining admin/);
      expect(UserModel.delete).not.toHaveBeenCalled();
    });

    it('allows deleting an admin when other admins remain', async () => {
      UserModel.findById.mockResolvedValue({ id: 50, role: 'admin' });
      UserModel.countAdmins.mockResolvedValue(2);

      const res = await request(app)
        .delete('/api/admin/users/50')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(204);
      expect(UserModel.delete).toHaveBeenCalledWith(50);
    });

    it('returns 404 for a nonexistent user', async () => {
      UserModel.findById.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/admin/users/999')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/books', () => {
    it('lists all books across all users', async () => {
      BookModel.findAll.mockResolvedValue({ rows: [{ id: 1, title: 'Dune', owner_name: 'Alice' }], total: 1 });

      const res = await request(app).get('/api/admin/books').set('Authorization', `Bearer ${tokenFor(admin)}`);
      expect(res.status).toBe(200);
      expect(res.body.books).toHaveLength(1);
    });
  });
});
