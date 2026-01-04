// backend/routes/expenses.js
const express = require('express');
const db = require('../db');
const authenticateToken = require('../AuthenticateToken');

const router = express.Router();

// Get all expenses (current month)
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const monthYear = new Date().toISOString().slice(0, 7);

  try {
    const [expenses] = await db.execute(
      `SELECT id, description, amount, category, date 
       FROM expenses 
       WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       ORDER BY date DESC, created_at DESC`,
      [userId, monthYear]
    );
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Add new expense
router.post('/', authenticateToken, async (req, res) => {
  const { description, amount, category, date } = req.body;
  const userId = req.user.id;

  if (!description || !amount || isNaN(amount) || !category || !date) {
    return res.status(400).json({ message: 'Valid description, amount, category, and date are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO expenses (user_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      [userId, description, amount, category, date]
    );
    res.status(201).json({ message: 'Expense added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add expense' });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, date } = req.body;
  const userId = req.user.id;

  if (!description || !amount || isNaN(amount) || !category || !date) {
    return res.status(400).json({ message: 'Valid description, amount, category, and date are required' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ? AND user_id = ?',
      [description, amount, category, date, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await db.execute(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

module.exports = router;