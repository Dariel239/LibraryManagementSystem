import { useState, useEffect } from 'react';

const EMPTY = { title: '', author: '', genre: '', status: 'to-read', pages: '', price: '', rating: '' };

export default function BookForm({ book, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title || '',
        author: book.author || '',
        genre: book.genre || '',
        status: book.status || 'to-read',
        pages: book.pages ?? '',
        price: book.price ?? '',
        rating: book.rating ?? '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [book]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      setError('Title and author are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        author: form.author.trim(),
        genre: form.genre.trim() || null,
        status: form.status,
        pages: form.pages ? Number(form.pages) : null,
        price: form.price ? Number(form.price) : null,
        rating: form.rating ? Number(form.rating) : null,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save this book.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-xl border border-border w-full max-w-md p-6">
        <h2 className="font-display text-xl font-semibold text-primary mb-4">
          {book ? 'Edit book' : 'Add a book'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-primary mb-1">Title</label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              maxLength={255}
            />
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-medium text-primary mb-1">Author</label>
            <input
              id="author"
              value={form.author}
              onChange={(e) => update('author', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              maxLength={150}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-primary mb-1">Genre</label>
              <input
                id="genre"
                value={form.genre}
                onChange={(e) => update('genre', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
                placeholder="Sci-Fi"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-primary mb-1">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none bg-white"
              >
                <option value="to-read">To Read</option>
                <option value="reading">Reading</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="pages" className="block text-sm font-medium text-primary mb-1">Pages</label>
              <input
                id="pages"
                type="number"
                min="0"
                value={form.pages}
                onChange={(e) => update('pages', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-primary mb-1">Price</label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              />
            </div>
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-primary mb-1">Rating</label>
              <input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => update('rating', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-border text-primary font-medium py-2 rounded-md hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent hover:bg-accent-hover text-white font-medium py-2 rounded-md transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
