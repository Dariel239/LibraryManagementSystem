import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { adminService } from '../services/entities';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadUsers(1);
  }, []);

  async function loadUsers(page) {
    setLoading(true);
    try {
      const data = await adminService.listUsers(page, pagination.limit);
      setUsers(data.users);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user) {
    if (!confirm(`Delete ${user.name}'s account? This will also permanently delete all of their books. This can't be undone.`)) return;
    setActionError('');
    try {
      await adminService.deleteUser(user.id);
      const nextPage = users.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      loadUsers(nextPage);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Could not delete this user.');
    }
  }

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Admin</h1>
      <p className="text-sm text-muted mb-6">Manage registered users. Roles cannot be changed here.</p>

      {loading && <p className="text-muted text-sm">Loading users…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      {!loading && !error && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-primary font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-sm font-medium text-muted hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => loadUsers(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="text-sm font-medium text-primary border border-border rounded-md px-3 py-1.5 hover:bg-black/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
          </span>
          <button
            onClick={() => loadUsers(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="text-sm font-medium text-primary border border-border rounded-md px-3 py-1.5 hover:bg-black/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </AppLayout>
  );
}
