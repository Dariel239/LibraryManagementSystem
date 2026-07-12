const SORTABLE_COLUMNS = {
  title: 'books.title',
  author: 'books.author',
  genre: 'books.genre',
  rating: 'books.rating',
  price: 'books.price',
  pages: 'books.pages',
  created_at: 'books.created_at',
};

/** Parses ?search=, ?sortBy=, ?sortDir= for the book listing endpoints. */
function parseListQuery(query) {
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 200) : '';
  const sortBy = SORTABLE_COLUMNS[query.sortBy] ? query.sortBy : 'created_at';
  const sortDir = query.sortDir === 'asc' ? 'ASC' : 'DESC';
  return { search, sortBy, sortColumn: SORTABLE_COLUMNS[sortBy], sortDir };
}

module.exports = { SORTABLE_COLUMNS, parseListQuery };
