const pool = require('../config/db');

const BookModel = {
  async create({ userId, title, author, genre, status, pages, price, rating }) {
    const result = await pool.query(
      `INSERT INTO books (user_id, title, author, genre, status, pages, price, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, title, author, genre, status || 'to-read', pages, price, rating]
    );
    return result.rows[0];
  },

  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT *, COUNT(*) OVER() AS total_count FROM books
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
    const rows = result.rows.map(({ total_count, ...row }) => row);
    return { rows, total };
  },

  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT books.*, users.name AS owner_name, COUNT(*) OVER() AS total_count
       FROM books
       JOIN users ON books.user_id = users.id
       ORDER BY books.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
    const rows = result.rows.map(({ total_count, ...row }) => row);
    return { rows, total };
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    return result.rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id);

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = keys.map((key) => fields[key]);

    const result = await pool.query(
      `UPDATE books SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
  },
};

module.exports = BookModel;
