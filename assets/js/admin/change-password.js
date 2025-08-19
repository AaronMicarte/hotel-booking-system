document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('changePasswordForm');
    const alertBox = document.getElementById('changePassAlert');
    const userId = localStorage.getItem('pendingChangeUserId');

    if (!userId) {
        window.location.href = "login.html";
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        alertBox.classList.add('d-none');
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;
        if (newPass.length < 6) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Password must be at least 6 characters.';
            alertBox.classList.remove('d-none');
            return;
        }
        if (newPass !== confirmPass) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Passwords do not match.';
            alertBox.classList.remove('d-none');
            return;
        }
        try {
            const res = await axios.put(
                '/Hotel-Reservation-Billing-System/api/admin/add-user/users.php',
                {
                    user_id: userId,
                    password: newPass
                }
            );
            if (res.data && res.data.status === 'success') {
                alertBox.className = 'alert alert-success';
                alertBox.textContent = 'Password changed successfully. Please log in again.';
                alertBox.classList.remove('d-none');
                localStorage.removeItem('pendingChangeUserId');
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            } else {
                throw new Error(res.data.message || 'Failed to change password');
            }
        } catch (err) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Failed to change password. Please try again.';
            alertBox.classList.remove('d-none');
        }
    });
});
