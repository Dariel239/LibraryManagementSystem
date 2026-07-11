const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }) } },
  }));
});

jest.mock('../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const app = require('../src/app');

function tokenFor(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /api/recommendations', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/recommendations');
    expect(res.status).toBe(401);
  });

  it('returns a recommendations payload for an authenticated user', async () => {
    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${tokenFor({ id: 1, role: 'user' })}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('source');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });
});
