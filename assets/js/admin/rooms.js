/**
 * Rooms Management - Main Module
 * Handles room listing, creation, editing, and status updates
 */

// API Base URL
const BASE_URL = 'http://localhost/Hotel-Reservation-Billing-System/api';



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!window.adminAuth) {
        console.error('Admin auth not initialized');
        window.location.href = 'admin-login.html';
        return;
    }

    // Check authentication first
    if (!window.adminAuth || !window.adminAuth.requireAuth()) {
        console.error('Authentication failed');
        return; // Auth check will redirect if needed
    }

    try {
        // Initialize UI components
        initUI();

        // Setup ALL event listeners FIRST
        setupAllEventListeners();

        // Set up global room actions for HTML click handlers
        window.roomActions = {
            viewRoom: async (id) => {
                try {
                    const room = await getRoom(id);
                    // Open modal and populate with room data in view mode
                    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
                    document.getElementById('roomModalLabel').textContent = 'View Room';

                    // Set form to read-only
                    const form = document.getElementById('roomForm');
                    const formInputs = form.querySelectorAll('input, select, textarea');
                    formInputs.forEach(input => input.setAttribute('disabled', 'disabled'));

                    // Hide save button
                    document.getElementById('saveRoomBtn').style.display = 'none';

                    // Populate form fields
                    document.getElementById('roomId').value = room.room_id;
                    document.getElementById('roomNumber').value = room.room_number;
                    document.getElementById('roomType').value = room.room_type.toLowerCase();
                    document.getElementById('roomStatus').value = room.status.toLowerCase();
                    // Notes field removed

                    modal.show();
                } catch (error) {
                    console.error('Error viewing room:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load room details.'
                    });
                }
            },

            editRoom: async (id) => {
                try {
                    const room = await getRoom(id);
                    // Open modal and populate with room data for editing
                    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
                    document.getElementById('roomModalLabel').textContent = 'Edit Room';

                    // Enable form fields
                    const form = document.getElementById('roomForm');
                    const formInputs = form.querySelectorAll('input, select, textarea');
                    formInputs.forEach(input => input.removeAttribute('disabled'));

                    // Show save button
                    document.getElementById('saveRoomBtn').style.display = 'block';

                    // Populate form fields
                    document.getElementById('roomId').value = room.room_id;
                    document.getElementById('roomNumber').value = room.room_number;
                    document.getElementById('roomType').value = room.room_type.toLowerCase();
                    document.getElementById('roomStatus').value = room.status.toLowerCase();
                    // Notes field removed

                    modal.show();
                } catch (error) {
                    console.error('Error editing room:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load room for editing.'
                    });
                }
            },

            changeStatus: async (id, status) => {
                try {
                    // Confirm status change
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: `Change Room Status to ${status.charAt(0).toUpperCase() + status.slice(1)}?`,
                        text: 'Are you sure you want to change the status of this room?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, change it',
                        cancelButtonText: 'Cancel'
                    });

                    if (result.isConfirmed) {
                        await updateRoomStatus(id, status);

                        // Reload the table
                        await loadRooms();

                        Swal.fire({
                            icon: 'success',
                            title: 'Status Updated!',
                            text: 'The room status has been updated successfully.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                } catch (error) {
                    console.error('Error changing room status:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to update room status.'
                    });
                }
            }
        };

        // Setup event listeners
        setupRoomEventListeners({
            loadRooms,
            getRoom,
            createRoom,
            updateRoom,
            updateRoomStatus
        });

        // Set user info in UI
        const user = window.adminAuth.getUser();
        if (user) {
            document.getElementById('userName').textContent = user.username;
            document.getElementById('userRole').textContent = user.role_type || 'admin';
        }

        // Setup logout button
        document.getElementById('logoutBtn').addEventListener('click', function (e) {
            e.preventDefault();
            window.adminAuth.logout();
        });

        // Load initial data with better error handling
        console.log('Starting data load...');

        try {
            await fetchRoomTypes();
            console.log('Room types fetched:', cachedRoomTypes.length);
            populateTypeFilter();

            // Also load room types table data immediately
            await loadRoomTypes();
        } catch (error) {
            console.error('Failed to fetch room types:', error);
        }

        try {
            await loadRooms();
            console.log('Rooms loaded successfully');
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }

        console.log('Rooms module initialized successfully');
    } catch (error) {
        console.error('Error initializing rooms module:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize rooms module. Please try refreshing the page.'
        });
    }
});

