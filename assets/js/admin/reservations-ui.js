/**
 * Reservations UI Module
 * Handles UI interactions and DOM manipulation for reservations management
 */

// State variables for pagination and filtering
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;
let filters = {
    search: '',
    status: '',
    dateFrom: '',
    dateTo: ''
};

/**
 * Initialize UI components
 */
export function initUI() {
    // Initialize date pickers
    $('.datepicker').datepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true
    });

    // Initialize sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('show');
        });
    }
}

/**
 * Set up event listeners for the page
 */
export function setupEventListeners(actions) {
    const { loadReservations, getReservation, createReservation, updateReservation } = actions;

    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchReservation');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            filters.search = searchInput.value.trim();
            currentPage = 1; // Reset to first page
            loadReservations(filters, currentPage, itemsPerPage);
        });

        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filters.search = searchInput.value.trim();
                currentPage = 1; // Reset to first page
                loadReservations(filters, currentPage, itemsPerPage);
            }
        });
    }

    // Apply filters
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            const statusFilter = document.getElementById('statusFilter');
            const dateFrom = document.getElementById('dateFrom');
            const dateTo = document.getElementById('dateTo');

            filters.status = statusFilter ? statusFilter.value : '';
            filters.dateFrom = dateFrom ? dateFrom.value : '';
            filters.dateTo = dateTo ? dateTo.value : '';

            currentPage = 1; // Reset to first page
            loadReservations(filters, currentPage, itemsPerPage);
        });
    }

    // Add new reservation
    const addReservationBtn = document.getElementById('addReservationBtn');
    if (addReservationBtn) {
        addReservationBtn.addEventListener('click', () => {
            // Reset form
            document.getElementById('reservationForm').reset();
            document.getElementById('reservationId').value = '';

            // Set modal title
            document.getElementById('reservationModalLabel').textContent = 'Add New Reservation';

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
            modal.show();
        });
    }

    // Save reservation (create/update)
    const saveReservationBtn = document.getElementById('saveReservationBtn');
    if (saveReservationBtn) {
        saveReservationBtn.addEventListener('click', async () => {
            // Validate form
            const form = document.getElementById('reservationForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            try {
                // Disable button to prevent double submission
                saveReservationBtn.disabled = true;
                saveReservationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                // Get form data
                const reservationId = document.getElementById('reservationId').value;
                const guestId = document.getElementById('guestSelect').value;
                const checkInDate = document.getElementById('checkInDate').value;
                const checkOutDate = document.getElementById('checkOutDate').value;
                const roomId = document.getElementById('roomSelect').value;
                const status = document.getElementById('statusSelect').value;

                const reservationData = {
                    guest_id: guestId,
                    check_in_date: checkInDate,
                    check_out_date: checkOutDate,
                    room_id: roomId,
                    status: status
                };

                if (reservationId) {
                    // Update existing reservation
                    await updateReservation(reservationId, reservationData);
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Reservation updated successfully!',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    // Create new reservation
                    await createReservation(reservationData);
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Reservation created successfully!',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
                if (modal) {
                    modal.hide();
                }

                // Reload reservations
                loadReservations(filters, currentPage, itemsPerPage);

            } catch (error) {
                console.error('Error saving reservation:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to save reservation. Please try again.'
                });
            } finally {
                // Re-enable button
                saveReservationBtn.disabled = false;
                saveReservationBtn.innerHTML = 'Save Reservation';
            }
        });
    }

    // Handle new guest button
    const newGuestBtn = document.getElementById('newGuestBtn');
    if (newGuestBtn) {
        newGuestBtn.addEventListener('click', () => {
            // Reset guest form
            document.getElementById('guestForm').reset();
            document.getElementById('guestId').value = '';

            // Set modal title
            document.getElementById('guestModalLabel').textContent = 'Add New Guest';

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('guestModal'));
            modal.show();
        });
    }

    // Handle room type selection to load available rooms
    const roomTypeSelect = document.getElementById('roomTypeSelect');
    if (roomTypeSelect) {
        roomTypeSelect.addEventListener('change', async () => {
            const roomType = roomTypeSelect.value;
            if (!roomType) return;

            try {
                // Get check-in and check-out dates for availability check
                const checkInDate = document.getElementById('checkInDate').value;
                const checkOutDate = document.getElementById('checkOutDate').value;

                // Fetch available rooms based on room type and dates
                const response = await fetch(`../api/admin/rooms/available.php?room_type=${roomType}&check_in=${checkInDate}&check_out=${checkOutDate}`);
                const data = await response.json();

                const roomSelect = document.getElementById('roomSelect');
                roomSelect.innerHTML = '<option value="">-- Select Room --</option>';

                if (data.rooms && data.rooms.length > 0) {
                    data.rooms.forEach(room => {
                        const option = document.createElement('option');
                        option.value = room.room_id;
                        option.textContent = `Room ${room.room_number}`;
                        roomSelect.appendChild(option);
                    });
                } else {
                    const option = document.createElement('option');
                    option.disabled = true;
                    option.textContent = 'No available rooms for this type and date range';
                    roomSelect.appendChild(option);
                }
            } catch (error) {
                console.error('Error loading available rooms:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load available rooms.'
                });
            }
        });
    }
}

