const { checkLengths } = require('../src/utils/validation');

describe('checkLengths', () => {
  it('returns null when all fields are within bounds', () => {
    expect(checkLengths({ book_title: 'Dune', book_author: 'Frank Herbert' })).toBeNull();
  });

  it('returns null for missing/null values (required-ness is checked elsewhere)', () => {
    expect(checkLengths({ book_genre: null, book_title: undefined })).toBeNull();
  });

  it('flags a title exceeding 255 characters', () => {
    const longTitle = 'x'.repeat(256);
    const err = checkLengths({ book_title: longTitle });
    expect(err).toMatch(/255 characters or fewer/);
  });

  it('flags an author exceeding 150 characters', () => {
    const err = checkLengths({ book_author: 'x'.repeat(151) });
    expect(err).toMatch(/150 characters or fewer/);
  });

  it('flags a user name exceeding 100 characters', () => {
    const err = checkLengths({ user_name: 'x'.repeat(101) });
    expect(err).toMatch(/100 characters or fewer/);
  });

  it('flags an email exceeding 150 characters', () => {
    const err = checkLengths({ user_email: 'x'.repeat(145) + '@a.com' });
    expect(err).toMatch(/150 characters or fewer/);
  });

  it('checks fields in order and returns the first violation', () => {
    const err = checkLengths({ book_title: 'x'.repeat(300), book_author: 'x'.repeat(200) });
    expect(err).toMatch(/title/);
  });
});
