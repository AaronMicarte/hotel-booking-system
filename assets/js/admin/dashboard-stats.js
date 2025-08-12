// /*
//   Dashboard Statistics
//   Fetches and displays statistics on the admin dashboard
//  */
(function () {
    // ### LOAD DASHBOARD STATS ###
    async function loadDashboardStats() {
        try {
            // Fetch dashboard data from API
            const response = await axios.get('../../api/admin/dashboard/dashboard.php');
            const data = response.data;

            if (data.status === 'success') {
                // ### ROOM STATS ###
                // Update room statistics
                document.getElementById('totalRooms').textContent = data.stats.totalRooms || 0;
                document.getElementById('availableRooms').textContent = data.stats.availableRooms || 0;

                // ### GUEST STATS ###
                // Update guest count
                document.getElementById('totalGuests').textContent = data.stats.totalGuests || 0;

                // ### RESERVATION STATS ###
                // Update active reservations
                document.getElementById('activeReservations').textContent = data.stats.activeReservations || 0;

                // ### REVENUE STATS ###
                // Update total revenue with proper formatting
                const revenue = parseFloat(data.stats.totalRevenue || 0).toLocaleString('en-PH', {
                    style: 'currency',
                    currency: 'PHP'
                });
                document.getElementById('totalRevenue').textContent = revenue;

                // ### RECENT RESERVATIONS ###
                // Load recent reservations into table
                loadRecentReservations(data.reservations || []);

                // ### ROOM STATUS CHART ###
                renderRoomStatusChart(data.stats.roomStatus || []);

                console.log('Dashboard stats loaded successfully');
            } else {
                console.error('Error loading dashboard stats:', data);
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    // ### RECENT RESERVATIONS TABLE ###
    function loadRecentReservations(reservations) {
        const tbody = document.getElementById('recentReservationsBody');
        if (!tbody) return;

        if (!reservations || reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent reservations found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        reservations.forEach(res => {
            tbody.innerHTML += `
                <tr>
                    <td>${res.reservation_id}</td>
                    <td>${res.guest_name}</td>
                    <td>${res.check_in_date}</td>
                    <td>${res.check_out_date}</td>
                    <td><span class="badge bg-${getStatusColor(res.status)}">${res.status}</span></td>
                </tr>
            `;
        });
    }

    // Helper to get status color
    function getStatusColor(status) {
        status = (status || '').toLowerCase();
        if (status === 'confirmed') return 'success';
        if (status === 'pending') return 'warning';
        if (status === 'checked-in') return 'primary';
        if (status === 'checked-out') return 'info';
        if (status === 'cancelled') return 'danger';
        return 'secondary';
    }

    // ### ROOM STATUS CHART ###
    function renderRoomStatusChart(statusData) {
        const chartDiv = document.getElementById('roomStatusChart');
        if (!chartDiv) return;
        if (!statusData || statusData.length === 0) {
            chartDiv.innerHTML = '<div class="text-muted text-center">No data</div>';
            return;
        }
        // Bootstrap color mapping
        const colorMap = {
            'available': 'success',
            'occupied': 'danger',
            'maintenance': 'warning',
            'reserved': 'info'
        };
        // Calculate total for percentage
        const total = statusData.reduce((sum, s) => sum + parseInt(s.count), 0);
        chartDiv.innerHTML = `
            <div class="d-flex flex-column gap-2">
                ${statusData.map(s => `
                    <div>
                        <span class="fw-bold text-capitalize">${s.status}</span>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-${colorMap[s.status] || 'secondary'}" 
                                 role="progressbar" 
                                 style="width: ${(total ? (s.count / total * 100) : 0).toFixed(1)}%;" 
                                 aria-valuenow="${s.count}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="${total}">
                                ${s.count} (${total ? ((s.count / total * 100).toFixed(1)) : 0}%)
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ### INITIALIZE DASHBOARD ###
    function initDashboard() {
        // Load stats when page loads
        loadDashboardStats();

        // Set up refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadDashboardStats);
        }
    }

    // Run on page load
    document.addEventListener('DOMContentLoaded', initDashboard);
})();
