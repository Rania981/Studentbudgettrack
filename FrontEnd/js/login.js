// frontend/js/login.js

// Immediate authentication check
(function () {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');

    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    // Quick login button
    const quickLoginBtn = document.getElementById('quickLogin');
    if (quickLoginBtn) {
        quickLoginBtn.addEventListener('click', () => {
            const email = document.getElementById('email');
            const pass = document.getElementById('password');
            email.value = 'demo@student.edu';
            pass.value = 'demo123';

            setTimeout(() => {
                form.dispatchEvent(new Event('submit'));
            }, 600);
        });
    }

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
        });
    }
});

async function handleLogin(e) {
    if (e) e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');

    if (!email || !password) {
        showAlert('Please enter both email and password', 'warning');
        return;
    }

    const originalBtnContent = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Logging in...`;

    try {
        const res = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', email);
            if (data.user) {
                localStorage.setItem('userName', data.user.name || email.split('@')[0]);
                localStorage.setItem('userId', data.user.id || '');
            }

            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showAlert(data.message || 'Invalid credentials. Please try again.', 'danger');
        }
    } catch (err) {
        showAlert('Cannot connect to server. Please ensure the backend is running.', 'danger');
        console.error('Login error:', err);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalBtnContent;
    }
}

// Create Account Modal and Functionality
function showCreateAccountModal() {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="createAccountModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0" style="border-radius: 20px;">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">Create Student Account</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body pt-0">
                        <div id="registerError" class="alert alert-danger d-none animate__animated"></div>
                        
                        <form id="registerForm">
                            <div class="mb-3">
                                <label class="form-label small fw-bold">FULL NAME</label>
                                <input type="text" class="form-control" id="registerName" placeholder="John Doe" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label small fw-bold">EMAIL ADDRESS</label>
                                <input type="email" class="form-control" id="registerEmail" placeholder="name@university.edu" required>
                            </div>
                            
                            <div class="mb-3 position-relative">
                                <label class="form-label small fw-bold">PASSWORD</label>
                                <input type="password" class="form-control" id="registerPassword" placeholder="••••••••" required>
                                <small class="text-muted">Minimum 6 characters</small>
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label small fw-bold">CONFIRM PASSWORD</label>
                                <input type="password" class="form-control" id="registerConfirmPassword" placeholder="••••••••" required>
                            </div>
                            
                            <button type="submit" class="btn w-100 py-3 fw-bold" style="background: var(--primary-color); color: white;">
                                CREATE ACCOUNT
                            </button>
                        </form>
                        
                        <div class="text-center mt-3 small text-muted">
                            Already have an account? <a href="#" class="text-decoration-none fw-bold" style="color: var(--primary-color)" id="switchToLogin">Sign In</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('createAccountModal'));
    modal.show();

    // Add form submission handler
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Add switch to login link handler
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        modal.hide();
        // Remove modal from DOM after hiding
        setTimeout(() => {
            document.getElementById('createAccountModal').remove();
        }, 500);
    });

    // Remove modal from DOM when hidden
    document.getElementById('createAccountModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('createAccountModal').remove();
    });
}

// Registration function
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('registerError');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showRegisterError('Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        showRegisterError('Password must be at least 6 characters');
        return;
    }

    if (password !== confirmPassword) {
        showRegisterError('Passwords do not match');
        return;
    }

    // Set loading state
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Creating Account...`;

    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            // Registration successful
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', email);

            // Show success message
            if (errorDiv) {
                errorDiv.className = 'alert alert-success animate__animated animate__fadeIn';
                errorDiv.innerHTML = '<i class="fas fa-check-circle me-2"></i> Account created successfully!';
                errorDiv.style.display = 'block';
            }

            // Close modal and auto-login after 2 seconds
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
                modal.hide();

                // Auto-login with new credentials
                setTimeout(() => {
                    document.getElementById('email').value = email;
                    document.getElementById('password').value = password;

                    // Show success message on login page
                    const loginErrorDiv = document.getElementById('loginError');
                    if (loginErrorDiv) {
                        loginErrorDiv.className = 'alert alert-success animate__animated animate__fadeIn';
                        loginErrorDiv.innerHTML = '<i class="fas fa-check-circle me-2"></i> Account created! Logging you in...';
                        loginErrorDiv.style.display = 'block';
                    }

                    // Auto-login
                    setTimeout(() => {
                        const submitEvent = new Event('submit', { cancelable: true });
                        document.getElementById('loginForm').dispatchEvent(submitEvent);
                    }, 1000);

                }, 500);

            }, 2000);

        } else {
            // Registration failed
            showRegisterError(data.message || 'Registration failed. Please try again.');
        }

    } catch (err) {
        console.error('Registration error:', err);
        showRegisterError('Cannot connect to server. Please check if the backend is running.');
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
    }
}

// Helper functions
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.innerText = message;
        errorDiv.className = 'alert alert-danger animate__animated animate__headShake';
        errorDiv.style.display = 'block';

        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
    if (errorDiv) {
        errorDiv.innerText = message;
        errorDiv.className = 'alert alert-danger animate__animated animate__headShake';
        errorDiv.style.display = 'block';

        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}