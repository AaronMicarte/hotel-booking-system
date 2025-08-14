// Billing Module (Admin) - Modal logic for update, delete, details

// --- Show Billing Details Modal ---
export const showBillingDetailsModal = async (billingId) => {
    try {
        console.debug("[BillingModule] showBillingDetailsModal called with billingId:", billingId);
        const modal = new bootstrap.Modal(document.getElementById("billingDetailsModal"), {
            keyboard: true,
            backdrop: "static"
        });
        // Fetch billing details (now includes room price, addons, etc)
        const billing = await getBillingDetails(billingId);
        console.debug("[BillingModule] Billing details loaded:", billing);
        // Addons table rows
        let addonsHtml = "";
        if (billing.addons && billing.addons.length > 0) {
            addonsHtml = `
                <table class="table table-sm table-bordered mb-2">
                    <thead>
                        <tr>
                            <th>Addon</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${billing.addons.map(a => `
                            <tr>
                                <td>${a.addon_name}</td>
                                <td>${a.quantity}</td>
                                <td>₱${parseFloat(a.unit_price).toFixed(2)}</td>
                                <td>₱${parseFloat(a.subtotal).toFixed(2)}</td>
                            </tr>
                        `).join("")}
                        <tr>
                            <td colspan="3" class="text-end fw-bold">Addons Total</td>
                            <td class="fw-bold">₱${parseFloat(billing.addons_total).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else {
            addonsHtml = `<div class="text-muted">No addons.</div>`;
        }
        // Populate billing details
        document.getElementById("billingDetails").innerHTML = `
            <table class="table table-sm">
                <tr><td>Billing ID</td><td>${billing.billing_id}</td></tr>
                <tr><td>Guest</td><td>${billing.guest_name}</td></tr>
                <tr><td>Reservation</td><td>${billing.reservation_id}</td></tr>
                <tr><td>Date</td><td>${billing.billing_date}</td></tr>
                <tr><td>Room</td><td>${billing.type_name} (${billing.room_number})</td></tr>
                <tr><td>Room Price</td><td>₱${parseFloat(billing.room_price).toFixed(2)}</td></tr>
                <tr><td>Status</td><td><span class="badge bg-${getStatusColor(billing.billing_status)}">${billing.billing_status}</span></td></tr>
            </table>
            <div class="mb-2"><strong>Addons:</strong></div>
            ${addonsHtml}
            <div class="mb-2"><strong>Total Bill:</strong> <span class="fw-bold text-primary">₱${parseFloat(billing.total_bill).toFixed(2)}</span></div>
            <div class="mb-2"><strong>Amount Paid:</strong> <span class="fw-bold text-success">₱${parseFloat(billing.amount_paid).toFixed(2)}</span></div>
            <div class="mb-2"><strong>Remaining Amount:</strong> <span class="fw-bold text-danger">₱${parseFloat(billing.remaining_amount).toFixed(2)}</span></div>
        `;
        // Payment history
        const paymentHistoryBody = document.getElementById("paymentHistoryBody");
        paymentHistoryBody.innerHTML = "";
        (billing.payments || []).forEach(p => {
            paymentHistoryBody.innerHTML += `
                <tr>
                    <td>${p.payment_date}</td>
                    <td>₱${p.amount_paid}</td>
                    <td>${p.method_name || '-'}</td>
                    <td>${p.notes || ''}</td>
                </tr>
            `;
        });
        modal.show();
    } catch (error) {
        console.error("[BillingModule] Failed to load billing details", error);
        alert("Failed to load billing details");
    }
};

// --- Show Payment Modal (Add/Edit Payment) ---
export const showPaymentModal = async (billingId = null, reservationId = null) => {
    try {
        console.debug("[BillingModule] showPaymentModal called with billingId:", billingId, "reservationId:", reservationId);
        // Reset form
        document.getElementById("paymentForm").reset();
        document.getElementById("billingId").value = billingId || "";
        // Load reservations for dropdown
        await populateReservationSelect(reservationId);
        // If editing, load billing info
        if (billingId) {
            const billing = await getBillingDetails(billingId);
            console.debug("[BillingModule] Billing for payment modal:", billing);
            document.getElementById("guestName").value = billing.guest_name;
            document.getElementById("totalAmount").value = billing.total_amount;
            document.getElementById("remainingAmount").value = billing.remaining_amount;
        }
        new bootstrap.Modal(document.getElementById("paymentModal")).show();
    } catch (error) {
        console.error("[BillingModule] Failed to show payment modal", error);
    }
};

// --- Helper: Get Billing Details ---
const getBillingDetails = async (billingId) => {
    console.debug("[BillingModule] getBillingDetails called with billingId:", billingId);
    const response = await axios.get(`${window.location.origin}/Hotel-Reservation-Billing-System/api/admin/billing/billing.php`, {
        params: { billing_id: billingId }
    });
    console.debug("[BillingModule] getBillingDetails response:", response.data);
    return response.data;
};

// --- Helper: Populate Reservation Select ---
const populateReservationSelect = async (selectedReservationId = null) => {
    const select = document.getElementById("reservationSelect");
    select.innerHTML = `<option value="">-- Select Reservation --</option>`;
    const response = await axios.get(`${window.location.origin}/Hotel-Reservation-Billing-System/api/admin/billing/reservations.php`);
    console.debug("[BillingModule] Reservations loaded for select:", response.data);
    (response.data || []).forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.reservation_id;
        opt.textContent = `#${r.reservation_id} - ${r.guest_name}`;
        if (selectedReservationId && r.reservation_id == selectedReservationId) opt.selected = true;
        select.appendChild(opt);
    });
    // On change, update guest/amount fields
    select.onchange = async function () {
        if (this.value) {
            const billing = await getBillingByReservation(this.value);
            console.debug("[BillingModule] Billing loaded for reservation select change:", billing);
            document.getElementById("guestName").value = billing.guest_name;
            document.getElementById("totalAmount").value = billing.total_amount;
            document.getElementById("remainingAmount").value = billing.remaining_amount;
        } else {
            document.getElementById("guestName").value = "";
            document.getElementById("totalAmount").value = "";
            document.getElementById("remainingAmount").value = "";
        }
    };
};

