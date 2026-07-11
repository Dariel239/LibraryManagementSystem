export default function InsightsPanel({ data }) {
  if (!data) return null;
  const { stats, insights } = data;

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h2 className="font-display text-lg font-semibold text-primary mb-1">Library Insights</h2>
      <p className="text-sm text-muted mb-4">
        {stats.scope === 'admin' ? 'Across your whole library' : 'Based on your reading history'}
      </p>

      <ul className="space-y-2 mb-5">
        {insights.map((line, i) => (
          <li key={i} className="flex gap-2 text-sm text-primary">
            <span className="text-accent">›</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
        {stats.scope === 'admin' ? (
          <>
            <Stat label="Users" value={stats.total_users} />
            <Stat label="Books" value={stats.total_books} />
            <Stat label="Avg price" value={stats.avg_price != null ? `$${stats.avg_price}` : '—'} />
          </>
        ) : (
          <>
            <Stat label="Books" value={stats.total_books} />
            <Stat label="Avg pages" value={stats.avg_pages ?? '—'} />
            <Stat label="Top genre" value={stats.top_genres?.[0]?.genre ?? '—'} />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="font-mono text-lg text-primary font-medium">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
