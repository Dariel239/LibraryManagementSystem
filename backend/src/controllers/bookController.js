const BookModel = require('../models/bookModel');
const cache = require('../services/cache');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { checkLengths } = require('../utils/validation');

async function listBooks(req, res) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } =
      req.user.role === 'admin'
        ? await BookModel.findAll({ page, limit })
        : await BookModel.findByUser(req.user.id, { page, limit });

    res.json({ books: rows, pagination: buildMeta({ page, limit, total }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
}

async function createBook(req, res) {
  try {
    const { title, author, genre, status, pages, price, rating } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: 'title and author are required' });
    }

    const lengthError = checkLengths({ book_title: title, book_author: author, book_genre: genre });
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    const book = await BookModel.create({
      userId: req.user.id,
      title,
      author,
      genre,
      status,
      pages,
      price,
      rating,
    });
    cache.invalidateForBookChange(req.user.id);
    res.status(201).json({ book });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create book' });
  }
}

async function updateBook(req, res) {
  try {
    const book = await BookModel.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const isOwner = book.user_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this book' });
    }

    const allowedFields = ['title', 'author', 'genre', 'status', 'pages', 'price', 'rating'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const lengthError = checkLengths({
      book_title: updates.title,
      book_author: updates.author,
      book_genre: updates.genre,
    });
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    const updated = await BookModel.update(req.params.id, updates);
    cache.invalidateForBookChange(book.user_id);
    res.json({ book: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update book' });
  }
}

async function deleteBook(req, res) {
  try {
    const book = await BookModel.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const isOwner = book.user_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this book' });
    }

    await BookModel.delete(req.params.id);
    cache.invalidateForBookChange(book.user_id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
}

module.exports = { listBooks, createBook, updateBook, deleteBook };
