/**
 * Addons API Module
 * Handles API requests for addon data
 */

import { renderAddons, renderCategories } from './addons-ui.js';

// Current state
let currentFilters = {};
let currentPage = 1;
let itemsPerPage = 10;

/**
 * Load addons data with pagination and filtering
 */
export async function loadAddons(filters = {}, page = 1, limit = 10) {
    try {
        // Update state
        currentFilters = filters;
        currentPage = page;
        itemsPerPage = limit;

        // Show loading state
        const tableBody = document.getElementById('addonsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="admin-loading">Loading addons data...</div>
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
        if (filters.category) queryParams.append('category', filters.category);

        // Make API request
        const response = await axios.get(`../api/admin/addons/list.php?${queryParams.toString()}`);

        // Handle response
        if (response.data) {
            renderAddons(response.data.addons, response.data.total);
        }

        return response.data;
    } catch (error) {
        console.error('Error loading addons:', error);

        // Show error in table
        const tableBody = document.getElementById('addonsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading addons. ${error.response?.data?.message || 'Please try again.'}
                    </td>
                </tr>
            `;
        }

        throw error;
    }
}

/**
 * Get a single addon by ID
 */
export async function getAddon(id) {
    try {
        const response = await axios.get(`../api/admin/addons/get.php?id=${id}`);
        return response.data.addon;
    } catch (error) {
        console.error(`Error getting addon ${id}:`, error);
        throw error;
    }
}

/**
 * Create a new addon
 */
export async function createAddon(addonData) {
    try {
        const response = await axios.post('../api/admin/addons/create.php', addonData);
        return response.data;
    } catch (error) {
        console.error('Error creating addon:', error);
        throw error;
    }
}

/**
 * Update an existing addon
 */
export async function updateAddon(id, addonData) {
    try {
        const response = await axios.put(`../api/admin/addons/update.php?id=${id}`, addonData);
        return response.data;
    } catch (error) {
        console.error(`Error updating addon ${id}:`, error);
        throw error;
    }
}

/**
 * Load categories
 */
export async function loadCategories() {
    try {
        // Show loading state
        const tableBody = document.getElementById('categoriesTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="admin-loading">Loading categories data...</div>
                    </td>
                </tr>
            `;
        }

        // Make API request
        const response = await axios.get('../api/admin/addons/categories.php');

        // Handle response
        if (response.data && response.data.categories) {
            renderCategories(response.data.categories);

            // Also update the category dropdowns
            updateCategoryDropdowns(response.data.categories);
        }

        return response.data;
    } catch (error) {
        console.error('Error loading categories:', error);

        // Show error in table
        const tableBody = document.getElementById('categoriesTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading categories. ${error.response?.data?.message || 'Please try again.'}
                    </td>
                </tr>
            `;
        }

        throw error;
    }
}

/**
 * Create a new category
 */
export async function createCategory(categoryData) {
    try {
        const response = await axios.post('../api/admin/addons/create-category.php', categoryData);
        return response.data;
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
}

/**
 * Update an existing category
 */
export async function updateCategory(id, categoryData) {
    try {
        const response = await axios.put(`../api/admin/addons/update-category.php?id=${id}`, categoryData);
        return response.data;
    } catch (error) {
        console.error(`Error updating category ${id}:`, error);
        throw error;
    }
}

/**
 * Update category dropdowns with available categories
 */
function updateCategoryDropdowns(categories) {
    const categoryDropdowns = document.querySelectorAll('.category-dropdown');

    if (categoryDropdowns.length > 0) {
        categoryDropdowns.forEach(dropdown => {
            // Keep the first option (usually a placeholder)
            const firstOption = dropdown.options[0];
            dropdown.innerHTML = '';
            dropdown.appendChild(firstOption);

            // Add categories as options
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_name;
                option.textContent = category.category_name;
                dropdown.appendChild(option);
            });
        });
    }
}

/**
 * Refresh current data
 */
export async function refreshAddons() {
    return await loadAddons(currentFilters, currentPage, itemsPerPage);
}

// Make refresh function available globally
window.refreshAddons = refreshAddons;
