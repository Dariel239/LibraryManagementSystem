import SpineTag from './SpineTag';

export default function RecommendationsPanel({ data }) {
  if (!data) return null;
  const { recommendations, source } = data;

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h2 className="font-display text-lg font-semibold text-primary mb-1">Recommended for you</h2>
      <p className="text-sm text-muted mb-4">Based on the genres you read most</p>

      {recommendations.length === 0 && (
        <p className="text-sm text-muted">Add a few books to get personalized recommendations.</p>
      )}

      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3">
            <SpineTag genre={rec.genre} />
            <div className="min-w-0">
              <p className="font-medium text-primary text-sm">
                {rec.title}
                {rec.unverified && (
                  <span className="ml-2 text-xs text-accent font-normal">AI-suggested, unverified</span>
                )}
              </p>
              <p className="text-xs text-muted">{rec.author}</p>
              {rec.reason && <p className="text-xs text-muted mt-0.5">{rec.reason}</p>}
            </div>
          </div>
        ))}
      </div>

      {source === 'generative' && recommendations.length > 0 && (
        <p className="text-xs text-muted mt-4 pt-4 border-t border-border">
          Not enough data in the library yet — these are AI suggestions based on your genres, not verified against your collection.
        </p>
      )}
    </div>
  );
}
