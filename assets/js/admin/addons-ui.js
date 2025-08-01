/**
 * Addons UI Module
 * Handles UI rendering and event management for addons
 */

// State management
let currentAddons = [];
let totalAddons = 0;
let itemsPerPage = 10;
let currentPage = 1;
let apiHandlers = {};

/**
 * Initialize the UI components
 */
export function initUI() {
    // Initialize the addon modal functionality
    initAddonModal();
    initCategoryModal();

    // Initialize tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
    }

    // Add class to category dropdown elements
    document.querySelectorAll('#addonCategory, #categoryFilter').forEach(el => {
        el.classList.add('category-dropdown');
    });

    console.log('Addons UI initialized');
}

/**
 * Initialize the addon modal
 */
function initAddonModal() {
    const modal = document.getElementById('addonModal');
    if (!modal) return;

    // Reset form when modal is closed
    modal.addEventListener('hidden.bs.modal', () => {
        document.getElementById('addonForm').reset();
        document.getElementById('addonId').value = '';

        // Remove disabled attribute from form elements
        const formElements = document.getElementById('addonForm').elements;
        for (let i = 0; i < formElements.length; i++) {
            formElements[i].removeAttribute('disabled');
        }

        // Show save button
        document.getElementById('saveAddonBtn').style.display = 'block';
    });
}

/**
 * Initialize the category modal
 */
function initCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;

    // Reset form when modal is closed
    modal.addEventListener('hidden.bs.modal', () => {
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
    });
}

/**
 * Setup event listeners for all interactive elements
 */
export function setupEventListeners(handlers) {
    // Store API handlers for later use
    apiHandlers = handlers;

    // Tab switching to maintain data when switching tabs
    document.querySelectorAll('#addonTabs button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#addons-content') {
                handlers.loadAddons();
            } else if (targetId === '#categories-content') {
                handlers.loadCategories();
            }
        });
    });

    // Search functionality
    const searchButton = document.getElementById('searchBtn');
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }

    const searchInput = document.getElementById('searchAddon');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Category search
    const searchCategoryButton = document.getElementById('searchCategoryBtn');
    if (searchCategoryButton) {
        searchCategoryButton.addEventListener('click', handleCategorySearch);
    }

    const searchCategoryInput = document.getElementById('searchCategory');
    if (searchCategoryInput) {
        searchCategoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleCategorySearch();
            }
        });
    }

    // Add addon button
    const addAddonBtn = document.getElementById('addAddonBtn');
    if (addAddonBtn) {
        addAddonBtn.addEventListener('click', handleAddAddon);
    }

    // Save addon button
    const saveAddonBtn = document.getElementById('saveAddonBtn');
    if (saveAddonBtn) {
        saveAddonBtn.addEventListener('click', handleSaveAddon);
    }

    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', handleAddCategory);
    }

    // Save category button
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', handleSaveCategory);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Show loading state on the button
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;

            // Get active tab
            const activeTab = document.querySelector('#addonTabs button.active');
            const targetId = activeTab.getAttribute('data-bs-target');

            // Refresh based on active tab
            if (targetId === '#addons-content') {
                handlers.loadAddons()
                    .finally(() => {
                        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                        refreshBtn.disabled = false;
                    });
            } else if (targetId === '#categories-content') {
                handlers.loadCategories()
                    .finally(() => {
                        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                        refreshBtn.disabled = false;
                    });
            }
        });
    }
}

/**
 * Handle search button click
 */
function handleSearch() {
    const searchTerm = document.getElementById('searchAddon').value.trim();
    const categoryFilter = document.getElementById('categoryFilter').value;

    // Load addons with search filter
    apiHandlers.loadAddons({
        search: searchTerm,
        category: categoryFilter
    }, 1, itemsPerPage);
}

/**
 * Handle category search button click
 */
function handleCategorySearch() {
    const searchTerm = document.getElementById('searchCategory').value.trim();

    // Load categories with search filter
    apiHandlers.loadCategories({ search: searchTerm });
}

/**
 * Handle add addon button click
 */
function handleAddAddon() {
    const modal = new bootstrap.Modal(document.getElementById('addonModal'));
    document.getElementById('addonModalLabel').textContent = 'Add New Addon';
    document.getElementById('addonId').value = '';
    document.getElementById('addonForm').reset();
    document.getElementById('addonAvailable').checked = true;

    modal.show();
}

/**
 * Handle add category button click
 */
function handleAddCategory() {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    document.getElementById('categoryModalLabel').textContent = 'Add New Category';
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryForm').reset();

    modal.show();
}

/**
 * Handle save addon button click
 */
async function handleSaveAddon() {
    try {
        // Get form values
        const addonId = document.getElementById('addonId').value;
        const addonName = document.getElementById('addonName').value;
        const addonCategory = document.getElementById('addonCategory').value;
        const addonPrice = document.getElementById('addonPrice').value;
        const addonAvailable = document.getElementById('addonAvailable').checked;

        // Validate form
        if (!addonName || !addonCategory || !addonPrice) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please fill out all required fields'
            });
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveAddonBtn');
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        // Prepare addon data
        const addonData = {
            name: addonName,
            category: addonCategory,
            price: addonPrice,
            is_available: addonAvailable ? '1' : '0'
        };

        // Create or update addon
        let response;
        if (addonId) {
            // Update existing addon
            response = await apiHandlers.updateAddon(addonId, addonData);
        } else {
            // Create new addon
            response = await apiHandlers.createAddon(addonData);
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addonModal'));
        modal.hide();

        // Show success message
        Swal.fire({
            icon: 'success',
            title: addonId ? 'Addon Updated!' : 'Addon Created!',
            text: response.message || 'The addon has been saved successfully.',
            timer: 2000,
            showConfirmButton: false
        });

        // Refresh the table
        await apiHandlers.loadAddons();

    } catch (error) {
        console.error('Error saving addon:', error);

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'Failed to save addon. Please try again.'
        });
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveAddonBtn');
        saveBtn.innerHTML = 'Save Addon';
        saveBtn.disabled = false;
    }
}

