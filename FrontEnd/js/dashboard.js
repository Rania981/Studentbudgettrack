// frontend/js/dashboard.js

// Authentication check
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'index.html';
}

// Global variables
let expenseChart = null;
let currentBudget = 0;
let currentExpenses = [];
let filteredExpenses = [];

// Brown color palette
const BROWN_PALETTE = {
  primary: '#5D4037',    // Dark brown
  secondary: '#8D6E63',  // Medium brown
  light: '#D7CCC8',      // Light brown
  accent: '#A1887F',     // Warm brown
  background: '#FFF8F0', // Cream white
  white: '#FFFFFF',      // Pure white
  warning: '#FF9800',    // Orange for warnings
  danger: '#F44336'      // Red for danger
};

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});

// MAIN DASHBOARD LOAD FUNCTION
async function loadDashboard() {
  console.log('Loading dashboard...');

  // Show skeleton loader in the list
  const list = document.getElementById('expensesList');
  if (list) {
    list.innerHTML = `
      <div class="skeleton-item mb-3 p-4"></div>
      <div class="skeleton-item mb-3 p-4"></div>
      <div class="skeleton-item mb-3 p-4"></div>
    `;
  }

  try {
    // 1. Fetch Budget
    const budgetRes = await apiFetch('/api/budget/current');
    let fetchedBudget = 0;
    let fetchedSpent = 0;
    let fetchedRemaining = 0;

    if (budgetRes.ok) {
      const budgetData = await budgetRes.json();
      fetchedBudget = budgetData.limit;
      fetchedSpent = budgetData.spent;
      fetchedRemaining = budgetData.remaining;
    }

    // 2. Fetch Expenses
    const expRes = await apiFetch('/api/expenses');
    if (expRes.ok) {
      currentExpenses = await expRes.json();
      filteredExpenses = [...currentExpenses];
    } else {
      currentExpenses = [];
      filteredExpenses = [];
    }

    // 3. Update UI with Animations
    const totalSpent = currentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const remaining = fetchedBudget - totalSpent;

    // Use animateValue for the big numbers
    animateValue('budgetLimit', currentBudget, fetchedBudget, 1000);
    animateValue('spentAmount', 0, totalSpent, 1000);
    animateValue('remainingAmount', currentBudget, remaining, 1000);

    currentBudget = fetchedBudget;

    // Update non-animated parts
    updateMainStatsOnlyBars(currentBudget, totalSpent, remaining);
    updateWelcomeMessage(currentBudget, remaining, currentExpenses);
    updateFinancialSnapshot(currentExpenses, currentBudget, remaining);
    updateSpendingChart(currentExpenses);
    renderExpensesList(filteredExpenses);
    showBudgetWarnings(remaining, currentBudget);

  } catch (err) {
    console.error('Dashboard load error:', err);
    showAlert('Failed to load dashboard data. Please try again.', 'danger');
  }
}

// Helper to update only the progress bars to avoid flickering the numbers
function updateMainStatsOnlyBars(budget, totalSpent, remaining) {
  const spentPercent = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const remainingPercent = budget > 0 ? (remaining / budget) * 100 : 0;
  const remainingAmount = document.getElementById('remainingAmount');

  const bars = document.querySelectorAll('.progress-bar');
  if (bars[0]) bars[0].style.width = `${Math.min(100, spentPercent)}%`;
  if (bars[1]) bars[1].style.width = `${Math.min(100, spentPercent)}%`;
  if (bars[2]) {
    bars[2].style.width = `${Math.min(100, remainingPercent)}%`;
    if (remaining < 0) {
      bars[2].style.backgroundColor = BROWN_PALETTE.danger;
      if (remainingAmount) remainingAmount.style.color = BROWN_PALETTE.danger;
    } else if (remaining < 100) {
      bars[2].style.backgroundColor = BROWN_PALETTE.warning;
      if (remainingAmount) remainingAmount.style.color = BROWN_PALETTE.warning;
    } else {
      bars[2].style.backgroundColor = BROWN_PALETTE.primary;
      if (remainingAmount) remainingAmount.style.color = BROWN_PALETTE.primary;
    }
  }

  const budgetInput = document.getElementById('monthlyBudget');
  if (budgetInput) budgetInput.value = budget;
}