// --- Helper: Get Billing by Reservation ---
const getBillingByReservation = async (reservationId) => {
    console.debug("[BillingModule] getBillingByReservation called with reservationId:", reservationId);
    const response = await axios.get(`${window.location.origin}/Hotel-Reservation-Billing-System/api/admin/billing/billing.php`, {
        params: { reservation_id: reservationId }
    });
    console.debug("[BillingModule] getBillingByReservation response:", response.data);
    return response.data;
};

// --- Helper: Status Color ---
const getStatusColor = (status) => {
    const map = {
        "paid": "success",
        "unpaid": "danger",
        "partial": "warning",
        "overdue": "danger"
    };
    return map[status] || "secondary";
};

// --- Record Payment Logic ---
export const recordPayment = async () => {
    const billingId = document.getElementById("billingId").value;
    const reservationId = document.getElementById("reservationSelect").value;
    const paymentAmount = document.getElementById("paymentAmount").value;
    const paymentMethod = document.getElementById("paymentMethod").value;
    const paymentNotes = document.getElementById("paymentNotes").value;
    if (!reservationId || !paymentAmount || !paymentMethod) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'Please fill in all required fields',
            showConfirmButton: false,
            timer: 1800
        });
        return;
    }
    const payload = {
        billing_id: billingId,
        reservation_id: reservationId,
        amount_paid: paymentAmount,
        payment_method: paymentMethod,
        notes: paymentNotes
    };
    try {
        const response = await axios.post(`${window.location.origin}/Hotel-Reservation-Billing-System/api/admin/billing/payment.php`, payload);
        if (response.data && (response.data === 1 || response.data.success)) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Payment recorded!',
                showConfirmButton: false,
                timer: 1800
            });
            bootstrap.Modal.getInstance(document.getElementById("paymentModal")).hide();
            return true;
        } else {
            throw new Error("Failed to record payment");
        }
    } catch {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Failed to record payment',
            showConfirmButton: false,
            timer: 1800
        });
        return false;
    }
};

// --- Delete Billing Logic ---
export const deleteBilling = async (billingId, refreshDisplay) => {
    if (window.Swal) {
        const result = await Swal.fire({
            title: 'Delete Billing?',
            text: 'Are you sure you want to delete this billing record?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33'
        });
        if (!result.isConfirmed) return;
    } else {
        if (!confirm("Are you sure you want to delete this billing record?")) return;
    }
    try {
        const formData = new FormData();
        formData.append("operation", "deleteBilling");
        formData.append("json", JSON.stringify({ billing_id: billingId }));
        const response = await axios.post(`${window.location.origin}/Hotel-Reservation-Billing-System/api/admin/billing/billing.php`, formData);
        if (response.data === 1 || response.data.success) {
            refreshDisplay();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Billing deleted',
                showConfirmButton: false,
                timer: 1800
            });
        } else {
            throw new Error();
        }
    } catch {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Failed to delete billing',
            showConfirmButton: false,
            timer: 1800
        });
    }
};
