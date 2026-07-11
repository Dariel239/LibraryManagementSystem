const { safeJsonCompletion } = require('../src/services/llmJson');

function mockClient(responses) {
  let call = 0;
  return {
    chat: {
      completions: {
        create: jest.fn(() => {
          const r = responses[call++];
          if (r instanceof Error) return Promise.reject(r);
          return Promise.resolve({ choices: [{ message: { content: JSON.stringify(r) } }] });
        }),
      },
    },
  };
}

describe('safeJsonCompletion', () => {
  it('returns parsed JSON on first success', async () => {
    const client = mockClient([{ hello: 'world' }]);
    const result = await safeJsonCompletion(client, { model: 'x', messages: [] });
    expect(result).toEqual({ hello: 'world' });
    expect(client.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it('retries once at a lower temperature after a server-side JSON validation failure', async () => {
    const groqError = Object.assign(new Error('Failed to generate JSON. Please adjust your prompt.'), {
      status: 400,
    });
    const client = mockClient([groqError, { hello: 'recovered' }]);

    const result = await safeJsonCompletion(client, { model: 'x', messages: [], temperature: 0.4 });

    expect(result).toEqual({ hello: 'recovered' });
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
    expect(client.chat.completions.create.mock.calls[1][0].temperature).toBeCloseTo(0.2);
  });

  it('throws a clean, user-safe error after both attempts fail', async () => {
    const err1 = new Error('Failed to generate JSON');
    const err2 = new Error('Failed to generate JSON');
    const client = mockClient([err1, err2]);

    await expect(safeJsonCompletion(client, { model: 'x', messages: [] })).rejects.toThrow(
      'The AI could not process this request right now'
    );
  });

  it('always uses plain json_object mode with reasoning suppressed (schema mode dropped due to Groq bug)', async () => {
    const client = mockClient([{ ok: true }]);
    await safeJsonCompletion(client, { model: 'x', messages: [] });

    const callArgs = client.chat.completions.create.mock.calls[0][0];
    expect(callArgs.response_format.type).toBe('json_object');
    expect(callArgs.reasoning_effort).toBe('low');
  });

  it('salvages JSON wrapped in stray text or markdown fences', async () => {
    const client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '```json\n{"hello": "world"}\n```' } }],
          }),
        },
      },
    };

    const result = await safeJsonCompletion(client, { model: 'x', messages: [] });
    expect(result).toEqual({ hello: 'world' });
  });
});