// 1. UPDATE MAIN STATS FUNCTION (Legacy, kept for compatibility if needed)
function updateMainStats(budget, totalSpent, remaining) {
  updateMainStatsOnlyBars(budget, totalSpent, remaining);
  const budgetLimit = document.getElementById('budgetLimit');
  const spentAmount = document.getElementById('spentAmount');
  const remainingAmount = document.getElementById('remainingAmount');

  if (budgetLimit) budgetLimit.textContent = `${budget.toLocaleString()} Br`;
  if (spentAmount) spentAmount.textContent = `${totalSpent.toLocaleString()} Br`;
  if (remainingAmount) remainingAmount.textContent = `${remaining.toLocaleString()} Br`;
}

function updateBudgetDisplays(budget) {
  const budgetInput = document.getElementById('monthlyBudget');
  if (budgetInput) budgetInput.value = budget;

  document.querySelectorAll('.budget-display').forEach(el => {
    el.textContent = `${budget.toLocaleString()} Br`;
  });
}

// 2. UPDATE WELCOME MESSAGE
function updateWelcomeMessage(budget, remaining, expenses) {
  const welcomeMessage = document.querySelector('.welcome-banner h2');
  const welcomeSubtitle = document.querySelector('.welcome-banner p');
  const tipBox = document.querySelector('.tip-box');

  if (!welcomeMessage || !welcomeSubtitle) return;

  const now = new Date();
  const hour = now.getHours();
  let greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  welcomeMessage.innerHTML = `${greeting}, Student! ☕`;

  const remainingPercent = budget > 0 ? Math.round((remaining / budget) * 100) : 0;

  if (budget === 0) {
    welcomeSubtitle.innerHTML = `Welcome! Set your monthly budget to start tracking expenses.`;
  } else {
    let encouragement = remainingPercent >= 50 ? "Excellent! You're on track." :
      remainingPercent >= 20 ? "Keep monitoring your spending." :
        "Watch your spending closely!";
    welcomeSubtitle.innerHTML = `You have <strong style="color: #FFFFFF;">${remaining.toLocaleString()} Br (${Math.max(0, remainingPercent)}%)</strong> remaining. ${encouragement}`;
  }

  if (tipBox) {
    tipBox.innerHTML = `<i class="fas fa-lightbulb me-2" style="color: #FFD166"></i> <strong>Pro Tip:</strong> ${getRelevantTip(budget, remaining, expenses.length)}`;
  }
}

function getRelevantTip(budget, remaining, count) {
  const tips = [
    'Meal planning can reduce food expenses by up to 25%.',
    'Tracking every Birr usage daily increases financial awareness.',
    'Set aside 10% of your budget for unexpected emergencies.',
    'Avoid impulse buys by waiting 24 hours before big purchases.',
    'Review your spending weekly to stay within your limits.'
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// 3. UPDATE FINANCIAL SNAPSHOT
function updateFinancialSnapshot(expenses, budget, remaining) {
  const snapshotElement = document.querySelector('.col-lg-6 .glass-card .small.text-muted') ||
    document.getElementById('financialSnapshotText');

  if (!snapshotElement) return;

  if (!expenses || expenses.length === 0) {
    snapshotElement.innerHTML = `No expenses logged yet. Start tracking to see your summary!`;
    return;
  }

  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount);
  });

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const percent = totalSpent > 0 ? Math.round((topCategory[1] / totalSpent) * 100) : 0;

  snapshotElement.innerHTML = `You’ve logged <b>${expenses.length} expenses</b> this month, with ${topCategory[0]} making up <b>${percent}%</b> of your spending.`;
}

// 4. UPDATE SPENDING CHART
function updateSpendingChart(expenses) {
  const ctx = document.getElementById('expenseChart')?.getContext('2d');
  if (!ctx) return;

  if (expenseChart) expenseChart.destroy();

  if (!expenses || expenses.length === 0) return;

  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [BROWN_PALETTE.primary, BROWN_PALETTE.secondary, BROWN_PALETTE.accent, BROWN_PALETTE.light, '#BCAAA4', '#A1887F'],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, font: { family: 'Outfit', size: 11 } } }
      },
      cutout: '70%'
    }
  });
}

