const UserModel = require('../models/userModel');
const BookModel = require('../models/bookModel');
const cache = require('../services/cache');
const { parsePagination, buildMeta } = require('../utils/pagination');

async function listUsers(req, res) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await UserModel.findAll({ page, limit });
    res.json({ users: rows, pagination: buildMeta({ page, limit, total }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function deleteUser(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const target = await UserModel.findById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    if (target.role === 'admin') {
      const adminCount = await UserModel.countAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last remaining admin' });
      }
    }

    await UserModel.delete(targetId);
    cache.invalidateForBookChange(targetId);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// Admin-wide book management reuses BookModel directly (already scoped-free for admin)
async function listAllBooks(req, res) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await BookModel.findAll({ page, limit });
    res.json({ books: rows, pagination: buildMeta({ page, limit, total }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
}

module.exports = { listUsers, deleteUser, listAllBooks };
