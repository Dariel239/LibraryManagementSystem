import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookForm from './BookForm';

describe('BookForm', () => {
  it('shows a validation error when title or author is missing', async () => {
    const onSave = vi.fn();
    render(<BookForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.click(screen.getByText('Save'));

    expect(await screen.findByText(/Title and author are required/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits a well-formed payload with numeric fields coerced correctly', async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<BookForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Dune');
    await userEvent.type(screen.getByLabelText('Author'), 'Frank Herbert');
    await userEvent.type(screen.getByLabelText('Genre'), 'Sci-Fi');
    await userEvent.type(screen.getByLabelText('Pages'), '412');
    await userEvent.type(screen.getByLabelText('Price'), '14.99');
    await userEvent.type(screen.getByLabelText('Rating'), '4.8');

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'Sci-Fi',
        status: 'to-read',
        pages: 412,
        price: 14.99,
        rating: 4.8,
      })
    );
  });

  it('pre-fills fields when editing an existing book', () => {
    const book = {
      id: 1,
      title: 'Foundation',
      author: 'Isaac Asimov',
      genre: 'Sci-Fi',
      status: 'reading',
      pages: 255,
      price: 12.5,
      rating: 4.5,
    };
    render(<BookForm book={book} onSave={() => {}} onCancel={() => {}} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Foundation');
    expect(screen.getByLabelText('Author')).toHaveValue('Isaac Asimov');
    expect(screen.getByText('Edit book')).toBeInTheDocument();
  });

  it('sends null for optional numeric fields left empty', async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<BookForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Untitled Draft');
    await userEvent.type(screen.getByLabelText('Author'), 'Anonymous');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ pages: null, price: null, rating: null, genre: null })
      )
    );
  });

  it('shows a server error message when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue({ response: { data: { error: 'Not authorized' } } });
    render(<BookForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Dune');
    await userEvent.type(screen.getByLabelText('Author'), 'Frank Herbert');
    await userEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<BookForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
