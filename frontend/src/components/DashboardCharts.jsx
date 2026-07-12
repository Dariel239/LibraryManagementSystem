import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { spineColor } from './SpineTag';

const STATUS_COLORS = {
  'to-read': '#9CA3AF',
  reading: '#E8720C',
  completed: '#059669',
};

const STATUS_LABELS = {
  'to-read': 'To Read',
  reading: 'Reading',
  completed: 'Completed',
};

export function GenreBarChart({ genres }) {
  if (!genres || genres.length === 0) return null;

  const data = genres.map((g) => ({ name: g.genre, count: g.count }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={{ fontSize: 12, fill: '#1F2937' }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E3DE' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={spineColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ statusBreakdown }) {
  if (!statusBreakdown || statusBreakdown.length === 0) return null;

  const data = statusBreakdown.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#9CA3AF',
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E3DE' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
