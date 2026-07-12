const pool = require('../config/db');

const UserModel = {
  async create({ name, email, hashedPassword, role = 'user' }) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, role]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT id, name, email, role, created_at, COUNT(*) OVER() AS total_count
       FROM users ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
    const rows = result.rows.map(({ total_count, ...row }) => row);
    return { rows, total };
  },

  async countAll() {
    const result = await pool.query('SELECT COUNT(*) AS count FROM users');
    return Number(result.rows[0].count);
  },

  async countAdmins() {
    const result = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    return Number(result.rows[0].count);
  },

  async updateName(id, name) {
    const result = await pool.query(
      `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, email, role, created_at`,
      [name, id]
    );
    return result.rows[0];
  },

  async updatePassword(id, hashedPassword) {
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id]);
  },

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },
};

module.exports = UserModel;
