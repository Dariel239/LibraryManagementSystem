const GENRE_COLORS = {
  'sci-fi': 'var(--spine-scifi)',
  'science fiction': 'var(--spine-scifi)',
  fantasy: 'var(--spine-fantasy)',
  'non-fiction': 'var(--spine-nonfiction)',
  nonfiction: 'var(--spine-nonfiction)',
  fiction: 'var(--spine-fiction)',
  'self-help': 'var(--spine-selfhelp)',
};

export function spineColor(genre) {
  if (!genre) return 'var(--spine-default)';
  return GENRE_COLORS[genre.toLowerCase()] || 'var(--spine-default)';
}

export default function SpineTag({ genre }) {
  return (
    <span
      className="inline-block w-1.5 h-8 rounded-full shrink-0"
      style={{ backgroundColor: spineColor(genre) }}
      title={genre || 'Uncategorized'}
      aria-hidden="true"
    />
  );
}
