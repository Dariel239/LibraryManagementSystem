import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import InsightsPanel from '../components/InsightsPanel';
import RecommendationsPanel from '../components/RecommendationsPanel';
import { aiService } from '../services/entities';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([aiService.insights(), aiService.recommendations()])
      .then(([insightsData, recData]) => {
        setInsights(insightsData);
        setRecommendations(recData);
      })
      .catch(() => setError('Could not load your dashboard right now.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-primary">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-muted mt-0.5">Here's what's happening in your library.</p>
      </div>

      {loading && <p className="text-muted text-sm">Loading dashboard…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InsightsPanel data={insights} />
          <RecommendationsPanel data={recommendations} />
        </div>
      )}
    </AppLayout>
  );
}
