import SpineTag from './SpineTag';
import StatusBadge from './StatusBadge';

export default function BookRow({ book, canManage, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-4 bg-surface border border-border rounded-lg px-4 py-3 hover:border-accent/40 transition-colors">
      <SpineTag genre={book.genre} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-semibold text-primary truncate">{book.title}</h3>
          <StatusBadge status={book.status} />
        </div>
        <p className="text-sm text-muted truncate">
          {book.author}
          {book.genre && <span> · {book.genre}</span>}
          {book.owner_name && <span> · owned by {book.owner_name}</span>}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-sm text-muted font-mono shrink-0">
        {book.pages != null && <span>{book.pages}p</span>}
        {book.price != null && <span>${Number(book.price).toFixed(2)}</span>}
        {book.rating != null && <span>★ {Number(book.rating).toFixed(1)}</span>}
      </div>

      {canManage && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(book)}
            className="text-sm font-medium text-primary hover:text-accent transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(book)}
            className="text-sm font-medium text-muted hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
