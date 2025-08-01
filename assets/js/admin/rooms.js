/**
 * Rooms Management - Main Module
 * Handles room listing, creation, editing, and status updates
 */

// Import dependencies
import { initUI, setupEventListeners, renderRooms } from './rooms-ui.js';
import { loadRooms, getRoom, createRoom, updateRoom, updateRoomStatus } from './rooms-api.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!window.adminAuth) {
        console.error('Admin auth not initialized');
        window.location.href = 'admin-login.html';
        return;
    }

    // Require authentication
    if (!window.adminAuth.requireAuth()) {
        return; // Auth check will redirect if needed
    }

    try {
        // Initialize UI components
        initUI();

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
        setupEventListeners({
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

        // Load initial data
        await loadRooms();

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

// Export functions that need to be accessible globally
export {
    loadRooms,
    getRoom,
    createRoom,
    updateRoom,
    updateRoomStatus
};