/**
 * Handle save category button click
 */
async function handleSaveCategory() {
    try {
        // Get form values
        const categoryId = document.getElementById('categoryId').value;
        const categoryName = document.getElementById('categoryName').value;

        // Validate form
        if (!categoryName) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please select a category type'
            });
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveCategoryBtn');
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        // Prepare category data
        const categoryData = {
            category_name: categoryName
        };

        // Create or update category
        let response;
        if (categoryId) {
            // Update existing category
            response = await apiHandlers.updateCategory(categoryId, categoryData);
        } else {
            // Create new category
            response = await apiHandlers.createCategory(categoryData);
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        modal.hide();

        // Show success message
        Swal.fire({
            icon: 'success',
            title: categoryId ? 'Category Updated!' : 'Category Created!',
            text: response.message || 'The category has been saved successfully.',
            timer: 2000,
            showConfirmButton: false
        });

        // Refresh the categories
        await apiHandlers.loadCategories();

    } catch (error) {
        console.error('Error saving category:', error);

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'Failed to save category. Please try again.'
        });
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveCategoryBtn');
        saveBtn.innerHTML = 'Save Category';
        saveBtn.disabled = false;
    }
}

/**
 * Render addons data in the table
 */
export function renderAddons(addons, total) {
    // Update state
    currentAddons = addons;
    totalAddons = total;

    // Update total addons counter
    const totalAddonsElement = document.getElementById('totalAddons');
    if (totalAddonsElement) {
        totalAddonsElement.textContent = total;
    }

    // Get table body
    const tableBody = document.getElementById('addonsTableBody');
    if (!tableBody) return;

    // Check if no addons
    if (!addons || addons.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="text-muted py-4">
                        <i class="fas fa-info-circle me-2"></i> No addons found
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

    addons.forEach((addon, index) => {
        // Format price with currency
        const formatter = new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        });
        const price = formatter.format(addon.price);

        // Convert is_available to a number for proper comparison
        const isAvailable = parseInt(addon.is_available) === 1;

        // Status badge
        const statusBadge = isAvailable
            ? '<span class="badge bg-success">Available</span>'
            : '<span class="badge bg-danger">Unavailable</span>';

        html += `
            <tr>
                <td>${(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td>${addon.name}</td>
                <td>${addon.category_name}</td>
                <td>${price}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.addonActions.viewAddon(${addon.addon_id})" data-bs-toggle="tooltip" title="View Addon">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="window.addonActions.editAddon(${addon.addon_id})" data-bs-toggle="tooltip" title="Edit Addon">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-${isAvailable ? 'warning' : 'success'}" onclick="window.addonActions.toggleAvailability(${addon.addon_id}, ${addon.is_available})" data-bs-toggle="tooltip" title="${isAvailable ? 'Mark Unavailable' : 'Mark Available'}">
                            <i class="fas fa-${isAvailable ? 'times' : 'check'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.addonActions.deleteAddon(${addon.addon_id})" data-bs-toggle="tooltip" title="Delete Addon">
                            <i class="fas fa-trash"></i>
                        </button>
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
    const endIndex = Math.min(startIndex + addons.length - 1, total);
    updatePagination(startIndex, endIndex, total, Math.ceil(total / itemsPerPage));
}

/**
 * Render categories data in the table
 */
export function renderCategories(categories) {
    // Get table body
    const tableBody = document.getElementById('categoriesTableBody');
    if (!tableBody) return;

    // Check if no categories
    if (!categories || categories.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="text-muted py-4">
                        <i class="fas fa-info-circle me-2"></i> No categories found
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Generate rows
    let html = '';

    categories.forEach((category, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${category.category_name}</td>
                <td>${category.item_count || 0}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="window.categoryActions.editCategory(${category.category_id})" data-bs-toggle="tooltip" title="Edit Category">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.categoryActions.deleteCategory(${category.category_id})" data-bs-toggle="tooltip" title="Delete Category">
                            <i class="fas fa-trash"></i>
                        </button>
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

    // Update total categories counter
    const totalCategoriesElement = document.getElementById('totalCategories');
    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = categories.length;
    }
}

/**
 * Update pagination elements
 */
function updatePagination(from, to, total, totalPages) {
    // Update pagination info text
    const paginationFrom = document.getElementById('paginationFrom');
    const paginationTo = document.getElementById('paginationTo');
    const paginationTotal = document.getElementById('paginationTotal');

    if (paginationFrom) paginationFrom.textContent = from;
    if (paginationTo) paginationTo.textContent = to;
    if (paginationTotal) paginationTotal.textContent = total;

    // Generate pagination links
    const paginationElement = document.getElementById('addonsPagination');
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
    const searchTerm = document.getElementById('searchAddon').value.trim();
    const categoryFilter = document.getElementById('categoryFilter').value;

    // Load addons with the current filters and new page number
    apiHandlers.loadAddons({
        search: searchTerm,
        category: categoryFilter
    }, page, itemsPerPage);
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}
