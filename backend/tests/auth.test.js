const request = require('supertest');

jest.mock('../src/models/userModel');
const UserModel = require('../src/models/userModel');
const app = require('../src/app');

describe('Auth routes', () => {
  afterEach(() => jest.clearAllMocks());

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      UserModel.findByEmail.mockResolvedValue(undefined);
      UserModel.countAll.mockResolvedValue(1); // not the first user
      UserModel.create.mockResolvedValue({
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: 'user',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'securePass123',
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('ada@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('makes the very first registered user an admin', async () => {
      UserModel.findByEmail.mockResolvedValue(undefined);
      UserModel.countAll.mockResolvedValue(0); // fresh system, no users yet
      UserModel.create.mockResolvedValue({
        id: 1,
        name: 'First User',
        email: 'first@example.com',
        role: 'admin',
      });

      await request(app).post('/api/auth/register').send({
        name: 'First User',
        email: 'first@example.com',
        password: 'securePass123',
      });

      expect(UserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' })
      );
    });

    it('keeps subsequent registrations as regular users', async () => {
      UserModel.findByEmail.mockResolvedValue(undefined);
      UserModel.countAll.mockResolvedValue(3); // users already exist
      UserModel.create.mockResolvedValue({
        id: 4,
        name: 'Later User',
        email: 'later@example.com',
        role: 'user',
      });

      await request(app).post('/api/auth/register').send({
        name: 'Later User',
        email: 'later@example.com',
        password: 'securePass123',
      });

      expect(UserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' })
      );
    });

    it('rejects registration when required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com' });
      expect(res.status).toBe(400);
    });

    it('rejects registration when email already exists', async () => {
      UserModel.findByEmail.mockResolvedValue({ id: 1, email: 'ada@example.com' });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'securePass123',
      });

      expect(res.status).toBe(409);
    });

    it('rejects a weak password', async () => {
      UserModel.findByEmail.mockResolvedValue(undefined);
      UserModel.countAll.mockResolvedValue(1);

      const res = await request(app).post('/api/auth/register').send({
        name: 'Ada',
        email: 'ada2@example.com',
        password: 'weak',
      });

      expect(res.status).toBe(400);
      expect(UserModel.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('securePass123', 10);

      UserModel.findByEmail.mockResolvedValue({
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: hashedPassword,
        role: 'user',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'ada@example.com',
        password: 'securePass123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('rejects login with wrong password', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('correctPassword', 10);

      UserModel.findByEmail.mockResolvedValue({
        id: 1,
        email: 'ada@example.com',
        password: hashedPassword,
        role: 'user',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'ada@example.com',
        password: 'wrongPassword',
      });

      expect(res.status).toBe(401);
    });

    it('rejects login for unknown email', async () => {
      UserModel.findByEmail.mockResolvedValue(undefined);

      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'whatever',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/me — update profile', () => {
    it('updates the authenticated user\'s name', async () => {
      const jwt = require('jsonwebtoken');
      UserModel.updateName.mockResolvedValue({ id: 1, name: 'New Name', email: 'ada@example.com', role: 'user' });

      const token = jwt.sign({ id: 1, email: 'ada@example.com', role: 'user' }, process.env.JWT_SECRET);
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('New Name');
      expect(UserModel.updateName).toHaveBeenCalledWith(1, 'New Name');
    });

    it('rejects an empty name', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: 1, email: 'ada@example.com', role: 'user' }, process.env.JWT_SECRET);

      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/auth/me/password — change password', () => {
    it('changes the password when the current password is correct', async () => {
      const jwt = require('jsonwebtoken');
      const bcrypt = require('bcryptjs');
      const hashedCurrent = await bcrypt.hash('oldPassword123', 10);
      UserModel.findByEmail.mockResolvedValue({ id: 1, email: 'ada@example.com', password: hashedCurrent });

      const token = jwt.sign({ id: 1, email: 'ada@example.com', role: 'user' }, process.env.JWT_SECRET);
      const res = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldPassword123', newPassword: 'newPassword456' });

      expect(res.status).toBe(200);
      expect(UserModel.updatePassword).toHaveBeenCalledWith(1, expect.any(String));
    });

    it('rejects when the current password is wrong', async () => {
      const jwt = require('jsonwebtoken');
      const bcrypt = require('bcryptjs');
      const hashedCurrent = await bcrypt.hash('oldPassword123', 10);
      UserModel.findByEmail.mockResolvedValue({ id: 1, email: 'ada@example.com', password: hashedCurrent });

      const token = jwt.sign({ id: 1, email: 'ada@example.com', role: 'user' }, process.env.JWT_SECRET);
      const res = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrongOldPassword', newPassword: 'newPassword456' });

      expect(res.status).toBe(401);
      expect(UserModel.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects a weak new password', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: 1, email: 'ada@example.com', role: 'user' }, process.env.JWT_SECRET);

      const res = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldPassword123', newPassword: 'weak' });

      expect(res.status).toBe(400);
    });
  });
});
