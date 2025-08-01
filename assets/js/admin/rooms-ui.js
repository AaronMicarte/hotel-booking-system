/**
 * Rooms UI Module
 * Handles UI rendering and event management for rooms
 */

// State management
let currentRooms = [];
let totalRooms = 0;
let itemsPerPage = 10;
let currentPage = 1;
let apiHandlers = {};

/**
 * Initialize the UI components
 */
export function initUI() {
    // Initialize the room modal functionality
    initRoomModal();

    // Initialize tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
    }

    console.log('Rooms UI initialized');
}

/**
 * Initialize the room modal
 */
function initRoomModal() {
    const modal = document.getElementById('roomModal');
    if (!modal) return;

    // Reset form when modal is closed
    modal.addEventListener('hidden.bs.modal', () => {
        document.getElementById('roomForm').reset();
        document.getElementById('roomId').value = '';

        // Remove disabled attribute from form elements
        const formElements = document.getElementById('roomForm').elements;
        for (let i = 0; i < formElements.length; i++) {
            formElements[i].removeAttribute('disabled');
        }

        // Show save button
        document.getElementById('saveRoomBtn').style.display = 'block';
    });
}

/**
 * Setup event listeners for all interactive elements
 */
export function setupEventListeners(handlers) {
    // Store API handlers for later use
    apiHandlers = handlers;

    // Search functionality
    const searchButton = document.getElementById('searchBtn');
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }

    const searchInput = document.getElementById('searchRoom');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Filter functionality
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', handleApplyFilters);
    }

    // Add room button
    const addRoomBtn = document.getElementById('addRoomBtn');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', handleAddRoom);
    }

    // Save room button
    const saveRoomBtn = document.getElementById('saveRoomBtn');
    if (saveRoomBtn) {
        saveRoomBtn.addEventListener('click', handleSaveRoom);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Show loading state on the button
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;

            // Refresh the data
            apiHandlers.loadRooms({}, currentPage, itemsPerPage)
                .finally(() => {
                    // Restore button state
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                    refreshBtn.disabled = false;
                });
        });
    }
}

/**
 * Handle search button click
 */
function handleSearch() {
    const searchTerm = document.getElementById('searchRoom').value.trim();

    // Load rooms with search filter
    apiHandlers.loadRooms({
        search: searchTerm,
        type: document.getElementById('typeFilter').value,
        status: document.getElementById('statusFilter').value
    }, 1, itemsPerPage);
}

/**
 * Handle apply filters button click
 */
function handleApplyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchRoom').value.trim();

    // Load rooms with filters
    apiHandlers.loadRooms({
        search: searchTerm,
        type: typeFilter,
        status: statusFilter
    }, 1, itemsPerPage);
}

/**
 * Handle add room button click
 */
function handleAddRoom() {
    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    document.getElementById('roomModalLabel').textContent = 'Add New Room';
    document.getElementById('roomId').value = '';
    document.getElementById('roomForm').reset();

    // Set default status to available
    document.getElementById('roomStatus').value = 'available';

    modal.show();
}

/**
 * Handle save room button click
 */
async function handleSaveRoom() {
    try {
        // Get form values
        const roomId = document.getElementById('roomId').value;
        const roomNumber = document.getElementById('roomNumber').value;
        const roomType = document.getElementById('roomType').value;
        const roomStatus = document.getElementById('roomStatus').value;

        // Validate form
        if (!roomNumber || !roomType || !roomStatus) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please fill out all required fields'
            });
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveRoomBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        // Prepare room data
        const roomData = {
            room_number: roomNumber,
            room_type: roomType,
            status: roomStatus
        };

        // Create or update room
        let response;
        if (roomId) {
            // Update existing room
            response = await apiHandlers.updateRoom(roomId, roomData);
        } else {
            // Create new room
            response = await apiHandlers.createRoom(roomData);
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('roomModal'));
        modal.hide();

        // Show success message
        Swal.fire({
            icon: 'success',
            title: roomId ? 'Room Updated!' : 'Room Created!',
            text: response.message || 'The room has been saved successfully.',
            timer: 2000,
            showConfirmButton: false
        });

        // Refresh the table
        await apiHandlers.loadRooms({}, currentPage, itemsPerPage);

    } catch (error) {
        console.error('Error saving room:', error);

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'Failed to save room. Please try again.'
        });
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveRoomBtn');
        saveBtn.innerHTML = 'Save Room';
        saveBtn.disabled = false;
    }
}

/**
 * Render rooms data in the table
 */