// 5. RENDER EXPENSES LIST
function renderExpensesList(expenses) {
  const list = document.getElementById('expensesList');
  if (!list) return;

  if (!expenses || expenses.length === 0) {
    list.innerHTML = `<div class="text-center py-4 text-muted">No expenses matched your search.</div>`;
    return;
  }

  list.innerHTML = expenses.map(exp => `
    <div class="expense-item mb-3 p-3 border rounded">
      <div class="d-flex justify-content-between align-items-center">
        <div style="flex: 1;">
          <h6 class="mb-1 fw-bold">${exp.description}</h6>
          <div class="d-flex align-items-center gap-2">
            <span class="badge" style="background: ${BROWN_PALETTE.background}; color: ${BROWN_PALETTE.primary}; border: 1px solid ${BROWN_PALETTE.light};">
              ${exp.category}
            </span>
            <small class="text-muted">${formatDate(exp.date)}</small>
          </div>
        </div>
        <div class="text-end me-3">
          <h5 class="fw-bold mb-0">${parseFloat(exp.amount).toLocaleString()} Br</h5>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteExpense(${exp.id})">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// DELETE EXPENSE
async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showAlert('Expense deleted successfully', 'success');
      loadDashboard();
    } else {
      showAlert('Failed to delete expense', 'danger');
    }
  } catch (err) {
    showAlert('Server error occurred', 'danger');
  }
}

// FILTERS LOGIC
function setupFilters() {
  const searchInput = document.getElementById('filterSearch');
  const catSelect = document.getElementById('filterCategory');
  const applyBtn = document.getElementById('applyFiltersBtn');
  const clearBtn = document.getElementById('clearFiltersBtn');

  if (!applyBtn) return;

  applyBtn.addEventListener('click', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const category = catSelect.value;

    filteredExpenses = currentExpenses.filter(exp => {
      const matchSearch = exp.description.toLowerCase().includes(searchTerm) ||
        exp.category.toLowerCase().includes(searchTerm);
      const matchCat = !category || exp.category === category;
      return matchSearch && matchCat;
    });

    renderExpensesList(filteredExpenses);
  });

  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    catSelect.value = '';
    filteredExpenses = [...currentExpenses];
    renderExpensesList(filteredExpenses);
  });
}

// SETUP EXPORT
function setupExport() {
  const exportBtn = document.getElementById('exportCSVBtn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    if (!currentExpenses || currentExpenses.length === 0) {
      showAlert('No expenses to export', 'warning');
      return;
    }

    // Format data for professional look
    const exportData = currentExpenses.map(exp => ({
      Date: formatDate(exp.date),
      Description: exp.description,
      Category: exp.category,
      Amount: exp.amount
    }));

    exportToCSV(`Expenses_${new Date().toISOString().slice(0, 7)}.csv`, exportData);
    showAlert('CSV Exported successfully!', 'success');
  });
}

// BUDGET UPDATE FUNCTION
document.getElementById('saveBudgetBtn')?.addEventListener('click', async () => {
  const newBudget = parseFloat(document.getElementById('monthlyBudget').value);
  const saveBtn = document.getElementById('saveBudgetBtn');

  if (isNaN(newBudget) || newBudget < 0) {
    showAlert('Please enter a valid amount', 'danger');
    return;
  }

  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
  saveBtn.disabled = true;

  try {
    const res = await apiFetch('/api/budget', {
      method: 'POST',
      body: JSON.stringify({ limit: newBudget })
    });

    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('budgetModal'))?.hide();
      showAlert('Budget updated successfully!', 'success');
      loadDashboard();
    } else {
      showAlert('Failed to update budget', 'danger');
    }
  } catch (err) {
    showAlert('Connection error', 'danger');
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
});

// BUDGET WARNINGS
function showBudgetWarnings(remaining, budget) {
  const container = document.querySelector('.welcome-banner').parentNode;
  const oldWarning = document.getElementById('budgetAlertDiv');
  if (oldWarning) oldWarning.remove();

  if (budget > 0 && remaining < 100) {
    const div = document.createElement('div');
    div.id = 'budgetAlertDiv';
    div.className = `alert alert-${remaining < 0 ? 'danger' : 'warning'} mt-3 border-0 shadow-sm`;
    div.style.borderRadius = '12px';
    div.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-3 fs-4"></i>
        <div>
          <h6 class="mb-0 fw-bold">${remaining < 0 ? 'Budget Exceeded!' : 'Budget Warning!'}</h6>
          <small>${remaining < 0 ? `You are ${Math.abs(remaining)} Br over budget.` : `Only ${remaining} Br remaining for the month.`}</small>
        </div>
      </div>
    `;
    container.insertBefore(div, document.querySelector('.welcome-banner').nextSibling);
  }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  setupFilters();
  setupExport();
});

