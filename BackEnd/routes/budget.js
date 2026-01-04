// backend/routes/budget.js
const express = require('express');
const db = require('../db');
const authenticateToken = require('../AuthenticateToken');

const router = express.Router();

// Get or set current month's budget
router.get('/current', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const monthYear = new Date().toISOString().slice(0, 7); // "2024-01"

  try {
    // Get budget limit
    const [budgetRows] = await db.execute(
      'SELECT monthly_limit FROM budgets WHERE user_id = ? AND month_year = ?',
      [userId, monthYear]
    );

    let limit = 200.00; // Default limit
    if (budgetRows.length > 0) {
      limit = parseFloat(budgetRows[0].monthly_limit);
    } else {
      // Create default budget if not set
      await db.execute(
        'INSERT INTO budgets (user_id, monthly_limit, month_year) VALUES (?, ?, ?)',
        [userId, limit, monthYear]
      );
    }

    // Get total expenses this month
    const [expenseRows] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM expenses 
       WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [userId, monthYear]
    );

    const spent = parseFloat(expenseRows[0].total);
    const remaining = Math.max(0, limit - spent);

    res.json({
      limit,
      spent,
      remaining,
      monthYear
    });
  } catch (err) {
    console.error('Fetch budget error:', err);
    res.status(500).json({ message: 'Failed to load budget data' });
  }
});

// Update current month's budget
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { limit } = req.body;
  const monthYear = new Date().toISOString().slice(0, 7);

  const numericLimit = parseFloat(limit);
  if (isNaN(numericLimit) || numericLimit < 0) {
    return res.status(400).json({ message: 'Invalid budget limit. Please provide a positive number.' });
  }

  try {
    // Check if exists
    const [existing] = await db.execute(
      'SELECT id FROM budgets WHERE user_id = ? AND month_year = ?',
      [userId, monthYear]
    );

    if (existing.length > 0) {
      await db.execute(
        'UPDATE budgets SET monthly_limit = ? WHERE user_id = ? AND month_year = ?',
        [numericLimit, userId, monthYear]
      );
    } else {
      await db.execute(
        'INSERT INTO budgets (user_id, monthly_limit, month_year) VALUES (?, ?, ?)',
        [userId, numericLimit, monthYear]
      );
    }

    res.json({ message: 'Budget updated successfully', limit: numericLimit });
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ message: 'Failed to update budget' });
  }
});

module.exports = router;
