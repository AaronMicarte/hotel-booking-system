/**
 * Reservations Management - Main Module
 * This file is the entry point for reservations management functionality
 */

// Import dependencies
import { initUI, setupEventListeners } from './reservations-ui.js';
import { loadReservations, getReservation, createReservation, updateReservation, deleteReservation } from './reservations-api.js';
import { initGuestFormHandlers } from './guests-form.js';

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

        // Setup event listeners
        setupEventListeners({
            loadReservations,
            getReservation,
            createReservation,
            updateReservation,
            deleteReservation
        });

        // Initialize guest form handlers for nested guest modal
        initGuestFormHandlers();

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
        await loadReservations();

    } catch (error) {
        console.error('Error initializing reservations module:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize reservations module. Please try refreshing the page.'
        });
    }
});

// Export functions that need to be accessible globally
window.reservationActions = {
    viewReservation: async (id) => {
        try {
            const reservation = await getReservation(id);
            // Open modal and populate with reservation data
            const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
            document.getElementById('reservationModalLabel').textContent = 'View Reservation';

            // Populate form fields
            document.getElementById('reservationId').value = reservation.reservation_id;
            // Set other fields here...

            modal.show();
        } catch (error) {
            console.error('Error viewing reservation:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reservation details.'
            });
        }
    },

    editReservation: async (id) => {
        try {
            const reservation = await getReservation(id);
            // Open modal and populate with reservation data for editing
            const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
            document.getElementById('reservationModalLabel').textContent = 'Edit Reservation';

            // Populate form fields
            document.getElementById('reservationId').value = reservation.reservation_id;
            // Set other fields here...

            modal.show();
        } catch (error) {
            console.error('Error editing reservation:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reservation for editing.'
            });
        }
    },

    deleteReservation: async (id) => {
        try {
            // Confirm deletion
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Delete Reservation',
                text: 'Are you sure you want to delete this reservation? This action cannot be undone.',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it',
                cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
                await deleteReservation(id);

                // Reload the table
                await loadReservations();

                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'The reservation has been deleted successfully.',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error deleting reservation:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to delete reservation.'
            });
        }
    }
};