// ROOM TYPES INTEGRATION

let cachedRoomTypes = [];

// Add function to populate type filter dropdown - MOVE THIS UP
function populateTypeFilter() {
    const typeFilter = document.getElementById('typeFilter');
    if (!typeFilter) {
        console.error('Type filter element not found');
        return;
    }

    console.log('Populating type filter with room types:', cachedRoomTypes);

    // Save current selection
    const currentValue = typeFilter.value;
    typeFilter.innerHTML = '<option value="">All Types</option>';

    if (cachedRoomTypes && cachedRoomTypes.length > 0) {
        cachedRoomTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.room_type_id; // Use room_type_id as value
            option.textContent = type.type_name;
            typeFilter.appendChild(option);
        });

        // Restore selection if it still exists
        if (currentValue) {
            typeFilter.value = currentValue;
        }
    } else {
        console.warn('No room types available for filter');
    }
}

async function fetchRoomTypes() {
    try {
        console.log('Fetching room types from API...');

        // Increase timeout and add retry logic
        const maxRetries = 3;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                const response = await axios.get(`${BASE_URL}/admin/rooms/room-type.php`, {
                    timeout: 15000, // Increased to 15 seconds
                    validateStatus: function (status) {
                        return status >= 200 && status < 300;
                    }
                });

                if (!response.data) {
                    throw new Error('No data received from server');
                }

                if (Array.isArray(response.data)) {
                    cachedRoomTypes = response.data;
                    console.log('Successfully cached room types:', cachedRoomTypes);
                    return cachedRoomTypes;
                }

                throw new Error('Invalid response format');
            } catch (retryError) {
                lastError = retryError;
                attempt++;
                if (attempt < maxRetries) {
                    console.log(`Retry attempt ${attempt} of ${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                }
            }
        }

        throw lastError;
    } catch (error) {
        console.error('Failed to fetch room types after all retries:', error);
        cachedRoomTypes = [];
        throw error;
    }
}

async function populateFilterDropdowns() {
    await fetchRoomTypes();

    // Populate type filter dropdown
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter && cachedRoomTypes.length > 0) {
        typeFilter.innerHTML = '<option value="">All Types</option>';
        cachedRoomTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.type_name;
            option.textContent = type.type_name;
            typeFilter.appendChild(option);
        });
    }
}

function populateRoomTypeSelect(selectedId = '') {
    const roomTypeSelect = document.getElementById('roomType');
    if (!roomTypeSelect) return;

    roomTypeSelect.innerHTML = '<option value="">-- Select Room Type --</option>';
    cachedRoomTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.room_type_id;
        option.textContent = type.type_name;
        if (selectedId && selectedId == type.room_type_id) {
            option.selected = true;
        }
        roomTypeSelect.appendChild(option);
    });
}

// Load Room Types with better error handling and debugging
async function loadRoomTypes() {
    try {
        console.log("Starting loadRoomTypes...");
        const roomTypesTableBody = document.getElementById('roomTypesTableBody');

        if (!roomTypesTableBody) {
            throw new Error('Table body element not found');
        }

        // Show loading state
        roomTypesTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Loading room types...</span>
                </td>
            </tr>
        `;

        // Fetch room types with a timeout
        const types = await Promise.race([
            fetchRoomTypes(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            )
        ]);

        if (!types || !Array.isArray(types)) {
            throw new Error('Invalid data format received');
        }

        displayRoomTypes(types);
        console.log("Room types loaded successfully");

    } catch (error) {
        console.error('Error in loadRoomTypes:', error);

        if (roomTypesTableBody) {
            roomTypesTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message || 'Failed to load room types'}
                        <br>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadRoomTypes()">
                            <i class="fas fa-sync-alt me-1"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

async function filterRooms() {
    try {
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (!typeFilter || !statusFilter) {
            console.error('Filter elements not found', { typeFilter, statusFilter });
            return;
        }

        const typeId = typeFilter.value || '';
        const status = statusFilter.value || '';

        console.log('Filtering with values:', { typeId, status });

        let url = `${BASE_URL}/admin/rooms/rooms.php`;
        const params = [];

        if (typeId) params.push(`type_id=${encodeURIComponent(typeId)}`);
        if (status) params.push(`status=${encodeURIComponent(status)}`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        console.log('Filter URL:', url);
        const response = await axios.get(url);
        console.log('Filter response:', response.data);

        if (Array.isArray(response.data)) {
            displayRooms(response.data);
        } else {
            console.error('Response is not an array:', response.data);
            Swal.fire('Error', 'Invalid response from server', 'error');
        }
    } catch (error) {
        console.error('Filter error:', error);
        Swal.fire('Error', 'Failed to filter rooms: ' + error.message, 'error');
    }
}

function openRoomModal() {
    console.log("Opening room modal");
    const roomForm = document.getElementById('roomForm');
    if (!roomForm) {
        console.error('Room form not found');
        return;
    }

    roomForm.reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomModalLabel').textContent = 'Add New Room';

    // Ensure room types are loaded before showing modal
    if (cachedRoomTypes.length === 0) {
        fetchRoomTypes()
            .then(() => {
                populateRoomTypeSelect();
                showModal();
            })
            .catch(error => {
                console.error('Error populating room types:', error);
                Swal.fire('Error', 'Failed to load room types: ' + error.message, 'error');
            });
    } else {
        populateRoomTypeSelect();
        showModal();
    }

    function showModal() {
        try {
            const roomModal = document.getElementById('roomModal');
            if (!roomModal) {
                console.error('Room modal element not found');
                return;
            }
            const modal = new bootstrap.Modal(roomModal);
            modal.show();
            console.log("Room modal shown");
        } catch (error) {
            console.error('Error showing room modal:', error);
            Swal.fire('Error', 'Could not open the modal: ' + error.message, 'error');
        }
    }
}

function displayRooms(rooms) {
    const tableBody = document.getElementById('roomsTableBody');
    tableBody.innerHTML = '';

    rooms.forEach(room => {
        tableBody.innerHTML += `
            <tr>
                <td>${room.room_number}</td>
                <td>${room.type_name}</td>
                <td>
                    ${room.key_features ?
                `<small class="text-muted">${room.key_features.split(',').map(f => f.trim()).join(' • ')}</small>` :
                '-'}
                </td>
                <td><span class="badge bg-${getStatusColor(room.room_status)}">${room.room_status}</span></td>
                <td>${room.max_capacity || '-'}</td>
                <td>₱${room.price_per_stay || '0.00'}</td>
                <td>${formatDate(room.updated_at)}</td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        ${generateStatusButtons(room)}
                        <button class="btn btn-sm text-primary" onclick="editRoom(${room.room_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm text-danger" onclick="deleteRoom(${room.room_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    document.getElementById('totalRooms').textContent = rooms.length;
}



// Make functions globally available
window.editRoom = editRoom;
window.deleteRoom = deleteRoom;
window.saveRoom = saveRoom;
window.openRoomModal = openRoomModal;
window.searchRooms = searchRooms;
window.filterRooms = filterRooms;
window.changeStatus = changeStatus;
window.loadRoomTypes = loadRoomTypes;
window.editRoomType = editRoomType;
window.deleteRoomType = deleteRoomType;
window.openRoomTypeModal = openRoomTypeModal;
window.saveRoomType = saveRoomType;

function initUI() {
    // Placeholder: add any UI initialization logic here if needed
}

function setupAllEventListeners() {
    // Add Room button
    const addRoomBtn = document.getElementById('addRoomBtn');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Add room button clicked');
            openRoomModal();
        });
        console.log('Add room button listener attached');
    } else {
        console.error('Add room button not found');
    }

    // Save Room button
    const saveRoomBtn = document.getElementById('saveRoomBtn');
    if (saveRoomBtn) {
        saveRoomBtn.addEventListener('click', function (e) {
            e.preventDefault();
            saveRoom();
        });
        console.log('Save room button listener attached');
    }

    // Apply Filters button
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Apply filters clicked');
            filterRooms();
        });
        console.log('Apply filters button listener attached');
    } else {
        console.error('Apply filters button not found');
    }

    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function (e) {
            e.preventDefault();
            searchRooms();
        });
    }

    // Search on Enter key
    const searchRoom = document.getElementById('searchRoom');
    if (searchRoom) {
        searchRoom.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') {
                searchRooms();
            }
        });
    }

    // Add Room Type button
    const addRoomTypeBtn = document.getElementById('addRoomTypeBtn');
    if (addRoomTypeBtn) {
        addRoomTypeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openRoomTypeModal();
        });
    }

    // Save Room Type button
    const saveRoomTypeBtn = document.getElementById('saveRoomTypeBtn');
    if (saveRoomTypeBtn) {
        saveRoomTypeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            saveRoomType();
        });
    }

    // Room image preview
    const roomImage = document.getElementById('roomImage');
    if (roomImage) {
        roomImage.addEventListener('change', function (e) {
            previewImage(e);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function (e) {
            e.preventDefault();
            loadRooms();
        });
    }

    // Add tab switching event listener to load room types when tab is clicked
    const roomTypesTab = document.getElementById('roomtypes-tab');
    if (roomTypesTab) {
        roomTypesTab.addEventListener('click', function (e) {
            console.log('Room types tab clicked, loading data...');
            setTimeout(() => loadRoomTypes(), 100); // Small delay to ensure tab content is shown
        });
    }
}

// Function to preview the selected image
function previewImage(event) {
    const imagePreview = document.getElementById('imagePreview');
    if (!imagePreview) return;

    imagePreview.innerHTML = '';

    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.classList.add('img-thumbnail', 'mt-2');
            img.style.maxHeight = '150px';
            imagePreview.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
}

// Fix the displayRoomTypes function
function displayRoomTypes(types) {
    console.log("Displaying room types:", types);
    const tableBody = document.getElementById('roomTypesTableBody');
    if (!tableBody) {
        console.error('Room types table body element not found');
        return;
    }

    tableBody.innerHTML = '';

    if (!Array.isArray(types) || types.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <i class="fas fa-info-circle"></i> No room types found. Please add some room types.
                </td>
            </tr>
        `;
        return;
    }

    types.forEach(type => {
        // Build proper image URL
        let imgSrc = '';
        if (type.image_url) {
            if (type.image_url.startsWith('http://') || type.image_url.startsWith('https://')) {
                imgSrc = type.image_url;
            } else {
                const baseUrl = window.location.origin;
                const projectPath = '/Hotel-Reservation-Billing-System/';
                imgSrc = baseUrl + projectPath + type.image_url.replace(/^\/+/, '');
            }
        }

        const imageDisplay = imgSrc ?
            `<img src="${imgSrc}" alt="${type.type_name}" class="img-thumbnail" style="max-width: 80px; max-height: 80px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjhmOWZhIi8+CjxwYXRoIGQ9Ik00MCA0MEwyNS4xIDU4LjlINTQuOUw0MCA0MFoiIGZpbGw9IiNkZWUyZTYiLz4KPC9zdmc+'; this.style.opacity='0.5';">` :
            '<span class="text-muted">No image</span>';

        // Format key features as a list if they exist
        const keyFeaturesList = type.key_features ?
            `<small class="text-muted d-block mt-1">
                <i class="fas fa-list-ul"></i> ${type.key_features.split(',').map(f => f.trim()).join(' • ')}
            </small>` : '';

        tableBody.innerHTML += `
            <tr>
                <td>${imageDisplay}</td>
                <td>${type.type_name}</td>
                <td>${type.description || '-'}</td>
                <td>
                    ${type.key_features ?
                `<small>${type.key_features.split(',').map(f => f.trim()).join(' • ')}</small>` :
                '-'}
                </td>
                <td>${type.max_capacity || '-'}</td>
                <td>₱${type.price_per_stay || '0.00'}</td>
                <td>${type.room_size_sqm || '-'} sqm</td>
                <td class="text-center">
                    <button class="btn btn-sm text-primary" onclick="editRoomType(${type.room_type_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm text-danger" onclick="deleteRoomType(${type.room_type_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Remove the old setupRoomEventListeners function
function setupRoomEventListeners() {
    // This function is now replaced by setupAllEventListeners
    console.log('setupRoomEventListeners called - now using setupAllEventListeners');
}

// Add missing function implementations BEFORE window assignments

// Function to load rooms data from API
async function loadRooms() {
    try {
        console.log('Loading rooms...');

        // Show loading state
        const roomsTableBody = document.getElementById('roomsTableBody');
        if (roomsTableBody) {
            roomsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="admin-loading">Loading rooms data...</div>
                    </td>
                </tr>
            `;
        }

        const response = await axios.get(`${BASE_URL}/admin/rooms/rooms.php`);
        console.log('Rooms response:', response);

        if (response.data && Array.isArray(response.data)) {
            displayRooms(response.data);
            return response.data;
        } else {
            // Handle empty or error response
            displayRooms([]);
            return [];
        }
    } catch (error) {
        console.error('Error loading rooms:', error);

        const roomsTableBody = document.getElementById('roomsTableBody');
        if (roomsTableBody) {
            roomsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle"></i> Error loading rooms: ${error.message}
                    </td>
                </tr>
            `;
        }

        Swal.fire('Error', 'Failed to load rooms data: ' + error.message, 'error');
        return [];
    }
}

// Function to get a single room by ID
async function getRoom(id) {
    try {
        const response = await axios.get(`${BASE_URL}/admin/rooms/rooms.php?room_id=${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching room:', error);
        throw error;
    }
}

// Function to create a new room
async function createRoom(roomData) {
    try {
        const response = await axios.post(`${BASE_URL}/admin/rooms/rooms.php`, roomData);
        return response.data;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

// Function to update a room
async function updateRoom(roomData) {
    try {
        const response = await axios.put(`${BASE_URL}/admin/rooms/rooms.php`, roomData);
        return response.data;
    } catch (error) {
        console.error('Error updating room:', error);
        throw error;
    }
}

// Function to update room status
async function updateRoomStatus(roomId, statusId) {
    try {
        const response = await axios.put(`${BASE_URL}/admin/rooms/rooms.php`, {
            room_id: roomId,
            room_status_id: statusId,
            update_type: 'status_only'
        });
        return response.data;
    } catch (error) {
        console.error('Error updating room status:', error);
        throw error;
    }
}

// Function to search rooms
async function searchRooms() {
    try {
        const searchTerm = document.getElementById('searchRoom').value.trim();
        if (!searchTerm) {
            await loadRooms();
            return;
        }

        const response = await axios.get(`${BASE_URL}/admin/rooms/rooms.php?search=${encodeURIComponent(searchTerm)}`);
        displayRooms(response.data);
    } catch (error) {
        console.error('Search error:', error);
        Swal.fire('Error', 'Failed to search rooms', 'error');
    }
}

// Function to delete a room
async function deleteRoom(id) {
    try {
        // Confirm deletion
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            await axios.delete(`${BASE_URL}/admin/rooms/rooms.php?room_id=${id}`);
            await loadRooms();
            Swal.fire('Deleted!', 'Room has been deleted.', 'success');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        Swal.fire('Error', 'Failed to delete room', 'error');
    }
}

// Function to save room (create or update)
async function saveRoom() {
    try {
        const roomId = document.getElementById('roomId').value;
        const roomNumber = document.getElementById('roomNumber').value;
        const roomTypeId = document.getElementById('roomType').value;

        if (!roomNumber || !roomTypeId) {
            Swal.fire('Error', 'Please fill in all required fields', 'error');
            return;
        }

        const roomData = {
            room_number: roomNumber,
            room_type_id: parseInt(roomTypeId)
        };

        if (roomId) {
            // Update existing room
            roomData.room_id = parseInt(roomId);
            await updateRoom(roomData);
            Swal.fire('Success', 'Room updated successfully', 'success');
        } else {
            // Create new room
            await createRoom(roomData);
            Swal.fire('Success', 'Room created successfully', 'success');
        }

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('roomModal')).hide();
        await loadRooms();
    } catch (error) {
        console.error('Error saving room:', error);
        Swal.fire('Error', 'Failed to save room', 'error');
    }
}

// EDIT ROOM FUNCTION - Define properly before window assignment
async function editRoom(id) {
    try {
        console.log('Editing room with ID:', id);

        // Ensure room types are loaded for the dropdown
        if (cachedRoomTypes.length === 0) {
            await fetchRoomTypes();
        }

        const room = await getRoom(id);
        console.log('Room data:', room);

        const modal = new bootstrap.Modal(document.getElementById('roomModal'));
        document.getElementById('roomModalLabel').textContent = 'Edit Room';

        // Enable form fields
        const form = document.getElementById('roomForm');
        const formInputs = form.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => input.removeAttribute('disabled'));

        // Show save button
        document.getElementById('saveRoomBtn').style.display = 'block';

        // Populate room type dropdown first
        populateRoomTypeSelect(room.room_type_id);

        // Populate form fields
        document.getElementById('roomId').value = room.room_id;
        document.getElementById('roomNumber').value = room.room_number;
        document.getElementById('roomType').value = room.room_type_id || '';

        modal.show();
    } catch (error) {
        console.error('Error editing room:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load room for editing.'
        });
    }
}

// Update the getRoomType function to handle id parameter correctly
async function getRoomType(id) {
    try {
        const response = await axios.get(`${BASE_URL}/admin/rooms/room-type.php?id=${id}`);
        if (response.data) {
            return response.data;
        } else {
            throw new Error('Room type not found');
        }
    } catch (error) {
        console.error('Error fetching room type:', error);
        throw error;
    }
}

async function editRoomType(id) {
    try {
        const response = await axios.get(`${BASE_URL}/admin/rooms/room-type.php?id=${id}`);
        openRoomTypeModal(response.data);
    } catch (error) {
        console.error('Error loading room type:', error);
        Swal.fire('Error', 'Failed to load room type details', 'error');
    }
}

async function openRoomTypeModal(roomType = null) {
    const form = document.getElementById('roomTypeForm');
    form.reset();
    document.getElementById('roomTypeId').value = '';
    document.getElementById('roomTypeModalLabel').textContent = 'Add New Room Type';

    // Clear image preview
    document.getElementById('imagePreview').innerHTML = '';

    if (roomType) {
        // Populate form with room type data
        document.getElementById('roomTypeId').value = roomType.room_type_id;
        document.getElementById('typeName').value = roomType.type_name;
        document.getElementById('typeDescription').value = roomType.description || '';
        document.getElementById('maxCapacity').value = roomType.max_capacity || '';
        document.getElementById('pricePerStay').value = roomType.price_per_stay || '';
        document.getElementById('roomSize').value = roomType.room_size_sqm || '';
        document.getElementById('roomTypeModalLabel').textContent = 'Edit Room Type';

        // Display existing image
        if (roomType.image_url) {
            const imgSrc = roomType.image_url.startsWith('http') ?
                roomType.image_url :
                window.location.origin + '/Hotel-Reservation-Billing-System/' + roomType.image_url.replace(/^\/+/, '');

            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = roomType.type_name;
            img.classList.add('img-thumbnail', 'mt-2');
            img.style.maxHeight = '150px';
            document.getElementById('imagePreview').appendChild(img);
        }
    }

    const modal = new bootstrap.Modal(document.getElementById('roomTypeModal'));
    modal.show();
}

async function deleteRoomType(id) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            await axios.delete(`${BASE_URL}/admin/rooms/room-type.php?id=${id}`);
            await loadRoomTypes();
            Swal.fire('Deleted!', 'Room type has been deleted.', 'success');
        }
    } catch (error) {
        console.error('Error deleting room type:', error);
        Swal.fire('Error', 'Failed to delete room type', 'error');
    }
}

async function saveRoomType() {
    try {
        const formData = new FormData();
        const roomTypeId = document.getElementById('roomTypeId').value;
        const typeName = document.getElementById('typeName').value;
        const description = document.getElementById('typeDescription').value;
        const keyFeatures = document.getElementById('keyFeatures').value;
        const maxCapacity = document.getElementById('maxCapacity').value;
        const pricePerStay = document.getElementById('pricePerStay').value;
        const roomSize = document.getElementById('roomSize').value;
        const roomImage = document.getElementById('roomImage').files[0];

        if (!typeName) {
            Swal.fire('Error', 'Type name is required', 'error');
            return;
        }

        formData.append('type_name', typeName);
        formData.append('description', description);
        formData.append('key_features', keyFeatures);
        formData.append('max_capacity', maxCapacity);
        formData.append('price_per_stay', pricePerStay);
        formData.append('room_size_sqm', roomSize);

        if (roomTypeId) {
            formData.append('room_type_id', roomTypeId);
        }

        if (roomImage) {
            formData.append('room_image', roomImage);
        } else if (!roomTypeId) {
            Swal.fire('Error', 'Please upload an image for the new room type', 'error');
            return;
        }

        if (roomTypeId) {
            if (roomImage) {
                await axios.post(`${BASE_URL}/admin/rooms/room-type.php?update=true`, formData);
            } else {
                // Update without changing image
                const data = {
                    room_type_id: parseInt(roomTypeId),
                    type_name: typeName,
                    description: description,
                    key_features: keyFeatures,
                    max_capacity: maxCapacity,
                    price_per_stay: pricePerStay,
                    room_size_sqm: roomSize
                };
                await axios.put(`${BASE_URL}/admin/rooms/room-type.php`, data);
            }
        } else {
            await axios.post(`${BASE_URL}/admin/rooms/room-type.php`, formData);
        }

        bootstrap.Modal.getInstance(document.getElementById('roomTypeModal')).hide();
        await loadRoomTypes();
        await fetchRoomTypes(); // Refresh cached room types
        populateTypeFilter(); // Update the filter dropdown
        Swal.fire('Success', 'Room type saved successfully', 'success');
    } catch (error) {
        console.error('Error saving room type:', error);
        Swal.fire('Error', 'Failed to save room type', 'error');
    }
}

// Function to change room status
async function changeStatus(roomId, statusId) {
    try {
        await updateRoomStatus(roomId, statusId);
        await loadRooms();
        Swal.fire({
            icon: 'success',
            title: 'Status Updated!',
            text: 'Room status has been updated',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Error changing status:', error);
        Swal.fire('Error', 'Failed to update room status', 'error');
    }
}

// Add utilities
function getStatusColor(status) {
    const colors = {
        'available': 'success',
        'occupied': 'danger',
        'maintenance': 'warning',
        'reserved': 'info'
    };
    return colors[status] || 'secondary';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
}

function generateStatusButtons(room) {
    const statuses = [
        { id: 1, name: 'available', icon: 'check', color: 'success' },
        { id: 2, name: 'occupied', icon: 'bed', color: 'danger' },
        { id: 3, name: 'maintenance', icon: 'tools', color: 'warning' },
        { id: 4, name: 'reserved', icon: 'clock', color: 'info' }
    ];

    return statuses
        .filter(status => status.name !== room.room_status) // Don't show current status
        //# sourceMappingURL=rooms.js.map
        .map(status => `
            <button class="btn btn-sm text-${status.color}" 
                    onclick="changeStatus(${room.room_id}, ${status.id})" 
                    title="Mark as ${status.name}">
                <i class="fas fa-${status.icon}"></i>
            </button>
        `).join('');
}

//# sourceMappingURL=rooms.js.map