/**
 * Render reservations data in the table
 */
export function renderReservations(reservations, totalCount) {
    const tableBody = document.getElementById('reservationsTableBody');
    const totalElement = document.getElementById('totalReservations');

    // Update total count
    totalItems = totalCount;
    if (totalElement) {
        totalElement.textContent = totalCount;
    }

    // Clear existing rows
    tableBody.innerHTML = '';

    // Check if no data
    if (!reservations || reservations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No reservations found</td>
            </tr>
        `;
        updatePagination(0);
        return;
    }

    // Render each reservation
    reservations.forEach(reservation => {
        // Determine status class
        let statusClass = '';
        switch (reservation.status.toLowerCase()) {
            case 'confirmed':
                statusClass = 'bg-success';
                break;
            case 'pending':
                statusClass = 'bg-warning text-dark';
                break;
            case 'checked-in':
                statusClass = 'bg-info';
                break;
            case 'checked-out':
                statusClass = 'bg-secondary';
                break;
            case 'cancelled':
                statusClass = 'bg-danger';
                break;
            default:
                statusClass = 'bg-secondary';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reservation.reservation_id}</td>
            <td>${reservation.guest_name}</td>
            <td>${reservation.room_number}</td>
            <td>${reservation.check_in_date}</td>
            <td>${reservation.check_out_date}</td>
            <td><span class="badge ${statusClass}">${reservation.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info me-1" onclick="window.reservationActions.viewReservation(${reservation.reservation_id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary me-1" onclick="window.reservationActions.editReservation(${reservation.reservation_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="window.reservationActions.deleteReservation(${reservation.reservation_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Update pagination
    updatePagination(totalCount);
}

/**
 * Update pagination controls
 */
export function updatePagination(totalCount) {
    const paginationElement = document.getElementById('reservationsPagination');
    const paginationFrom = document.getElementById('paginationFrom');
    const paginationTo = document.getElementById('paginationTo');
    const paginationTotal = document.getElementById('paginationTotal');

    if (!paginationElement) return;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Update pagination info
    if (paginationFrom && paginationTo && paginationTotal) {
        const from = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const to = Math.min(currentPage * itemsPerPage, totalCount);

        paginationFrom.textContent = from;
        paginationTo.textContent = to;
        paginationTotal.textContent = totalCount;
    }

    // Generate pagination HTML
    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if needed
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;

    // Update pagination element
    paginationElement.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    const pageLinks = paginationElement.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Skip if disabled
            if (link.parentElement.classList.contains('disabled')) {
                return;
            }

            const page = parseInt(link.getAttribute('data-page'));
            if (page && page !== currentPage) {
                currentPage = page;
                // Reload data with new page
                const loadReservationsFunc = window.loadReservations || window.reservationActions.loadReservations;
                if (loadReservationsFunc) {
                    loadReservationsFunc(filters, currentPage, itemsPerPage);
                }
            }
        });
    });
}
