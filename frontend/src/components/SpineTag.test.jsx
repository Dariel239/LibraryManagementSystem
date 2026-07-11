import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SpineTag, { spineColor } from '../components/SpineTag';

describe('spineColor', () => {
  it('maps known genres case-insensitively to consistent colors', () => {
    expect(spineColor('Sci-Fi')).toBe('var(--spine-scifi)');
    expect(spineColor('sci-fi')).toBe('var(--spine-scifi)');
    expect(spineColor('SCI-FI')).toBe('var(--spine-scifi)');
  });

  it('falls back to a default color for unknown genres', () => {
    expect(spineColor('Zorbo Fiction')).toBe('var(--spine-default)');
  });

  it('falls back to a default color when genre is missing', () => {
    expect(spineColor(null)).toBe('var(--spine-default)');
    expect(spineColor(undefined)).toBe('var(--spine-default)');
    expect(spineColor('')).toBe('var(--spine-default)');
  });
});

describe('SpineTag', () => {
  it('renders with the genre as an accessible title', () => {
    const { container } = render(<SpineTag genre="Fantasy" />);
    const tag = container.querySelector('span');
    expect(tag).toHaveAttribute('title', 'Fantasy');
  });

  it('labels uncategorized books when genre is missing', () => {
    const { container } = render(<SpineTag genre={null} />);
    const tag = container.querySelector('span');
    expect(tag).toHaveAttribute('title', 'Uncategorized');
  });
});
