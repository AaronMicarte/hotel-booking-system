/**
 * Dashboard Statistics Manager
 * Handles fetching and displaying dashboard statistics
 */

// Make the refresh function available globally
window.refreshDashboardStats = loadDashboardStats;

document.addEventListener('DOMContentLoaded', function () {
    // Load dashboard statistics when page loads
    loadDashboardStats();
});

/**
 * Fetch dashboard statistics from the API
 */
async function loadDashboardStats() {
    try {
        showLoadingState();

        // Get date range values if date filters exist
        const startDate = document.getElementById('startDate')?.value || '';
        const endDate = document.getElementById('endDate')?.value || '';

        // Add date parameters if provided
        let url = '../api/dashboard/stats.php';
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }

        const response = await axios.get(url);
        const data = response.data;

        console.log('Dashboard data loaded:', data);

        // Update statistics on the page
        updateStatCards(data);
        updateRevenueDisplay(data.total_revenue);
        updateRoomStatusChart(data.room_status_distribution);
        updateRecentReservations(data.recent_reservations);

        // Update date-based charts if they exist
        if (data.revenue_by_date && window.updateRevenueChart) {
            window.updateRevenueChart(data.revenue_by_date);
        }

        if (data.booking_count_by_date && window.updateBookingChart) {
            window.updateBookingChart(data.booking_count_by_date);
        }

        hideLoadingState();
        return data;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        handleApiError(error);
        hideLoadingState();
        throw error;
    }
}

/**
 * Show loading state on dashboard elements
 */
function showLoadingState() {
    // Update stat cards to show loading
    document.querySelectorAll('.stats-info h3').forEach(el => {
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });

    // Update recent reservations to show loading
    const tableBody = document.getElementById('recentReservationsBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="admin-loading">Loading reservation data...</div>
                </td>
            </tr>
        `;
    }

    // Revenue loading
    const revenueElement = document.getElementById('totalRevenue');
    if (revenueElement) {
        revenueElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // Room status chart loading
    const chartContainer = document.getElementById('roomStatusChart');
    if (chartContainer) {
        chartContainer.innerHTML = '<div class="admin-loading">Loading chart data...</div>';
    }
}

/**
 * Hide loading state on dashboard elements
 */
function hideLoadingState() {
    // Nothing specific needed here since we replace content directly
}

/**
 * Update statistic cards with data
 */
function updateStatCards(data) {
    // Update total rooms
    const totalRoomsElement = document.getElementById('totalRooms');
    if (totalRoomsElement) {
        totalRoomsElement.textContent = data.total_rooms;
    }

    // Update available rooms
    const availableRoomsElement = document.getElementById('availableRooms');
    if (availableRoomsElement) {
        availableRoomsElement.textContent = data.available_rooms;
    }

    // Update total guests
    const totalGuestsElement = document.getElementById('totalGuests');
    if (totalGuestsElement) {
        totalGuestsElement.textContent = data.total_guests;
    }

    // Update active reservations
    const activeReservationsElement = document.getElementById('activeReservations');
    if (activeReservationsElement) {
        activeReservationsElement.textContent = data.active_reservations;
    }
}

/**
 * Update revenue display
 */
function updateRevenueDisplay(revenue) {
    const formatter = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
    });

    const revenueElement = document.getElementById('totalRevenue');
    if (revenueElement) {
        revenueElement.textContent = formatter.format(revenue);
    }
}

/**
 * Update room status chart
 */
function updateRoomStatusChart(distribution) {
    const chartContainer = document.getElementById('roomStatusChart');
    if (!chartContainer) return;

    chartContainer.innerHTML = '';

    const statusLabels = {
        'available': 'Available',
        'occupied': 'Occupied',
        'maintenance': 'Maintenance'
    };

    const statusColors = {
        'available': '#28a745',
        'occupied': '#ffc107',
        'maintenance': '#dc3545'
    };

    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    if (total === 0) {
        chartContainer.innerHTML = '<div class="text-center text-muted">No room data available</div>';
        return;
    }

    let chartHtml = '<div class="room-status-chart">';

    // Create chart bars
    chartHtml += '<div class="chart-bars">';
    for (const [status, count] of Object.entries(distribution)) {
        const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
        chartHtml += `
            <div class="chart-bar-container">
                <div class="chart-label">${statusLabels[status] || status}: ${count}</div>
                <div class="chart-bar" style="width: ${percentage}%; background-color: ${statusColors[status] || '#6c757d'}"></div>
                <div class="chart-percentage">${percentage}%</div>
            </div>
        `;
    }
    chartHtml += '</div>';

    // Add simple legend
    chartHtml += '<div class="chart-legend">';
    for (const [status, label] of Object.entries(statusLabels)) {
        if (distribution[status] !== undefined) {
            chartHtml += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${statusColors[status]}"></span>
                    <span>${label}</span>
                </div>
            `;
        }
    }
    chartHtml += '</div>';

    chartHtml += '</div>';
    chartContainer.innerHTML = chartHtml;
}

/**
 * Update recent reservations table
 */
function updateRecentReservations(reservations) {
    const tableBody = document.getElementById('recentReservationsBody');
    if (!tableBody) return;

    if (!reservations || reservations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No recent reservations found</td>
            </tr>
        `;
        return;
    }

    let html = '';

    reservations.forEach(reservation => {
        const statusClass = getStatusClass(reservation.status);

        html += `
            <tr>
                <td>${reservation.id}</td>
                <td>${reservation.guest_name}</td>
                <td>${formatDate(reservation.check_in_date)}</td>
                <td>${formatDate(reservation.check_out_date)}</td>
                <td><span class="badge ${statusClass}">${reservation.status}</span></td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Get status badge class based on reservation status
 */
function getStatusClass(status) {
    const statusLower = status.toLowerCase();

    switch (statusLower) {
        case 'confirmed':
            return 'bg-success';
        case 'pending':
            return 'bg-warning text-dark';
        case 'checked-in':
        case 'checked_in':
            return 'bg-info';
        case 'checked-out':
        case 'checked_out':
            return 'bg-secondary';
        case 'cancelled':
        case 'canceled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString; // Return as is if formatting fails
    }
}

/**
 * Handle API errors
 */
function handleApiError(error) {
    let errorMessage = 'An error occurred while loading dashboard data';

    if (error.response) {
        // Server responded with a status code outside the 2xx range
        const responseData = error.response.data;
        errorMessage = responseData.message || `Server error: ${error.response.status}`;

        // Check for authentication issues
        if (error.response.status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
        }
    } else if (error.request) {
        // Request was made but no response was received
        errorMessage = 'No response from server. Please check your connection';
    }

    // Show error message
    Swal.fire({
        icon: 'error',
        title: 'Dashboard Error',
        text: errorMessage
    });
}
