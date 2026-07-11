const express = require('express');
const { listUsers, deleteUser, listAllBooks } = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);
router.get('/books', listAllBooks);

module.exports = router;
