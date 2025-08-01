/**
 * Addons Management - Main Module
 * Handles addon listing, creation, editing, and status updates
 */

// Import dependencies
import { initUI, setupEventListeners, renderAddons, renderCategories } from './addons-ui.js';
import { loadAddons, getAddon, createAddon, updateAddon, loadCategories, createCategory } from './addons-api.js';

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
                    document.getElementById('addonCategory').value = addon.category_name;
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
                    // Convert currentStatus to a number to ensure proper comparison
                    const currentStatusNum = parseInt(currentStatus);
                    // Toggle: if 1, make it 0; if 0, make it 1
                    const newStatus = currentStatusNum === 1 ? 0 : 1;
                    const statusText = newStatus === 1 ? 'Available' : 'Unavailable';

                    // Confirm status change
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: `Make Addon ${statusText}?`,
                        text: 'Are you sure you want to change the availability of this addon?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, change it',
                        cancelButtonText: 'Cancel'
                    });

                    if (result.isConfirmed) {
                        await updateAddon(id, { is_available: newStatus });

                        // Reload the table
                        await loadAddons();

                        Swal.fire({
                            icon: 'success',
                            title: 'Status Updated!',
                            text: `The addon is now ${statusText.toLowerCase()}.`,
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                } catch (error) {
                    console.error('Error changing addon status:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to update addon status.'
                    });
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
                    const category = await getCategory(id);
                    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
                    document.getElementById('categoryModalLabel').textContent = 'Edit Category';

                    document.getElementById('categoryId').value = category.category_id;
                    document.getElementById('categoryName').value = category.category_name;

                    modal.show();
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

        // Setup event listeners
        setupEventListeners({
            loadAddons,
            getAddon,
            createAddon,
            updateAddon,
            loadCategories,
            createCategory
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
        await loadAddons();
        await loadCategories();

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

// Export functions that need to be accessible globally
export {
    loadAddons,
    getAddon,
    createAddon,
    updateAddon,
    loadCategories,
    createCategory
};
