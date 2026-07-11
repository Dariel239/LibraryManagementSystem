/**
 * Groq's gpt-oss models have a documented bug where "strict" json_schema mode
 * (their guaranteed structured-output mode) still fails validation on its own
 * schema a meaningful fraction of the time, and can leak internal reasoning
 * text into the output. Rather than relying on that broken guarantee, we:
 *  - use plain JSON mode with reasoning_effort suppressed (less leaked text)
 *  - salvage JSON even if the model wraps it in stray text or markdown fences
 *  - retry once at a lower temperature if the first attempt still fails
 *  - never leak the raw provider error to the caller
 */
function extractJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Salvage: strip markdown fences and grab the outermost {...} block
    const stripped = raw.replace(/```json|```/g, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw err;
    return JSON.parse(stripped.slice(start, end + 1));
  }
}

async function safeJsonCompletion(client, { model, messages, temperature = 0, max_tokens = 400 }) {
  const attempts = [temperature, Math.max(temperature - 0.2, 0)];

  let lastErr;
  for (const attemptTemp of attempts) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: attemptTemp,
        max_tokens,
        response_format: { type: 'json_object' },
        reasoning_effort: 'low',
      });

      const raw = completion.choices[0].message.content;
      return extractJson(raw);
    } catch (err) {
      lastErr = err;
    }
  }

  console.error('AI JSON completion failed after retry:', lastErr?.message);
  throw new Error('The AI could not process this request right now. Please try rephrasing or try again shortly.');
}

module.exports = { safeJsonCompletion };