// Add CSS for beautiful brown and white theme
const style = document.createElement('style');
style.textContent = `
  /* Main Theme Colors */
  :root {
    --brown-primary: ${BROWN_PALETTE.primary};
    --brown-secondary: ${BROWN_PALETTE.secondary};
    --brown-light: ${BROWN_PALETTE.light};
    --brown-accent: ${BROWN_PALETTE.accent};
    --cream-bg: ${BROWN_PALETTE.background};
    --pure-white: ${BROWN_PALETTE.white};
  }
  
  /* Welcome Banner - FIXED: No white overlay, pure white text */
  .welcome-banner {
    background: linear-gradient(135deg, ${BROWN_PALETTE.primary} 0%, ${BROWN_PALETTE.secondary} 100%);
    color: #FFFFFF; /* Pure white */
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 8px 25px rgba(93, 64, 55, 0.15);
    position: relative;
    overflow: hidden;
  }
  
  /* Removed the white circle overlay */
  .welcome-banner::before {
    display: none; /* Remove the white overlay */
  }
  
  .welcome-banner h2 {
    font-weight: 700;
    margin-bottom: 0.5rem;
    font-size: 1.8rem;
    color: #FFFFFF !important; /* Force white color */
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Better readability */
  }
  
  .welcome-banner p {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    color: #FFFFFF !important; /* Force white color */
    opacity: 0.95;
  }
  
  .welcome-banner strong {
    color: #FFFFFF !important; /* Force white for strong elements */
    font-weight: 600;
  }
  
  .tip-box {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 1rem;
    margin-top: 1rem;
    border-left: 4px solid #FFD166; /* Golden yellow */
    backdrop-filter: blur(10px);
    color: #FFFFFF;
  }
  
  .tip-box strong {
    color: #FFFFFF !important;
  }
  
  .tip-box span {
    color: rgba(255, 255, 255, 0.9) !important;
  }
  
  /* Stats Cards - Beautiful Brown Cards */
  .glass-card {
    background: ${BROWN_PALETTE.white};
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(93, 64, 55, 0.08);
    border: 1px solid ${BROWN_PALETTE.light};
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .glass-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(93, 64, 55, 0.12);
  }
  
  .stat-card h3 {
    color: ${BROWN_PALETTE.secondary};
    font-weight: 600;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-card .amount {
    font-size: 2.2rem;
    font-weight: 700;
    color: ${BROWN_PALETTE.primary};
    margin-bottom: 0.5rem;
    font-family: 'Outfit', sans-serif;
  }
  
  /* Progress Bars - Brown Theme */
  .progress {
    height: 12px;
    border-radius: 6px;
    background-color: ${BROWN_PALETTE.background};
    margin-top: 0.75rem;
    overflow: hidden;
  }
  
  .progress-bar {
    border-radius: 6px;
    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  /* Buttons - Brown Theme */
  .btn-primary {
    background: linear-gradient(135deg, ${BROWN_PALETTE.primary} 0%, ${BROWN_PALETTE.secondary} 100%);
    border: none;
    border-radius: 12px;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(93, 64, 55, 0.2);
    color: white;
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(93, 64, 55, 0.3);
    background: linear-gradient(135deg, ${BROWN_PALETTE.secondary} 0%, ${BROWN_PALETTE.primary} 100%);
    color: white;
  }
  
  .btn-outline-primary {
    color: ${BROWN_PALETTE.primary};
    border-color: ${BROWN_PALETTE.primary};
    border-radius: 12px;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
  }
  
  .btn-outline-primary:hover {
    background: ${BROWN_PALETTE.primary};
    border-color: ${BROWN_PALETTE.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(93, 64, 55, 0.15);
    color: white;
  }
  
  /* Modal - Brown Theme */
  .modal-content {
    border-radius: 20px;
    border: none;
    box-shadow: 0 10px 40px rgba(93, 64, 55, 0.15);
    overflow: hidden;
  }
  
  .modal-header {
    background: linear-gradient(135deg, ${BROWN_PALETTE.primary} 0%, ${BROWN_PALETTE.secondary} 100%);
    color: white;
    border-radius: 0;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modal-title {
    font-weight: 700;
  }
  
  .modal-body {
    padding: 2rem;
    background: ${BROWN_PALETTE.background};
  }
  
  /* Budget Input - Stylish */
  .budget-input {
    font-size: 1.8rem;
    font-weight: 700;
    text-align: center;
    border: 2px solid ${BROWN_PALETTE.light};
    border-radius: 12px;
    padding: 1.2rem;
    color: ${BROWN_PALETTE.primary};
    background: ${BROWN_PALETTE.white};
    transition: all 0.3s ease;
    font-family: 'Outfit', sans-serif;
  }
  
  .budget-input:focus {
    border-color: ${BROWN_PALETTE.primary};
    box-shadow: 0 0 0 0.25rem rgba(93, 64, 55, 0.15);
    transform: scale(1.02);
  }
  
  /* Expense Items - Elegant Design */
  .expense-item {
    transition: all 0.3s ease;
    border: 1px solid ${BROWN_PALETTE.light} !important;
    background: ${BROWN_PALETTE.white} !important;
  }
  
  .expense-item:hover {
    border-color: ${BROWN_PALETTE.accent} !important;
    box-shadow: 0 4px 12px rgba(93, 64, 55, 0.1);
    transform: translateX(5px);
  }
  
  /* Chart Container */
  .chart-container {
    background: ${BROWN_PALETTE.white};
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid ${BROWN_PALETTE.light};
    box-shadow: 0 4px 15px rgba(93, 64, 55, 0.05);
  }
  
  /* Body Background */
  body {
    background: ${BROWN_PALETTE.background};
    font-family: 'Outfit', sans-serif;
  }
  
  /* Navigation */
  .navbar {
    background: ${BROWN_PALETTE.white} !important;
    box-shadow: 0 2px 10px rgba(93, 64, 55, 0.08);
    border-bottom: 1px solid ${BROWN_PALETTE.light};
  }
  
  /* Footer */
  .footer {
    background: ${BROWN_PALETTE.white};
    border-top: 1px solid ${BROWN_PALETTE.light};
    color: ${BROWN_PALETTE.secondary};
  }
  
  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    color: ${BROWN_PALETTE.primary};
    font-weight: 600;
  }
  
  /* Text Colors */
  .text-brown {
    color: ${BROWN_PALETTE.primary} !important;
  }
  
  .text-brown-light {
    color: ${BROWN_PALETTE.secondary} !important;
  }
  
  /* Background Colors */
  .bg-brown {
    background: ${BROWN_PALETTE.primary} !important;
    color: white !important;
  }
  
  .bg-brown-light {
    background: ${BROWN_PALETTE.background} !important;
  }
  
  /* Borders */
  .border-brown {
    border-color: ${BROWN_PALETTE.light} !important;
  }
  
  /* Loading Animation */
  /* Skeleton Loader */
  .skeleton-item {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 12px;
    height: 80px;
    border: none !important;
  }
  
  @keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Refined Glassmorphism */
  .glass-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(141, 110, 99, 0.1);
  }
  
  .navbar {
    backdrop-filter: blur(15px);
    background: rgba(255, 255, 255, 0.8) !important;
  }
`;
document.head.appendChild(style);

// Export functions
window.BudgetManager = {
  getBudget: () => parseFloat(localStorage.getItem('userMonthlyBudget') || '200'),
  setBudget: (amount) => {
    localStorage.setItem('userMonthlyBudget', amount.toString());
    currentBudget = amount;
    updateBudgetDisplays(amount);
    return amount;
  },
  loadDashboard: loadDashboard
};

console.log('Budget Manager initialized with brown theme. Current budget:', window.BudgetManager.getBudget());