/**
 * Addons Management - Main Module
 * Handles addon listing, creation, editing, and status updates
 */

// API Base URL
const BASE_URL = 'http://localhost/Hotel-Reservation-Billing-System/api';

// Global variables
let cachedAddons = [];
let cachedCategories = [];

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

        // Set up global addon actions for HTML click handlers
        window.addonActions = {
            viewAddon: async (id) => {
                try {
                    const addon = await getAddon(id);
                    // Open modal and populate with addon data in view mode
                    const modal = new bootstrap.Modal(document.getElementById('addonModal'));
                    document.getElementById('addonModalLabel').textContent = 'View Addon';

                    // Set form to read-only
                    const form = document.getElementById('addonForm');
                    const formInputs = form.querySelectorAll('input, select, textarea');
                    formInputs.forEach(input => input.setAttribute('disabled', 'disabled'));

                    // Hide save button
                    document.getElementById('saveAddonBtn').style.display = 'none';

                    // Populate form fields
                    document.getElementById('addonId').value = addon.addon_id;
                    document.getElementById('addonName').value = addon.name;
                    document.getElementById('addonCategory').value = addon.category_name;
                    document.getElementById('addonPrice').value = addon.price;
                    document.getElementById('addonAvailable').checked = addon.is_available === '1';

                    modal.show();
                } catch (error) {
                    console.error('Error viewing addon:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load addon details.'
                    });
                }
            },

            editAddon: async (id) => {
                try {
                    const addon = await getAddon(id);
                    // Open modal and populate with addon data for editing
                    const modal = new bootstrap.Modal(document.getElementById('addonModal'));
                    document.getElementById('addonModalLabel').textContent = 'Edit Addon';

                    // Enable form fields
                    const form = document.getElementById('addonForm');
                    const formInputs = form.querySelectorAll('input, select, textarea');
                    formInputs.forEach(input => input.removeAttribute('disabled'));

                    // Show save button
                    document.getElementById('saveAddonBtn').style.display = 'block';

                    // Populate form fields
                    document.getElementById('addonId').value = addon.addon_id;
                    document.getElementById('addonName').value = addon.name;
                    document.getElementById('addonCategory').value = addon.category_id;
                    document.getElementById('addonPrice').value = addon.price;
                    document.getElementById('addonAvailable').checked = addon.is_available === '1';

                    modal.show();
                } catch (error) {
                    console.error('Error editing addon:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load addon for editing.'
                    });
                }
            },

            toggleAvailability: async (id, currentStatus) => {
                try {
                    const newStatus = currentStatus == 1 ? 0 : 1;
                    const statusText = newStatus == 1 ? 'Available' : 'Unavailable';

                    // Only update is_available, do not touch any other fields
                    await updateAddon({
                        addon_id: id,
                        is_available: newStatus
                    });
                    await loadAddons();

                    const toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });

                    toast.fire({
                        icon: 'success',
                        title: `Addon is now ${statusText}`
                    });
                } catch (error) {
                    console.error('Error toggling availability:', error);
                    Swal.fire('Error', 'Failed to update addon status', 'error');
                }
            },

            deleteAddon: async (id) => {
                try {
                    // Confirm deletion
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: 'Delete Addon?',
                        text: 'This action cannot be undone. Are you sure?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, delete it',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#dc3545'
                    });

                    if (result.isConfirmed) {
                        await updateAddon(id, { is_deleted: 1 });

                        // Reload the table
                        await loadAddons();

                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'The addon has been deleted.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                } catch (error) {
                    console.error('Error deleting addon:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to delete addon.'
                    });
                }
            }
        };

        // Setup category actions
        window.categoryActions = {
            editCategory: async (id) => {
                try {
                    const response = await axios.get(`${BASE_URL}/admin/addons/categories.php?id=${id}`);

                    if (response.data && response.data.status === 'success' && response.data.data) {
                        const category = response.data.data;
                        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
                        document.getElementById('categoryModalLabel').textContent = 'Edit Category';

                        // Populate the form fields
                        document.getElementById('categoryId').value = category.category_id;
                        document.getElementById('categoryName').value = category.category_name;

                        modal.show();
                    } else {
                        throw new Error('Invalid response format');
                    }
                } catch (error) {
                    console.error('Error editing category:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load category details.'
                    });
                }
            },

            deleteCategory: async (id) => {
                try {
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: 'Delete Category?',
                        text: 'This will also delete all associated addons. This action cannot be undone.',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, delete it',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#dc3545'
                    });

                    if (result.isConfirmed) {
                        // Soft delete the category
                        // This would usually be implemented in an API
                        await updateCategory(id, { is_deleted: 1 });

                        // Reload categories
                        await loadCategories();

                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'The category has been deleted.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                } catch (error) {
                    console.error('Error deleting category:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to delete category.'
                    });
                }
            }
        };

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
        console.log('Starting addons data load...');

        try {
            await fetchCategories();
            console.log('Categories fetched:', cachedCategories.length);
            populateCategoryFilter();

            // Also load categories table data immediately
            await loadCategories();
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }

        try {
            await loadAddons();
            console.log('Addons loaded successfully');
        } catch (error) {
            console.error('Failed to load addons:', error);
        }

        console.log('Addons module initialized successfully');
    } catch (error) {
        console.error('Error initializing addons module:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize addons module. Please try refreshing the page.'
        });
    }
});

