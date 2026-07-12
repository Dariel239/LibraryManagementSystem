import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import BookRow from '../components/BookRow';
import BookForm from '../components/BookForm';
import ConfirmDialog from '../components/ConfirmDialog';
import QueryAgentWidget from '../components/QueryAgentWidget';
import { bookService } from '../services/entities';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'title:asc', label: 'Title (A–Z)' },
  { value: 'title:desc', label: 'Title (Z–A)' },
  { value: 'rating:desc', label: 'Highest rated' },
  { value: 'price:desc', label: 'Most expensive' },
  { value: 'price:asc', label: 'Least expensive' },
  { value: 'pages:desc', label: 'Longest' },
  { value: 'pages:asc', label: 'Shortest' },
];

export default function LibraryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at:desc');

  const loadBooks = useCallback(
    async (page, overrides = {}) => {
      setLoading(true);
      const [sortBy, sortDir] = (overrides.sort ?? sort).split(':');
      try {
        const data = await bookService.list({
          page,
          limit: pagination.limit,
          search: overrides.search ?? search,
          sortBy,
          sortDir,
        });
        setBooks(data.books);
        setPagination(data.pagination);
        setError('');
      } catch (err) {
        setError('Could not load your books.');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, sort]
  );

  // Debounce search input -> committed search term, reset to page 1
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      loadBooks(1, { search: searchInput });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    loadBooks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSortChange(value) {
    setSort(value);
    loadBooks(1, { sort: value });
  }

  async function handleSave(data) {
    try {
      if (editingBook) {
        await bookService.update(editingBook.id, data);
        showToast('Book updated');
      } else {
        await bookService.create(data);
        showToast('Book added to your library');
      }
      setShowForm(false);
      setEditingBook(null);
      loadBooks(pagination.page);
    } catch (err) {
      throw err; // let BookForm show the inline error
    }
  }

  async function handleDeleteConfirmed() {
    const book = confirmDelete;
    setConfirmDelete(null);
    try {
      await bookService.remove(book.id);
      showToast(`"${book.title}" deleted`);
      const nextPage = books.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      loadBooks(nextPage);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not delete this book.', 'error');
    }
  }

  function canManage(book) {
    return user?.role === 'admin' || book.user_id === user?.id;
  }

  const genres = useMemo(() => {
    const seen = new Map(); // lowercase -> original casing (first seen wins)
    for (const b of books) {
      if (!b.genre) continue;
      const key = b.genre.toLowerCase();
      if (!seen.has(key)) seen.set(key, b.genre);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [books]);

  const filteredBooks = books.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (genreFilter !== 'all' && b.genre?.toLowerCase() !== genreFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-primary">
                {user?.role === 'admin' ? 'All Books' : 'My Library'}
              </h1>
              <p className="text-sm text-muted mt-0.5">
                {filteredBooks.length} shown on this page · {pagination.total} total
              </p>
            </div>
            <button
              onClick={() => { setEditingBook(null); setShowForm(true); }}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              + Add book
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-white text-primary focus:border-accent outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-1.5 bg-white text-primary"
            >
              <option value="all">All statuses</option>
              <option value="to-read">To Read</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-1.5 bg-white text-primary"
            >
              <option value="all">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-1.5 bg-white text-primary ml-auto"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {loading && <p className="text-muted text-sm">Loading books…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && filteredBooks.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-muted">
                {books.length === 0
                  ? search
                    ? `No books match "${search}".`
                    : "No books yet — add your first one."
                  : 'No books match these filters.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {filteredBooks.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                canManage={canManage(book)}
                onEdit={(b) => { setEditingBook(b); setShowForm(true); }}
                onDelete={(b) => setConfirmDelete(b)}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => loadBooks(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="text-sm font-medium text-primary border border-border rounded-md px-3 py-1.5 hover:bg-black/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => loadBooks(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="text-sm font-medium text-primary border border-border rounded-md px-3 py-1.5 hover:bg-black/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <QueryAgentWidget />
        </div>
      </div>

      {showForm && (
        <BookForm
          book={editingBook}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingBook(null); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this book?"
          message={`"${confirmDelete.title}" will be permanently removed. This can't be undone.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AppLayout>
  );
}
