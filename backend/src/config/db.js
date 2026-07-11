const { Pool } = require('pg');
require('dotenv').config();

// Render's managed Postgres requires SSL for external connections (e.g. running
// migrate/seed from your local machine against a deployed database). Local and
// Docker Postgres don't need this, so we only enable it when the connection
// string points at Render.
const isRenderHost = process.env.DATABASE_URL?.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderHost ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
});

module.exports = pool;