function initUI() {
    // Placeholder: add any UI initialization logic here if needed
}

function setupAllEventListeners() {
    // Add Addon button
    const addAddonBtn = document.getElementById('addAddonBtn');
    if (addAddonBtn) {
        addAddonBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openAddonModal();
        });
    }

    // Add Category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openCategoryModal();
        });
    }

    // Save Addon button
    const saveAddonBtn = document.getElementById('saveAddonBtn');
    if (saveAddonBtn) {
        saveAddonBtn.addEventListener('click', function (e) {
            e.preventDefault();
            saveAddon();
        });
    }

    // Save Category button
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', function (e) {
            e.preventDefault();
            saveCategory();
        });
    }

    // Search buttons
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function (e) {
            e.preventDefault();
            searchAddons();
        });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function (e) {
            // filterAddons(); // <-- This function does not exist
            searchAddons(); // Use the existing search function for filtering
        });
    }

    // Add tab switching event listener to load categories when tab is clicked
    const categoriesTab = document.getElementById('categories-tab');
    if (categoriesTab) {
        categoriesTab.addEventListener('click', function (e) {
            console.log('Categories tab clicked, loading data...');
            setTimeout(() => loadCategories(), 100); // Small delay to ensure tab content is shown
        });
    }

    // Add event listener for addons tab
    const addonsTab = document.getElementById('addons-tab');
    if (addonsTab) {
        addonsTab.addEventListener('click', function (e) {
            console.log('Addons tab clicked, loading data...');
            setTimeout(() => loadAddons(), 100);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function (e) {
            e.preventDefault();
            loadAddons();
            loadCategories();
        });
    }
}

