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
                content: JSON.stringify({
                  action: 'aggregate',
                  group_by: 'user',
                  metric: 'book_count',
                  aggregation: 'count',
                  order_dir: 'desc',
                  limit: 5,
                  filters: {},
                }),
              },
            },
          ],
        }),
      },
    },
  }));
});

jest.mock('../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({
    rows: [{ group_label: 'Alice Chen', value: '4' }],
  }),
}));

const app = require('../src/app');

function tokenFor(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /api/ai/query', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).post('/api/ai/query').send({ question: 'who owns the most books' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty question', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${tokenFor({ id: 1, role: 'admin' })}`)
      .send({ question: '' });
    expect(res.status).toBe(400);
  });

  it('returns structured results for a valid question', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${tokenFor({ id: 1, role: 'admin' })}`)
      .send({ question: 'who owns the most books?' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ group_label: 'Alice Chen', value: '4' }]);
    expect(res.body.summary).toContain('Alice Chen');
    expect(res.body.intent.action).toBe('aggregate');
  });

  it('returns a friendly guidance message for an off-topic question, without querying the database', async () => {
    const OpenAI = require('openai');
    const instance = OpenAI.mock.results[0].value; // the single client instance the service already created
    instance.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ action: 'unrelated' }) } }],
    });

    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${tokenFor({ id: 1, role: 'admin' })}`)
      .send({ question: 'I ate some cookies today and really enjoyed them' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/only answer questions about your book library/);
  });
});
