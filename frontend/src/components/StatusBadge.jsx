const STATUS_STYLES = {
  'to-read': 'bg-gray-100 text-gray-600',
  reading: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS = {
  'to-read': 'To Read',
  reading: 'Reading',
  completed: 'Completed',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
