class AdminAuth {
    constructor() {
        this.init();
    }

    init() {
        // Check if already logged in
        if (this.isLoggedIn() && window.location.pathname.includes('admin-login.html')) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Setup login form
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        // Show loading
        this.showLoading();

        try {
            // Fix: Use the correct API endpoint path
            const response = await fetch('../api/admin/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();

            if (result.success) {
                // Store session
                localStorage.setItem('admin_token', result.token);
                localStorage.setItem('admin_user', JSON.stringify(result.user));

                // Show success and redirect
                await Swal.fire({
                    title: 'Login Successful!',
                    text: `Welcome back, ${result.user.username}`,
                    icon: 'success',
                    timer: 2000
                });

                window.location.href = 'dashboard.html';
            } else {
                // Reset form UI
                this.resetLoginButton();
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            // Reset form UI
            this.resetLoginButton();

            Swal.fire({
                title: 'Login Failed',
                text: error.message || 'Invalid credentials',
                icon: 'error'
            });
        }
    }

    showLoading() {
        const button = document.querySelector('.btn-login');
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            button.disabled = true;
        }
    }

    resetLoginButton() {
        const button = document.querySelector('.btn-login');
        if (button) {
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            button.disabled = false;
        }
    }

    isLoggedIn() {
        return localStorage.getItem('admin_token') !== null;
    }

    getUser() {
        const user = localStorage.getItem('admin_user');
        return user ? JSON.parse(user) : null;
    }

    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = 'admin-login.html';
    }

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'admin-login.html';
            return false;
        }
        return true;
    }
}

// Password toggle
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Initialize
window.adminAuth = new AdminAuth();
