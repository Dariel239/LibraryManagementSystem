const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({ insights: ['Fantasy is your most-read genre.'] }),
              },
            },
          ],
        }),
      },
    },
  }));
});

jest.mock('../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ count: '1' }] }),
}));

const app = require('../src/app');

function tokenFor(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /api/insights', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/insights');
    expect(res.status).toBe(401);
  });

  it('returns stats and insights for an authenticated user', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${tokenFor({ id: 1, role: 'user' })}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.scope).toBe('user');
    expect(Array.isArray(res.body.insights)).toBe(true);
  });

  it('returns admin-scoped stats for an admin', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${tokenFor({ id: 1, role: 'admin' })}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.scope).toBe('admin');
  });
});
