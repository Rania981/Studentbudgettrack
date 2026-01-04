const path = require('path');
require('dotenv').config({ path: __dirname + '/back.env' });
 // Make sure DB vars & JWT_SECRET are here
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const budgetRoutes = require('./routes/budget');
const expenseRoutes = require('./routes/expenses');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/expenses', expenseRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`💾 Connected to database: ${process.env.DB_NAME}`);
});
