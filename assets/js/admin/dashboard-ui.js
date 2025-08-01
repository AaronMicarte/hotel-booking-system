/**
 * Dashboard UI Interactions
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize sidebar toggle functionality
    initSidebar();

    // Initialize user authentication UI
    initAuthUI();

    // Setup refresh button
    setupRefreshButton();
});

/**
 * Initialize sidebar functionality
 */
function initSidebar() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Toggle sidebar on mobile
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function (event) {
            if (window.innerWidth <= 1024 &&
                !sidebar.contains(event.target) &&
                !sidebarToggle.contains(event.target) &&
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    }

    // Highlight active menu item
    highlightActiveMenuItem();
}

/**
 * Highlight the active menu item based on current page
 */
function highlightActiveMenuItem() {
    const currentPage = window.location.pathname.split('/').pop();
    const menuItems = document.querySelectorAll('.sidebar-menu li');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const linkPage = link.getAttribute('href').split('/').pop();

            if (currentPage === linkPage ||
                (currentPage === 'dashboard.html' && linkPage === 'dashboard.php') ||
                (currentPage === 'dashboard.php' && linkPage === 'dashboard.php')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}

/**
 * Initialize authentication-related UI
 */
function initAuthUI() {
    if (!window.adminAuth) {
        console.error('Admin auth not initialized');
        window.location.href = 'admin-login.html';
        return;
    }

    // Require authentication
    if (!window.adminAuth.requireAuth()) {
        return; // Auth check will redirect if needed
    }

    // Set user info in UI
    const user = window.adminAuth.getUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userRole').textContent = user.role_type || 'admin';
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.adminAuth.logout();
        });
    }
}

/**
 * Setup refresh button functionality
 */
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            // Add loading state to button
            const originalContent = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;

            // Refresh dashboard data
            if (window.refreshDashboardStats) {
                window.refreshDashboardStats()
                    .then(() => {
                        // Success notification
                        Swal.fire({
                            icon: 'success',
                            title: 'Dashboard Refreshed',
                            text: 'Latest data has been loaded',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    })
                    .catch(error => {
                        // Error notification
                        console.error('Refresh error:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Refresh Failed',
                            text: 'Could not refresh dashboard data',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    })
                    .finally(() => {
                        // Restore button state
                        refreshBtn.innerHTML = originalContent;
                        refreshBtn.disabled = false;
                    });
            } else {
                // If the stats module isn't loaded, just reload the page
                window.location.reload();
            }
        });
    }
}
