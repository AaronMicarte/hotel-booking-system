class DashboardManager {
    constructor() {
        this.baseURL = window.location.origin + '/Hotel-Reservation-Billing-System/api';
        this.setupAxios();
        this.init();
    }

    setupAxios() {
        axios.defaults.timeout = 10000;
        axios.defaults.headers.common['Content-Type'] = 'application/json';
    }

    async init() {
        await this.checkAuthentication();
        await this.loadDashboardStats();
        this.setupEventListeners();
    }

    async checkAuthentication() {
        const result = await authManager.checkSession();
        if (!result.success) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Update user info in dashboard
        this.updateUserInfo(result.user);
    }

    updateUserInfo(user) {
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');

        if (userNameElement) userNameElement.textContent = user.username;
        if (userRoleElement) userRoleElement.textContent = user.role_type;
    }

    async loadDashboardStats() {
        try {
            const response = await axios.get(`${this.baseURL}/dashboard/stats.php`);
            const stats = response.data;

            this.updateStatsCards(stats);
            this.updateRecentReservations(stats.recent_reservations);
            this.updateRoomStatusChart(stats.room_status_distribution);

        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateStatsCards(stats) {
        const elements = {
            'totalRooms': stats.total_rooms,
            'availableRooms': stats.available_rooms,
            'totalGuests': stats.total_guests,
            'activeReservations': stats.active_reservations,
            'totalRevenue': this.formatCurrency(stats.total_revenue)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateRecentReservations(reservations) {
        const tbody = document.getElementById('recentReservationsBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${reservation.reservation_id}</td>
                <td>${reservation.guest_name}</td>
                <td>${this.formatDate(reservation.check_in_date)}</td>
                <td>${this.formatDate(reservation.check_out_date)}</td>
                <td><span class="badge bg-${this.getStatusColor(reservation.room_status)}">${reservation.room_status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    updateRoomStatusChart(statusData) {
        // Simple status display - can be enhanced with charts library
        const container = document.getElementById('roomStatusChart');
        if (!container) return;

        container.innerHTML = '';

        statusData.forEach(status => {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'status-item mb-2';
            statusDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>${status.room_status}</span>
                    <span class="badge bg-primary">${status.count}</span>
                </div>
            `;
            container.appendChild(statusDiv);
        });
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Refresh dashboard
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.loadDashboardStats.bind(this));
        }
    }

    async handleLogout() {
        const result = await Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, logout',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            const logoutResult = await authManager.logout();
            if (logoutResult.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Logged Out',
                    text: 'You have been successfully logged out',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'admin-login.html';
                });
            }
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'confirmed': 'info',
            'checked-in': 'success',
            'checked-out': 'secondary',
            'cancelled': 'danger'
        };
        return colors[status] || 'light';
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    new DashboardManager();
});
