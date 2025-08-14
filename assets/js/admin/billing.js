import {
    showBillingDetailsModal,
    showPaymentModal,
    recordPayment,
    deleteBilling,
    updateBillingStatus,
    getBillingStatuses
} from '../modules/admin/billing-module.js';

// API Base URL
const BASE_URL = "http://localhost/Hotel-Reservation-Billing-System/api";

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    loadBillings();
    document.getElementById("refreshBtn")?.addEventListener("click", loadBillings);
    document.getElementById("applyFilters")?.addEventListener("click", filterBillings);
    document.getElementById("searchBtn")?.addEventListener("click", searchBillings);
    document.getElementById("addPaymentBtn")?.addEventListener("click", () => showPaymentModal());
    document.getElementById("savePaymentBtn")?.addEventListener("click", async () => {
        if (await recordPayment()) loadBillings();
    });
    document.getElementById("searchBilling")?.addEventListener("keyup", (e) => {
        if (e.key === "Enter") searchBillings();
    });
    // Add event for reservation filter
    document.getElementById("filterByReservationBtn")?.addEventListener("click", () => {
        const reservationId = document.getElementById("reservationIdFilter").value;
        if (reservationId) {
            loadBillingsByReservation(reservationId);
        } else {
            loadBillings();
        }
    });
});

async function loadBillings() {
    const tbody = document.getElementById("billingTableBody");
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">Loading billing data...</td></tr>`;
    try {
        const response = await axios.get(`${BASE_URL}/admin/billing/billing.php`, {
            params: { operation: 'getAllBillings' }
        });
        console.debug("[Billing] API response:", response.data);
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            console.warn("[Billing] No billing data returned from API.");
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-warning">No billing records found.</td></tr>`;
            document.getElementById("totalBillings").textContent = "0";
            document.getElementById("paidBillings").textContent = "0";
            document.getElementById("unpaidBillings").textContent = "0";
            document.getElementById("partialBillings").textContent = "0";
            return;
        }
        displayBillings(response.data);
    } catch (err) {
        console.error("[Billing] Error loading billings:", err);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error loading billings</td></tr>`;
    }
}

function displayBillings(billings) {
    const tbody = document.getElementById("billingTableBody");
    tbody.innerHTML = "";
    console.debug("[Billing] Displaying billings:", billings);
    let paid = 0, unpaid = 0, partial = 0, total = billings.length;
    if (!Array.isArray(billings) || billings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-warning">No billing records found.</td></tr>`;
        document.getElementById("totalBillings").textContent = "0";
        document.getElementById("paidBillings").textContent = "0";
        document.getElementById("unpaidBillings").textContent = "0";
        document.getElementById("partialBillings").textContent = "0";
        return;
    }
    billings.forEach(b => {
        if (b.billing_status === "paid") paid++;
        else if (b.billing_status === "unpaid") unpaid++;
        else if (b.billing_status === "partial") partial++;
        const roomInfo = (b.type_name && b.room_number) ? `${b.type_name} (${b.room_number})` : "-";
        const totalBill = b.total_bill !== undefined
            ? parseFloat(b.total_bill)
            : (b.total_amount !== undefined ? parseFloat(b.total_amount) : 0);

        // --- FIX: Disable add payment if remaining_amount <= 0 OR status is paid ---
        let canAddPayment = true;
        if (
            (typeof b.remaining_amount !== "undefined" && b.remaining_amount !== null && parseFloat(b.remaining_amount) <= 0) ||
            (b.billing_status && b.billing_status.toLowerCase() === "paid")
        ) {
            canAddPayment = false;
        }

        tbody.innerHTML += `
            <tr>
                <td>${b.billing_id || ''}</td>
                <td>${b.guest_name || "-"}</td>
                <td>${b.reservation_id || "-"}</td>
                <td>${b.billing_date || "-"}</td>
                <td>${roomInfo}</td>
                <td>₱${totalBill.toFixed(2)}</td>
                <td>₱${b.amount_paid ? parseFloat(b.amount_paid).toFixed(2) : "0.00"}</td>
                <td>
                    <span class="badge bg-${getStatusColor(b.billing_status || '')}">${b.billing_status || "-"}</span>
                    <i class="fas fa-edit text-primary btn-edit-status" data-billing-id="${b.billing_id}" title="Edit Status" style="cursor:pointer;margin-left:6px;"></i>
                </td>
                <td class="text-center">
                    <i class="fas fa-eye text-info btn-view-billing" data-billing-id="${b.billing_id}" title="View" style="cursor:pointer;margin-right:8px;"></i>
                    <i class="fas fa-money-bill-wave text-success btn-add-payment" data-billing-id="${b.billing_id}" title="Add Payment" style="cursor:pointer;margin-right:8px;${canAddPayment ? '' : 'opacity:0.3;pointer-events:none;'}"></i>
                    <i class="fas fa-trash text-danger btn-delete-billing" data-billing-id="${b.billing_id}" title="Delete" style="cursor:pointer;"></i>
                </td>
            </tr>
        `;
    });
    document.getElementById("totalBillings").textContent = total;
    document.getElementById("paidBillings").textContent = paid;
    document.getElementById("unpaidBillings").textContent = unpaid;
    document.getElementById("partialBillings").textContent = partial;

    // Event binding
    tbody.querySelectorAll('.btn-view-billing').forEach(btn => {
        btn.addEventListener('click', () => {
            console.debug("[Billing] View billing clicked:", btn.dataset.billingId);
            showBillingDetailsModal(btn.dataset.billingId);
        });
    });
    tbody.querySelectorAll('.btn-add-payment').forEach(btn => {
        btn.addEventListener('click', () => {
            console.debug("[Billing] Add payment clicked:", btn.dataset.billingId);
            showPaymentModal(btn.dataset.billingId);
        });
    });
    tbody.querySelectorAll('.btn-delete-billing').forEach(btn => {
        btn.addEventListener('click', () => {
            console.debug("[Billing] Delete billing clicked:", btn.dataset.billingId);
            deleteBilling(btn.dataset.billingId, loadBillings);
        });
    });
    tbody.querySelectorAll('.btn-edit-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const billingId = btn.dataset.billingId;
            await showEditStatusModal(billingId);
        });
    });
}

