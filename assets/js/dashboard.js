const baseApiUrl = "http://localhost/Hotel-Reservation-Billing-System/api";

// Check authentication
const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!user) {
    window.location.href = 'admin-login.html';
}

document.addEventListener('DOMContentLoaded', function () {
    // Set user info
    document.getElementById('userName').textContent = user.username || 'Admin';
    document.getElementById('userRole').textContent = user.role_type || 'admin';

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('user');
        window.location.href = 'admin-login.html';
    });

    // Refresh handler
    document.getElementById('refreshBtn').addEventListener('click', function () {
        loadDashboardData();
    });

    // Load initial data
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        // Placeholder data
        document.getElementById('totalRooms').textContent = '25';
        document.getElementById('availableRooms').textContent = '20';
        document.getElementById('totalGuests').textContent = '5';
        document.getElementById('activeReservations').textContent = '3';
        document.getElementById('totalRevenue').textContent = '₱15,000.00';

        // Load recent reservations
        const recentReservationsBody = document.getElementById('recentReservationsBody');
        recentReservationsBody.innerHTML = `
            <tr>
                <td>001</td>
                <td>John Doe</td>
                <td>2025-01-15 14:00</td>
                <td>2025-01-16 14:00</td>
                <td><span class="badge bg-success">Confirmed</span></td>
            </tr>
            <tr>
                <td>002</td>
                <td>Jane Smith</td>
                <td>2025-01-16 15:00</td>
                <td>2025-01-17 15:00</td>
                <td><span class="badge bg-warning">Pending</span></td>
            </tr>
        `;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load dashboard data'
        });
    }
}
