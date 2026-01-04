// frontend/js/add-expense.js

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Quick date buttons
  document.querySelectorAll('.quick-date-btn').forEach(button => {
    button.addEventListener('click', function () {
      document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      const offset = parseInt(this.dataset.offset);
      const d = new Date();
      d.setDate(d.getDate() + offset);
      if (dateInput) dateInput.value = d.toISOString().split('T')[0];
    });
  });

  const form = document.getElementById('expenseForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const spinner = document.querySelector('.loading-spinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get values from form
    const amount = parseFloat(document.getElementById('amount')?.value || '0');
    const category = document.getElementById('category')?.value;
    const date = document.getElementById('date')?.value;
    const notes = document.getElementById('notes')?.value.trim();

    // Validate
    if (!amount || amount <= 0 || !category || !date) {
      showAlert('Please fill all required fields with valid values.', 'warning');
      return;
    }

    // Use notes as description if available
    const description = notes || `${category} Expense`;

    // UI feedback
    if (submitText) submitText.style.display = 'none';
    if (spinner) spinner.style.display = 'inline-block';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          description: description,
          amount: amount,
          category: category,
          date: date,
          payment_method: 'Cash'
        })
      });

      if (res.ok) {
        showAlert('Expense added successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } else {
        const data = await res.json();
        showAlert(data.message || 'Failed to add expense', 'danger');
      }
    } catch (err) {
      console.error('Add expense error:', err);
      showAlert('Network error. Please check your connection.', 'danger');
    } finally {
      if (submitText) submitText.style.display = '';
      if (spinner) spinner.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
