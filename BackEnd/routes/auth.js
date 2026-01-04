const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config({ path: __dirname + '/../back.env' });

const router = express.Router();

// SIGN UP
router.post('/signup', async (req, res) => {
  let { email, password } = req.body;
  if (email) email = email.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  let { email, password } = req.body;
  if (email) email = email.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    console.log(`Login attempt for: ${email}`);
    const [rows] = await db.execute('SELECT id, password FROM users WHERE email = ?', [email]);
    console.log('DB rows:', rows); // Debug: see if user exists

    if (rows.length === 0) {
      console.log(`No user found for: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    console.log(`Password match for user ${user.id}: ${isValid}`);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Temporary debug endpoint (dev only) - remove in production
router.get('/debug-user', async (req, res) => {
  try {
    let email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'email query param required' });

    const [rows] = await db.execute('SELECT id, email, password, created_at FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'user not found' });

    // Return basic info so we can debug existence and hashing (DO NOT expose in prod)
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error('Debug user error:', err);
    res.status(500).json({ message: 'debug failed' });
  }
});

module.exports = router;
