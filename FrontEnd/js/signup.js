// frontend/js/signup.js

document.addEventListener('DOMContentLoaded', function () {
  const signupForm = document.getElementById('signupForm');
  const signupBtn = document.getElementById('signupBtn');
  const signupText = document.getElementById('signupText');
  const loadingSpinner = document.getElementById('loadingSpinner');

  if (!signupForm) return;

  // Password toggle
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
    });
  }

  // Password strength
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  if (passwordInput && strengthFill && strengthText) {
    passwordInput.addEventListener('input', function () {
      const password = this.value;
      let score = 0;
      if (password.length >= 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

      const percent = (score / 5) * 100;
      strengthFill.style.width = percent + '%';

      let color, text;
      if (score <= 1) { color = '#ef4444'; text = 'Very Weak'; }
      else if (score <= 3) { color = '#f59e0b'; text = 'Fair'; }
      else { color = '#10b981'; text = 'Strong'; }

      strengthFill.style.backgroundColor = color;
      strengthText.textContent = text;
    });
  }

  // Confirm password
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const confirmPasswordError = document.getElementById('confirmPasswordError');

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function () {
      const password = passwordInput ? passwordInput.value : '';
      if (this.value && password !== this.value) {
        if (confirmPasswordError) confirmPasswordError.style.display = 'block';
        this.classList.add('is-invalid');
      } else {
        if (confirmPasswordError) confirmPasswordError.style.display = 'none';
        this.classList.remove('is-invalid');
      }
    });
  }

  // Main Handler
  signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAccepted = document.getElementById('terms').checked;

    if (!email || !password || !confirmPassword) {
      showAlert('Please fill in all fields', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match', 'danger');
      return;
    }

    if (!termsAccepted) {
      showAlert('Please agree to the Terms', 'warning');
      return;
    }

    // UI feedback
    if (signupText) signupText.style.display = 'none';
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (signupBtn) signupBtn.disabled = true;

    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('Account created successfully! Redirecting to login...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        showAlert(data.message || 'Signup failed', 'danger');
      }
    } catch (err) {
      showAlert('Network error. Please ensure the backend is running.', 'danger');
      console.error('Signup error:', err);
    } finally {
      if (signupText) signupText.style.display = '';
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      if (signupBtn) signupBtn.disabled = false;
    }
  });
});
