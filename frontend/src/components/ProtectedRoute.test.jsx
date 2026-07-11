import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRoute(initialPath, adminOnly = false) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute adminOnly={adminOnly}>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderWithRoute('/protected');
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('redirects to /login when there is no authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderWithRoute('/protected');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders the protected content for an authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'user' }, loading: false });
    renderWithRoute('/protected');
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('redirects a non-admin away from an admin-only route', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'user' }, loading: false });
    renderWithRoute('/protected', true);
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('allows an admin into an admin-only route', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'admin' }, loading: false });
    renderWithRoute('/protected', true);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });
});
