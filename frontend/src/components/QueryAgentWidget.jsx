import { useState } from 'react';
import { aiService } from '../services/entities';
import { useAuth } from '../context/AuthContext';

const ADMIN_EXAMPLES = ['Who owns the most books?', 'Show the 5 most expensive books', 'Most popular genre'];
const USER_EXAMPLES = ['What genre do I read most?', 'Show my 5 most expensive books', 'How many books have I completed?'];

export default function QueryAgentWidget() {
  const { user } = useAuth();
  const examples = user?.role === 'admin' ? ADMIN_EXAMPLES : USER_EXAMPLES;
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runQuery(q) {
    const text = (q ?? question).trim();
    if (!text) return;
    setQuestion(text);
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await aiService.query(text);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not process that question.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runQuery();
  }

  const columns = result?.results?.length ? Object.keys(result.results[0]) : [];

  return (
    <div className="bg-surface border border-border rounded-xl p-5 sticky top-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <h2 className="font-display text-lg font-semibold text-primary">Ask your library</h2>
      </div>
      <p className="text-sm text-muted mb-4">Ask a question about the books in plain English.</p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Who owns the most books?"
          rows={2}
          maxLength={300}
          className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none resize-none text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-60"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => runQuery(ex)}
            className="text-xs text-muted border border-border rounded-full px-2.5 py-1 hover:border-accent hover:text-accent transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-4">{error}</p>
      )}

      {result && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm text-primary font-medium mb-3">{result.summary}</p>

          {result.results.length > 0 && (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    {columns.map((col) => (
                      <th key={col} className="px-1 py-1.5 font-medium">{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      {columns.map((col) => (
                        <td key={col} className="px-1 py-1.5 text-primary">
                          {row[col] != null ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
