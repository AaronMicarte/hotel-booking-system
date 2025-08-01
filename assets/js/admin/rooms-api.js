/**
 * Rooms API Module
 * Handles API requests for rooms data
 */

import { renderRooms } from './rooms-ui.js';

// Current state
let currentFilters = {};
let currentPage = 1;
let itemsPerPage = 10;

/**
 * Load rooms data with pagination and filtering
 */
export async function loadRooms(filters = {}, page = 1, limit = 10) {
    try {
        // Update state
        currentFilters = filters;
        currentPage = page;
        itemsPerPage = limit;

        // Show loading state
        const tableBody = document.getElementById('roomsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="admin-loading">Loading rooms data...</div>
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
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.status) queryParams.append('status', filters.status);

        // Make API request
        const response = await axios.get(`../api/admin/rooms/list.php?${queryParams.toString()}`);

        // Handle response
        if (response.data) {
            renderRooms(response.data.rooms, response.data.total);
        }

        return response.data;
    } catch (error) {
        console.error('Error loading rooms:', error);

        // Show error in table
        const tableBody = document.getElementById('roomsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading rooms. ${error.response?.data?.message || 'Please try again.'}
                    </td>
                </tr>
            `;
        }

        throw error;
    }
}

/**
 * Get a single room by ID
 */
export async function getRoom(id) {
    try {
        const response = await axios.get(`../api/admin/rooms/get.php?id=${id}`);
        return response.data.room;
    } catch (error) {
        console.error(`Error getting room ${id}:`, error);
        throw error;
    }
}

/**
 * Create a new room
 */
export async function createRoom(roomData) {
    try {
        const response = await axios.post('../api/admin/rooms/create.php', roomData);
        return response.data;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

/**
 * Update an existing room
 */
export async function updateRoom(id, roomData) {
    try {
        const response = await axios.put(`../api/admin/rooms/update.php?id=${id}`, roomData);
        return response.data;
    } catch (error) {
        console.error(`Error updating room ${id}:`, error);
        throw error;
    }
}

/**
 * Update a room's status
 */
export async function updateRoomStatus(id, status) {
    try {
        const response = await axios.patch(`../api/admin/rooms/update-status.php?id=${id}`, {
            status: status
        });
        return response.data;
    } catch (error) {
        console.error(`Error updating room status ${id}:`, error);
        throw error;
    }
}

/**
 * Refresh current data
 */
export async function refreshRooms() {
    return await loadRooms(currentFilters, currentPage, itemsPerPage);
}

// Make refresh function available globally
window.refreshRooms = refreshRooms;
