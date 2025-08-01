/**
 * Reservations API Module
 * Handles API requests for reservations data
 */

import { renderReservations } from './reservations-ui.js';

/**
 * Load reservations data with pagination and filtering
 */
export async function loadReservations(filters = {}, page = 1, limit = 10) {
    try {
        // Show loading state
        const tableBody = document.getElementById('reservationsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="admin-loading">Loading reservations data...</div>
                    </td>
                </tr>
            `;
        }

        // Build query string
        let queryParams = new URLSearchParams({
            page: page,
            limit: limit
        });

        // Add filters if present
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.dateFrom) queryParams.append('date_from', filters.dateFrom);
        if (filters.dateTo) queryParams.append('date_to', filters.dateTo);

        // Make API request
        const response = await axios.get(`../api/admin/reservations/list.php?${queryParams.toString()}`);

        // Handle response
        if (response.data) {
            renderReservations(response.data.reservations, response.data.total);
        }

        return response.data;
    } catch (error) {
        console.error('Error loading reservations:', error);

        // Show error in table
        const tableBody = document.getElementById('reservationsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading reservations. ${error.response?.data?.message || 'Please try again.'}
                    </td>
                </tr>
            `;
        }

        throw error;
    }
}

/**
 * Get a single reservation by ID
 */
export async function getReservation(id) {
    try {
        const response = await axios.get(`../api/admin/reservations/get.php?id=${id}`);
        return response.data.reservation;
    } catch (error) {
        console.error(`Error getting reservation ${id}:`, error);
        throw error;
    }
}

/**
 * Create a new reservation
 */
export async function createReservation(reservationData) {
    try {
        const response = await axios.post('../api/admin/reservations/create.php', reservationData);
        return response.data;
    } catch (error) {
        console.error('Error creating reservation:', error);
        throw error;
    }
}

/**
 * Update an existing reservation
 */
export async function updateReservation(id, reservationData) {
    try {
        const response = await axios.put(`../api/admin/reservations/update.php?id=${id}`, reservationData);
        return response.data;
    } catch (error) {
        console.error(`Error updating reservation ${id}:`, error);
        throw error;
    }
}

/**
 * Delete a reservation
 */
export async function deleteReservation(id) {
    try {
        const response = await axios.delete(`../api/admin/reservations/delete.php?id=${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting reservation ${id}:`, error);
        throw error;
    }
}