// API Functions
async function fetchCategories() {
    try {
        console.log('Fetching categories from API...');
        const response = await axios.get(`${BASE_URL}/admin/addons/categories.php`);

        if (response.data && response.data.status === 'success') {
            cachedCategories = response.data.data || [];
            console.log('Successfully cached categories:', cachedCategories);
            return cachedCategories;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        cachedCategories = [];
        throw error;
    }
}

async function loadAddons() {
    try {
        console.log('Loading addons...');
        const addonsTableBody = document.getElementById('addonsTableBody');

        if (!addonsTableBody) {
            throw new Error('Addons table body element not found');
        }

        // Show loading state
        addonsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Loading addons...</span>
                </td>
            </tr>
        `;

        const response = await axios.get(`${BASE_URL}/admin/addons/addons.php`);

        if (response.data && response.data.status === 'success') {
            const addons = response.data.data || [];
            cachedAddons = addons;
            displayAddons(addons);
            console.log("Addons loaded successfully");
        } else {
            throw new Error('Failed to load addons');
        }

    } catch (error) {
        console.error('Error in loadAddons:', error);
        if (addonsTableBody) {
            addonsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message || 'Failed to load addons'}
                        <br>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadAddons()">
                            <i class="fas fa-sync-alt me-1"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

async function loadCategories() {
    try {
        console.log('Loading categories...');
        const categoriesTableBody = document.getElementById('categoriesTableBody');

        if (!categoriesTableBody) {
            throw new Error('Categories table body element not found');
        }

        // Show loading state
        categoriesTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Loading categories...</span>
                </td>
            </tr>
        `;

        const categories = await fetchCategories();
        displayCategories(categories);
        populateCategoryFilter();
        console.log("Categories loaded successfully");

    } catch (error) {
        console.error('Error in loadCategories:', error);
        if (categoriesTableBody) {
            categoriesTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message || 'Failed to load categories'}
                        <br>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadCategories()">
                            <i class="fas fa-sync-alt me-1"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function displayAddons(addons) {
    const tableBody = document.getElementById('addonsTableBody');
    tableBody.innerHTML = '';

    if (!Array.isArray(addons) || addons.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <i class="fas fa-info-circle"></i> No addons found. Please add some addons.
                </td>
            </tr>
        `;
        return;
    }

    addons.forEach((addon, index) => {
        const statusBadge = addon.is_available == 1
            ? '<span class="badge bg-success">Available</span>'
            : '<span class="badge bg-danger">Unavailable</span>';

        const toggleIcon = addon.is_available == 1
            ? 'fa-toggle-on text-success'
            : 'fa-toggle-off text-danger';

        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${addon.name}</td>
                <td>${addon.category_name || 'Uncategorized'}</td>
                <td>₱${parseFloat(addon.price).toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editAddon(${addon.addon_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-link" onclick="toggleAvailability(${addon.addon_id}, ${addon.is_available})" title="Toggle availability">
                        <i class="fas ${toggleIcon} fa-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAddon(${addon.addon_id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById('totalAddons').textContent = addons.length;
}

function displayCategories(categories) {
    const tableBody = document.getElementById('categoriesTableBody');
    tableBody.innerHTML = '';

    if (!Array.isArray(categories) || categories.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    <i class="fas fa-info-circle"></i> No categories found. Please add some categories.
                </td>
            </tr>
        `;
        return;
    }

    categories.forEach((category, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${category.category_name}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${category.category_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.category_id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById('totalCategories').textContent = categories.length;
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    const addonCategory = document.getElementById('addonCategory');

    if (categoryFilter) {
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        cachedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;
            categoryFilter.appendChild(option);
        });

        if (currentValue) {
            categoryFilter.value = currentValue;
        }
    }

    if (addonCategory) {
        const currentValue = addonCategory.value;
        addonCategory.innerHTML = '<option value="">-- Select Category --</option>';

        cachedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;
            addonCategory.appendChild(option);
        });

        if (currentValue) {
            addonCategory.value = currentValue;
        }
    }
}

// Modal Functions
function openAddonModal() {
    const modal = new bootstrap.Modal(document.getElementById('addonModal'));
    document.getElementById('addonModalLabel').textContent = 'Add New Addon';
    document.getElementById('addonForm').reset();
    document.getElementById('addonId').value = '';
    populateCategoryFilter();
    modal.show();
}

function openCategoryModal() {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    document.getElementById('categoryModalLabel').textContent = 'Add New Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    modal.show();
}

// CRUD Functions
async function saveAddon() {
    try {
        const addonId = document.getElementById('addonId').value;
        const name = document.getElementById('addonName').value;
        const categoryId = document.getElementById('addonCategory').value;
        const price = document.getElementById('addonPrice').value;
        const isAvailable = document.getElementById('addonAvailable').checked;

        if (!name || !categoryId || !price) {
            Swal.fire('Error', 'Please fill in all required fields', 'error');
            return;
        }

        const addonData = {
            name: name,
            category_id: parseInt(categoryId),
            price: parseFloat(price),
            is_available: isAvailable ? 1 : 0
        };

        if (addonId) {
            // Update existing addon
            addonData.addon_id = parseInt(addonId);
            await updateAddon(addonData);
            Swal.fire('Success', 'Addon updated successfully', 'success');
        } else {
            // Create new addon
            await createAddon(addonData);
            Swal.fire('Success', 'Addon created successfully', 'success');
        }

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('addonModal')).hide();
        await loadAddons();
    } catch (error) {
        console.error('Error saving addon:', error);
        Swal.fire('Error', 'Failed to save addon', 'error');
    }
}

async function saveCategory() {
    try {
        const categoryId = document.getElementById('categoryId').value;
        const categoryName = document.getElementById('categoryName').value;

        if (!categoryName) {
            Swal.fire('Error', 'Please enter a category name', 'error');
            return;
        }

        const categoryData = {
            category_name: categoryName
        };

        if (categoryId) {
            // Update existing category
            categoryData.category_id = parseInt(categoryId);
            await updateCategory(categoryData);
            Swal.fire('Success', 'Category updated successfully', 'success');
        } else {
            // Create new category
            await createCategory(categoryData);
            Swal.fire('Success', 'Category created successfully', 'success');
        }

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        await loadCategories();
        await fetchCategories(); // Refresh cached categories
        populateCategoryFilter(); // Update the filter dropdown
    } catch (error) {
        console.error('Error saving category:', error);
        Swal.fire('Error', 'Failed to save category', 'error');
    }
}

// API helper functions
async function createAddon(addonData) {
    const response = await axios.post(`${BASE_URL}/admin/addons/addons.php`, addonData);
    return response.data;
}

async function updateAddon(addonData) {
    // Only send the fields present in addonData
    const response = await axios.put(`${BASE_URL}/admin/addons/addons.php`, addonData);
    return response.data;
}

async function createCategory(categoryData) {
    const response = await axios.post(`${BASE_URL}/admin/addons/categories.php`, categoryData);
    return response.data;
}

async function updateCategory(categoryData) {
    const response = await axios.put(`${BASE_URL}/admin/addons/categories.php`, categoryData);
    return response.data;
}

async function getAddon(id) {
    const response = await axios.get(`${BASE_URL}/admin/addons/addons.php?id=${id}`);
    // If the response is an object with status/data, return data; else, return as is
    if (response.data && response.data.status && response.data.data) {
        return response.data.data;
    }
    return response.data;
}

async function getCategory(id) {
    const response = await axios.get(`${BASE_URL}/admin/addons/categories.php?id=${id}`);
    if (response.data && response.data.status === 'success') {
        return response.data.data;
    }
    throw new Error('Failed to fetch category');
}

// Action functions (called from HTML)
async function editAddon(id) {
    try {
        const addon = await getAddon(id);
        const modal = new bootstrap.Modal(document.getElementById('addonModal'));
        document.getElementById('addonModalLabel').textContent = 'Edit Addon';

        populateCategoryFilter();

        document.getElementById('addonId').value = addon.addon_id;
        document.getElementById('addonName').value = addon.name;
        document.getElementById('addonCategory').value = addon.category_id;
        document.getElementById('addonPrice').value = addon.price;
        document.getElementById('addonAvailable').checked = addon.is_available == 1;

        modal.show();
    } catch (error) {
        console.error('Error editing addon:', error);
        Swal.fire('Error', 'Failed to load addon for editing', 'error');
    }
}

async function editCategory(id) {
    try {
        const response = await axios.get(`${BASE_URL}/admin/addons/categories.php?id=${id}`);

        if (response.data && response.data.status === 'success' && response.data.data) {
            const category = response.data.data;
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            document.getElementById('categoryModalLabel').textContent = 'Edit Category';

            // Populate the form fields
            document.getElementById('categoryId').value = category.category_id;
            document.getElementById('categoryName').value = category.category_name;

            modal.show();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error editing category:', error);
        Swal.fire('Error', 'Failed to load category for editing', 'error');
    }
}

async function deleteAddon(id) {
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
            await axios.delete(`${BASE_URL}/admin/addons/addons.php?id=${id}`);
            await loadAddons();
            Swal.fire('Deleted!', 'Addon has been deleted.', 'success');
        }
    } catch (error) {
        console.error('Error deleting addon:', error);
        Swal.fire('Error', 'Failed to delete addon', 'error');
    }
}

