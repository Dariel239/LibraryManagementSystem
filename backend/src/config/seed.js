const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    // Users: 1 admin + 3 regular users
    const users = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES
        ('Admin User', 'admin@example.com', $1, 'admin'),
        ('Alice Chen', 'alice@example.com', $1, 'user'),
        ('Bob Martinez', 'bob@example.com', $1, 'user'),
        ('Carla Dias', 'carla@example.com', $1, 'user')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email`,
      [passwordHash]
    );
    console.log(`Inserted ${users.rowCount} users`);

    // Look up ids in case some already existed (ON CONFLICT skips them)
    const { rows: allUsers } = await pool.query(
      `SELECT id, email FROM users WHERE email IN
       ('alice@example.com', 'bob@example.com', 'carla@example.com')`
    );
    const idByEmail = Object.fromEntries(allUsers.map((u) => [u.email, u.id]));

    const books = [
      // Alice: heavy sci-fi reader
      { owner: 'alice@example.com', title: 'Dune', author: 'Frank Herbert', genre: 'Sci-Fi', status: 'completed', pages: 412, price: 14.99, rating: 4.8 },
      { owner: 'alice@example.com', title: 'Foundation', author: 'Isaac Asimov', genre: 'Sci-Fi', status: 'completed', pages: 255, price: 12.5, rating: 4.5 },
      { owner: 'alice@example.com', title: 'Project Hail Mary', author: 'Andy Weir', genre: 'Sci-Fi', status: 'reading', pages: 476, price: 16.99, rating: 4.9 },
      { owner: 'alice@example.com', title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', genre: 'Sci-Fi', status: 'to-read', pages: 304, price: 11.99, rating: 4.3 },
      // Bob: fantasy + mixed
      { owner: 'bob@example.com', title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'Fantasy', status: 'completed', pages: 310, price: 9.99, rating: 4.7 },
      { owner: 'bob@example.com', title: 'Mistborn', author: 'Brandon Sanderson', genre: 'Fantasy', status: 'reading', pages: 541, price: 18.99, rating: 4.6 },
      { owner: 'bob@example.com', title: 'The Name of the Wind', author: 'Patrick Rothfuss', genre: 'Fantasy', status: 'completed', pages: 662, price: 19.99, rating: 4.8 },
      // Carla: short story / non-fiction reader
      { owner: 'carla@example.com', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction', status: 'completed', pages: 443, price: 22.5, rating: 4.6 },
      { owner: 'carla@example.com', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', status: 'completed', pages: 320, price: 15.99, rating: 4.7 },
      { owner: 'carla@example.com', title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', status: 'to-read', pages: 197, price: 10.99, rating: 4.2 },
    ];

    let inserted = 0;
    for (const b of books) {
      const userId = idByEmail[b.owner];
      if (!userId) continue; // owner may already have existed with different id state
      await pool.query(
        `INSERT INTO books (user_id, title, author, genre, status, pages, price, rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, b.title, b.author, b.genre, b.status, b.pages, b.price, b.rating]
      );
      inserted++;
    }
    console.log(`Inserted ${inserted} books`);
    console.log('\nSeed complete. Login with any of:');
    console.log('  admin@example.com / password123 (admin)');
    console.log('  alice@example.com / password123');
    console.log('  bob@example.com / password123');
    console.log('  carla@example.com / password123');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