function getStatusColor(status) {
    const map = {
        "paid": "success",
        "unpaid": "danger",
        "partial": "warning",
        "overdue": "danger"
    };
    return map[status] || "secondary";
}

async function filterBillings() {
    const status = document.getElementById("statusFilter").value;
    const dateFrom = document.getElementById("dateFrom").value;
    const dateTo = document.getElementById("dateTo").value;
    let params = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (dateFrom) params.push(`date_from=${encodeURIComponent(dateFrom)}`);
    if (dateTo) params.push(`date_to=${encodeURIComponent(dateTo)}`);
    let url = `${BASE_URL}/admin/billing/billing.php`;
    if (params.length) url += "?" + params.join("&");
    try {
        const response = await axios.get(url);
        displayBillings(response.data || []);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `Filtered ${response.data.length} billing${response.data.length === 1 ? '' : 's'}`,
            showConfirmButton: false,
            timer: 1800
        });
    } catch {
        displayBillings([]);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'No billings found',
            showConfirmButton: false,
            timer: 1800
        });
    }
}

async function searchBillings() {
    const searchTerm = document.getElementById("searchBilling").value.trim();
    if (!searchTerm) {
        await loadBillings();
        return;
    }
    try {
        const response = await axios.get(`${BASE_URL}/admin/billing/billing.php?search=${encodeURIComponent(searchTerm)}`);
        displayBillings(response.data || []);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `Found ${response.data.length} billing${response.data.length === 1 ? '' : 's'}`,
            showConfirmButton: false,
            timer: 1800
        });
    } catch {
        displayBillings([]);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'No billings found',
            showConfirmButton: false,
            timer: 1800
        });
    }
}

// Load billings for a specific reservation
export async function loadBillingsByReservation(reservationId) {
    const tbody = document.getElementById("billingTableBody");
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">Loading billing data...</td></tr>`;
    try {
        const response = await axios.get(`${BASE_URL}/admin/billing/billing.php`, {
            params: { operation: 'getBillingByReservation', json: JSON.stringify({ reservation_id: reservationId }) }
        });
        // The API returns a single billing object, so wrap in array for display
        let billings = [];
        if (response.data && typeof response.data === "object" && !Array.isArray(response.data) && Object.keys(response.data).length > 0) {
            billings = [response.data];
        }
        displayBillings(billings);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error loading billings</td></tr>`;
    }
}

// --- Edit Billing Status Modal ---
async function showEditStatusModal(billingId) {
    const statuses = await getBillingStatuses();
    const { value: statusId } = await Swal.fire({
        title: 'Update Billing Status',
        input: 'select',
        inputOptions: statuses.reduce((acc, s) => {
            acc[s.billing_status_id] = s.billing_status;
            return acc;
        }, {}),
        inputPlaceholder: 'Select status',
        showCancelButton: true,
        confirmButtonText: 'Update',
        inputValidator: (value) => {
            if (!value) return 'Please select a status';
        }
    });
    if (statusId) {
        const result = await updateBillingStatus(billingId, statusId);
        if (result) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Billing status updated!',
                showConfirmButton: false,
                timer: 1800
            });
            loadBillings();
        } else {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Failed to update status',
                showConfirmButton: false,
                timer: 1800
            });
        }
    }
}

// Example usage: loadBillingsByReservation(123); // 123 is reservation_id