async function deleteCategory(id) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will also affect all addons in this category!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            await axios.delete(`${BASE_URL}/admin/addons/categories.php?id=${id}`);
            await loadCategories();
            await fetchCategories();
            populateCategoryFilter();
            Swal.fire('Deleted!', 'Category has been deleted.', 'success');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        Swal.fire('Error', 'Failed to delete category', 'error');
    }
}

async function toggleAvailability(id, currentStatus) {
    try {
        const newStatus = currentStatus == 1 ? 0 : 1;
        const statusText = newStatus == 1 ? 'Available' : 'Unavailable';

        // Only update is_available, do not touch any other fields
        await updateAddon({
            addon_id: id,
            is_available: newStatus
        });
        await loadAddons();

        const toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });

        toast.fire({
            icon: 'success',
            title: `Addon is now ${statusText}`
        });
    } catch (error) {
        console.error('Error toggling availability:', error);
        Swal.fire('Error', 'Failed to update addon status', 'error');
    }
}

async function searchAddons() {
    try {
        const searchTerm = document.getElementById('searchAddon').value.trim();
        const categoryId = document.getElementById('categoryFilter').value;

        // Show loading state
        const tableBody = document.getElementById('addonsTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Searching...</span>
                </td>
            </tr>
        `;

        // Use axios params for cleaner code
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (categoryId) params.category = categoryId;

        const response = await axios.get(`${BASE_URL}/admin/addons/addons.php`, { params });

        if (response.data && response.data.status === 'success') {
            const addons = response.data.data || [];
            displayAddons(addons);

            // Show search results message
            if (searchTerm || categoryId) {
                const toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });

                toast.fire({
                    icon: 'info',
                    title: `Found ${addons.length} addon(s)`
                });
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        Swal.fire('Error', 'Failed to search addons', 'error');
    }
}

// Add event listener for search input (real-time search)
document.getElementById('searchAddon')?.addEventListener('keyup', debounce(() => {
    searchAddons();
}, 500));

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.loadAddons = loadAddons;
window.loadCategories = loadCategories;
window.editAddon = editAddon;
window.editCategory = editCategory;
window.deleteAddon = deleteAddon;
window.deleteCategory = deleteCategory;
window.toggleAvailability = toggleAvailability;
window.searchAddons = searchAddons;