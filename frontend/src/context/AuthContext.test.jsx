import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '../services/api';

function TestConsumer() {
  const { user, login, register, logout, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.name : 'none'}</span>
      <button onClick={() => login('a@example.com', 'pw')}>login</button>
      <button onClick={() => register('Ada', 'a@example.com', 'pw')}>register</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts with no user and stops loading when there is no token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('logs in, stores the token/user, and updates state', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok123', user: { id: 1, name: 'Ada' } } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));
    expect(localStorage.getItem('token')).toBe('tok123');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, name: 'Ada' });
  });

  it('registers a new user and updates state', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok456', user: { id: 2, name: 'Ada' } } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('register'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));
    expect(localStorage.getItem('token')).toBe('tok456');
  });

  it('logs out and clears stored session', async () => {
    localStorage.setItem('token', 'tok123');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Ada' }));
    api.get.mockResolvedValue({ data: { user: { id: 1, name: 'Ada' } } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('restores the session from a valid token on mount via /auth/me', async () => {
    localStorage.setItem('token', 'tok123');
    api.get.mockResolvedValue({ data: { user: { id: 1, name: 'Restored User' } } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Restored User'));
  });

  it('clears session if the stored token is invalid/expired', async () => {
    localStorage.setItem('token', 'expired-token');
    api.get.mockRejectedValue(new Error('401'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