export function renderRooms(rooms, total) {
    // Update state
    currentRooms = rooms;
    totalRooms = total;

    // Update total rooms counter
    const totalRoomsElement = document.getElementById('totalRooms');
    if (totalRoomsElement) {
        totalRoomsElement.textContent = total;
    }

    // Get table body
    const tableBody = document.getElementById('roomsTableBody');
    if (!tableBody) return;

    // Check if no rooms
    if (!rooms || rooms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="text-muted py-4">
                        <i class="fas fa-info-circle me-2"></i> No rooms found
                    </div>
                </td>
            </tr>
        `;

        // Update pagination
        updatePagination(0, 0, 0, 0);
        return;
    }

    // Generate rows
    let html = '';

    rooms.forEach(room => {
        // Format status badge
        const statusClass = getStatusClass(room.status);
        const statusBadge = `<span class="${statusClass}">${capitalizeFirst(room.status)}</span>`;

        // Format price with currency
        const formatter = new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        });
        const price = formatter.format(getRoomPrice(room.room_type));

        // Format last updated date
        const lastUpdated = new Date(room.updated_at).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <tr>
                <td>${room.room_number}</td>
                <td>${capitalizeFirst(room.room_type)}</td>
                <td>${statusBadge}</td>
                <td>${getRoomCapacity(room.room_type)}</td>
                <td>${price}</td>
                <td>${lastUpdated}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.roomActions.viewRoom(${room.room_id})" data-bs-toggle="tooltip" title="View Room">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="window.roomActions.editRoom(${room.room_id})" data-bs-toggle="tooltip" title="Edit Room">
                            <i class="fas fa-edit"></i>
                        </button>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-success dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-exchange-alt"></i> Status
                            </button>
                            <ul class="dropdown-menu">
                                ${room.status !== 'available' ? `<li><a class="dropdown-item" href="#" onclick="window.roomActions.changeStatus(${room.room_id}, 'available'); return false;"><i class="fas fa-check-circle text-success me-2"></i>Available</a></li>` : ''}
                                ${room.status !== 'maintenance' ? `<li><a class="dropdown-item" href="#" onclick="window.roomActions.changeStatus(${room.room_id}, 'maintenance'); return false;"><i class="fas fa-tools text-warning me-2"></i>Maintenance</a></li>` : ''}
                                ${room.status !== 'occupied' ? `<li><a class="dropdown-item" href="#" onclick="window.roomActions.changeStatus(${room.room_id}, 'occupied'); return false;"><i class="fas fa-bed text-danger me-2"></i>Occupied</a></li>` : ''}
                                ${room.status !== 'reserved' ? `<li><a class="dropdown-item" href="#" onclick="window.roomActions.changeStatus(${room.room_id}, 'reserved'); return false;"><i class="fas fa-calendar-check text-primary me-2"></i>Reserved</a></li>` : ''}
                            </ul>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    // Initialize tooltips for new elements
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
    }

    // Update pagination
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(startIndex + rooms.length - 1, total);
    updatePagination(startIndex, endIndex, total, Math.ceil(total / itemsPerPage));
}

/**
 * Update pagination elements
 */
export function updatePagination(from, to, total, totalPages) {
    // Update pagination info text
    const paginationFrom = document.getElementById('paginationFrom');
    const paginationTo = document.getElementById('paginationTo');
    const paginationTotal = document.getElementById('paginationTotal');

    if (paginationFrom) paginationFrom.textContent = from;
    if (paginationTo) paginationTo.textContent = to;
    if (paginationTotal) paginationTotal.textContent = total;

    // Generate pagination links
    const paginationElement = document.getElementById('roomsPagination');
    if (!paginationElement) return;

    // Clear existing pagination
    paginationElement.innerHTML = '';

    // If no results, hide pagination
    if (total === 0 || totalPages <= 1) {
        paginationElement.style.display = 'none';
        return;
    }

    paginationElement.style.display = 'flex';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;

    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });

    prevLi.appendChild(prevLink);
    paginationElement.appendChild(prevLi);

    // Determine pagination range
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    // Page links
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;

        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            goToPage(i);
        });

        pageLi.appendChild(pageLink);
        paginationElement.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;

    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });

    nextLi.appendChild(nextLink);
    paginationElement.appendChild(nextLi);
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
    currentPage = page;

    // Get current filters
    const searchTerm = document.getElementById('searchRoom').value.trim();
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    // Load rooms with the current filters and new page number
    apiHandlers.loadRooms({
        search: searchTerm,
        type: typeFilter,
        status: statusFilter
    }, page, itemsPerPage);
}

/**
 * Get appropriate CSS class for room status
 */
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'available':
            return 'room-status-available';
        case 'occupied':
            return 'room-status-occupied';
        case 'maintenance':
            return 'room-status-maintenance';
        case 'reserved':
            return 'room-status-reserved';
        default:
            return 'room-status-default';
    }
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Get room price based on type
 */
function getRoomPrice(roomType) {
    switch (roomType.toLowerCase()) {
        case 'regular':
            return 3000;
        case 'deluxe':
            return 5000;
        case 'executive':
            return 8000;
        default:
            return 0;
    }
}

/**
 * Get room capacity based on type
 */
function getRoomCapacity(roomType) {
    switch (roomType.toLowerCase()) {
        case 'regular':
            return 2;
        case 'deluxe':
            return 3;
        case 'executive':
            return 4;
        default:
            return 0;
    }
}
