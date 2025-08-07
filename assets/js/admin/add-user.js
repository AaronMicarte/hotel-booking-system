(function () {
    // --- Email validation ---
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // --- Load user roles ---
    function loadUserRoles() {
        const roleSelect = document.getElementById('user-role');
        if (roleSelect) {
            axios.get('/Hotel-Reservation-Billing-System/api/admin/add-user/add-user.php')
                .then(response => {
                    const data = response.data;
                    if (data.status === 'success') {
                        // Remove old options except the first
                        while (roleSelect.options.length > 1) {
                            roleSelect.remove(1);
                        }
                        data.roles.forEach(role => {
                            const option = document.createElement('option');
                            option.value = role.user_roles_id;
                            option.textContent = role.role_type;
                            roleSelect.appendChild(option);
                        });
                    }
                })
                .catch(error => {
                    console.error('Error loading user roles:', error);
                });
        }
    }

    // --- Load user roles for edit modal ---
    async function loadEditUserRoles(selectedRoleId) {
        const roleSelect = document.getElementById('editUserRole');
        if (!roleSelect) {
            console.error('Edit user role select element not found!');
            return;
        }

        try {
            // Add debugging to see what's happening
            console.log('Loading edit user roles, select element found:', roleSelect);

            const response = await axios.get('/Hotel-Reservation-Billing-System/api/admin/add-user/add-user.php');
            const data = response.data;
            console.log('Role data received:', data);

            if (data.status === 'success' && data.roles && data.roles.length > 0) {
                // Clear dropdown and add default option
                roleSelect.innerHTML = '<option value="">Select Role</option>';

                // Add each role
                data.roles.forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.user_roles_id;
                    option.textContent = role.role_type;
                    roleSelect.appendChild(option);
                });

                // Set selected value if provided
                if (selectedRoleId) {
                    roleSelect.value = selectedRoleId;
                    console.log('Selected role ID:', selectedRoleId, 'Dropdown value set to:', roleSelect.value);
                }
            } else {
                console.error('No roles found or error in response', data);
                roleSelect.innerHTML = '<option value="">No roles available</option>';
            }
        } catch (error) {
            console.error('Error loading roles for edit modal:', error);
            roleSelect.innerHTML = '<option value="">Error loading roles</option>';
        }
    }

    // --- CRUD: User List Table ---
    async function loadUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Loading users...</td></tr>`;
        try {
            const res = await axios.get('/Hotel-Reservation-Billing-System/api/admin/add-user/users.php');
            // Show ALL users, including inactive (is_deleted = 1)
            const users = res.data.users || [];
            if (users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No users found.</td></tr>`;
                return;
            }
            tbody.innerHTML = '';
            users.forEach((user, idx) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${user.username}</td>
                        <td>${user.email || ''}</td>
                        <td>${user.role_type}</td>
                        <td>${user.created_at ? user.created_at.split(' ')[0] : ''}</td>
                        <td>
                            <span class="badge ${user.is_deleted ? 'bg-danger' : 'bg-success'}">
                                ${user.is_deleted ? 'Inactive' : 'Active'}
                            </span>
                        </td>
                        <td class="text-center">
                            <button class="btn btn-sm text-warning" data-action="status" data-id="${user.user_id}" title="${user.is_deleted ? 'Activate' : 'Deactivate'}">
                                <i class="fas fa-${user.is_deleted ? 'toggle-off' : 'toggle-on'}"></i>
                            </button>
                            <button class="btn btn-sm text-primary" data-action="edit" data-id="${user.user_id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            // Attach event listeners for edit/status
            tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', () => openEditUserModal(btn.dataset.id));
            });
            tbody.querySelectorAll('button[data-action="status"]').forEach(btn => {
                btn.addEventListener('click', () => confirmStatusChange(btn.dataset.id));
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load users.</td></tr>`;
        }
    }

    // --- SweetAlert confirmation for status change ---
    async function confirmStatusChange(userId) {
        try {
            const res = await axios.get(`/Hotel-Reservation-Billing-System/api/admin/add-user/users.php?id=${userId}`);
            const user = res.data.user;
            if (!user) throw new Error('User not found');
            const willActivate = !!user.is_deleted;
            const actionText = willActivate ? 'activate' : 'deactivate';
            const result = await Swal.fire({
                title: `Are you sure?`,
                text: `Do you want to ${actionText} user "${user.username}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: willActivate ? 'Activate' : 'Deactivate',
                cancelButtonText: 'Cancel',
                reverseButtons: true
            });
            if (result.isConfirmed) {
                await saveStatus(user.user_id, willActivate ? 0 : 1);
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to load user details', 'error');
        }
    }

    // --- Save status change (activate/inactivate) ---
    async function saveStatus(userId, is_deleted) {
        try {
            await axios.put('/Hotel-Reservation-Billing-System/api/admin/add-user/users.php', {
                user_id: userId,
                is_deleted: is_deleted,
                update_type: 'status_only'
            });
            loadUsersTable();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `User ${is_deleted ? 'deactivated' : 'activated'} successfully`,
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Failed to update user status',
                showConfirmButton: false,
                timer: 2000
            });
        }
    }

    // --- Modal logic for editing user ---
    async function openEditUserModal(userId) {
        try {
            const res = await axios.get(`/Hotel-Reservation-Billing-System/api/admin/add-user/users.php?id=${userId}`);
            const user = res.data.user;
            if (!user) throw new Error('User not found');
            // Fill modal fields
            document.getElementById('editUserId').value = user.user_id;
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editEmail').value = user.email || '';
            await loadEditUserRoles(user.user_roles_id); // <-- Load roles and set selected
            document.getElementById('editPassword').value = '';
            document.getElementById('editConfirmPassword').value = '';
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        } catch (err) {
            if (window.Swal) {
                Swal.fire('Error', 'Failed to load user details', 'error');
            }
        }
    }

    // Save changes from edit modal
    async function saveEditUserModal(e) {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const username = document.getElementById('editUsername').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const userRole = document.getElementById('editUserRole').value;
        const password = document.getElementById('editPassword').value;
        const confirmPassword = document.getElementById('editConfirmPassword').value;

        // Validation
        if (!username) {
            Swal.fire('Error', 'Username is required', 'error');
            return;
        }
        if (password && password !== confirmPassword) {
            Swal.fire('Error', 'Passwords do not match', 'error');
            return;
        }
        if (email && !isValidEmail(email)) {
            Swal.fire('Error', 'Please enter a valid email address', 'error');
            return;
        }
        if (!userRole) {
            Swal.fire('Error', 'Please select a user role', 'error');
            return;
        }

        const userData = {
            user_id: userId,
            username: username,
            email: email,
            user_roles_id: userRole
        };
        if (password) userData.password = password;

        try {
            await axios.put('/Hotel-Reservation-Billing-System/api/admin/add-user/users.php', userData);
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            loadUsersTable();
            Swal.fire('Success', 'User updated successfully', 'success');
        } catch (err) {
            Swal.fire('Error', 'Failed to update user', 'error');
        }
    }

    // --- Save (Add/Edit) User: update handleAddUserFormSubmit to support edit ---
    function handleAddUserFormSubmit(e) {
        e.preventDefault();
        const addUserForm = document.getElementById('add-user-form');
        // Get form values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const email = document.getElementById('email').value.trim();
        const userRole = document.getElementById('user-role').value;

        // Clear previous error messages
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

        // Validate inputs
        let isValid = true;

        if (username === '') {
            document.getElementById('username-error').textContent = 'Username is required';
            isValid = false;
        }

        if (password === '') {
            document.getElementById('password-error').textContent = 'Password is required';
            isValid = false;
        }

        if (password !== confirmPassword) {
            document.getElementById('confirm-password-error').textContent = 'Passwords do not match';
            isValid = false;
        }

        if (email !== '' && !isValidEmail(email)) {
            document.getElementById('email-error').textContent = 'Please enter a valid email address';
            isValid = false;
        }

        if (userRole === '') {
            document.getElementById('role-error').textContent = 'Please select a user role';
            isValid = false;
        }

        if (isValid) {
            const userData = {
                username: username,
                password: password,
                email: email,
                user_roles_id: userRole
            };
            const editingId = addUserForm.dataset.editingId;
            let request;
            if (editingId) {
                // Edit user (PUT)
                userData.user_id = editingId;
                request = axios.put('/Hotel-Reservation-Billing-System/api/admin/add-user/users.php', userData);
            } else {
                // Add user (POST)
                request = axios.post('/Hotel-Reservation-Billing-System/api/admin/add-user/add-user.php', userData);
            }
            request.then(response => {
                const data = response.data;
                const alertBox = document.getElementById('alert-box');
                if (data.status === 'success') {
                    alertBox.className = 'alert alert-success';
                    alertBox.textContent = data.message;
                    alertBox.style.display = 'block';
                    addUserForm.reset();
                    addUserForm.removeAttribute('data-editing-id');
                    setTimeout(() => {
                        alertBox.style.display = 'none';
                    }, 3000);
                    loadUsersTable();
                } else {
                    alertBox.className = 'alert alert-danger';
                    alertBox.textContent = data.message;
                    alertBox.style.display = 'block';
                }
            }).catch(error => {
                console.error('Error:', error);
                const alertBox = document.getElementById('alert-box');
                alertBox.className = 'alert alert-danger';
                alertBox.textContent = 'An error occurred. Please try again later.';
                alertBox.style.display = 'block';
            });
        }
    }

    function initAddUserModule() {
        // Load roles immediately on page load for both forms
        loadUserRoles();

        // Also pre-load the edit modal roles so they're ready when needed
        loadEditUserRoles();

        const addUserForm = document.getElementById('add-user-form');
        if (addUserForm) {
            addUserForm.addEventListener('submit', handleAddUserFormSubmit);
            // Reset editing state on reset
            addUserForm.addEventListener('reset', () => {
                addUserForm.removeAttribute('data-editing-id');
            });
        }

        // Modal save event listeners
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) {
            editUserForm.addEventListener('submit', saveEditUserModal);
        } else {
            console.error('Edit user form not found!');
        }

        // Add refresh handler
        const refreshBtn = document.getElementById('refreshUsersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadUsersTable);
        }

        // Load user table
        loadUsersTable();
    }

    // Auto-initialize on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', initAddUserModule);

    // Expose only what is needed for inline script usage
    window.loadUsersTable = loadUsersTable;
})();
