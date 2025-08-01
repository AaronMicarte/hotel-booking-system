// Load components
import { loadHeader, loadFooter } from './components.js';

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Load header and footer
    loadHeader('header-container');
    loadFooter('footer-container');

    // Room booking handlers
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function () {
            const roomType = this.getAttribute('data-room-type');
            window.location.href = `rooms/room-template.html?type=${roomType}`;
        });
    });

    // Update room status function
    function updateRoomStatus(roomType, status) {
        const roomCard = document.querySelector(`[data-room-type="${roomType}"]`);
        if (!roomCard) return;

        const statusBadge = roomCard.querySelector('.room-status-badge');
        const statusInfo = roomCard.querySelector('.room-status-info small');

        statusBadge.classList.remove('available', 'occupied', 'maintenance');

        switch (status) {
            case 'available':
                statusBadge.classList.add('available');
                statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Available';
                statusInfo.className = 'text-success';
                statusInfo.innerHTML = '<i class="fas fa-check-circle"></i> Ready for booking';
                break;
            case 'occupied':
                statusBadge.classList.add('occupied');
                statusBadge.innerHTML = '<i class="fas fa-user-check"></i> Occupied';
                statusInfo.className = 'text-warning';
                statusInfo.innerHTML = '<i class="fas fa-clock"></i> Currently occupied';
                break;
            case 'maintenance':
                statusBadge.classList.add('maintenance');
                statusBadge.innerHTML = '<i class="fas fa-tools"></i> Maintenance';
                statusInfo.className = 'text-danger';
                statusInfo.innerHTML = '<i class="fas fa-tools"></i> Under maintenance';
                break;
        }
    }

    // Fetch room statuses
    async function fetchRoomStatuses() {
        try {
            const statuses = {
                'deluxe': 'available',
                'executive': 'available',
                'regular': 'available'
            };

            Object.entries(statuses).forEach(([roomType, status]) => {
                updateRoomStatus(roomType, status);
            });
        } catch (error) {
            console.error('Error fetching room statuses:', error);
        }
    }

    fetchRoomStatuses();
    setInterval(fetchRoomStatuses, 30000);
});
