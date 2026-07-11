import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-primary hover:bg-black/5'
    }`;

  return (
    <header className="bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display text-xl font-semibold text-primary">Shelf</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/library" className={linkClass}>My Library</NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={linkClass}>Admin</NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted hover:text-primary transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
