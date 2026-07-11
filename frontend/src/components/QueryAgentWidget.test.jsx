import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueryAgentWidget from './QueryAgentWidget';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../services/entities', () => ({
  aiService: { query: vi.fn() },
}));
import { aiService } from '../services/entities';

describe('QueryAgentWidget', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows admin-oriented example questions for an admin user', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
    render(<QueryAgentWidget />);
    expect(screen.getByText('Who owns the most books?')).toBeInTheDocument();
  });

  it('shows self-scoped example questions for a regular user, hiding admin-only ones', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'user' } });
    render(<QueryAgentWidget />);
    expect(screen.queryByText('Who owns the most books?')).not.toBeInTheDocument();
    expect(screen.getByText('What genre do I read most?')).toBeInTheDocument();
  });

  it('submits a question and renders the summary plus results table', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
    aiService.query.mockResolvedValue({
      summary: 'Top result: "Alice" with a value of 4.',
      results: [{ group_label: 'Alice', value: 4 }],
    });

    render(<QueryAgentWidget />);
    await userEvent.type(screen.getByPlaceholderText('Who owns the most books?'), 'who owns the most books?');
    await userEvent.click(screen.getByText('Ask'));

    await waitFor(() => expect(screen.getByText(/Top result: "Alice"/)).toBeInTheDocument());
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows a friendly error message when the query fails', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'user' } });
    aiService.query.mockRejectedValue({
      response: { data: { error: 'I can only answer questions about your book library.' } },
    });

    render(<QueryAgentWidget />);
    await userEvent.type(screen.getByPlaceholderText('Who owns the most books?'), 'I like cookies');
    await userEvent.click(screen.getByText('Ask'));

    expect(await screen.findByText(/only answer questions about your book library/)).toBeInTheDocument();
  });

  it('does not submit an empty question', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
    render(<QueryAgentWidget />);
    await userEvent.click(screen.getByText('Ask'));
    expect(aiService.query).not.toHaveBeenCalled();
  });
});
