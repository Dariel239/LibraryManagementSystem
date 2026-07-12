const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { checkLengths, checkPasswordStrength } = require('../utils/validation');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const lengthError = checkLengths({ user_name: name, user_email: email });
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    const passwordError = checkPasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Bootstrap: the very first account on a fresh system becomes admin,
    // since there's no other way to create one (no promote/demote by design).
    const totalUsers = await UserModel.countAll();
    const role = totalUsers === 0 ? 'admin' : 'user';

    const user = await UserModel.create({ name, email, hashedPassword, role });

    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function me(req, res) {
  const user = await UserModel.findById(req.user.id);
  res.json({ user });
}

async function updateProfile(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const lengthError = checkLengths({ user_name: name });
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    const user = await UserModel.updateName(req.user.id, name.trim());
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    const passwordError = checkPasswordStrength(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await UserModel.findByEmail(req.user.email);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(req.user.id, hashedPassword);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change password' });
  }
}

module.exports = { register, login, me, updateProfile, changePassword };
