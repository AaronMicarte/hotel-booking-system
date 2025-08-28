// Add-on Orders POS JS
// Loads, creates, and manages add-on orders (POS style)

if (typeof BASE_URL === 'undefined') {
    var BASE_URL = "/Hotel-Reservation-Billing-System/api/admin";
}

document.addEventListener("DOMContentLoaded", () => {
    loadOrderStatuses();
    loadAddonOrders();
    loadAddonCategories();
    document.getElementById("newOrderBtn").addEventListener("click", showNewOrderModal);
    document.getElementById("orderStatusFilter").addEventListener("change", loadAddonOrders);
    document.getElementById("orderSearchInput").addEventListener("input", loadAddonOrders);
    // Category click event (delegated)
    document.getElementById("addonCategorySidebar").addEventListener("click", function (e) {
        if (e.target.classList.contains("addon-category-item")) {
            document.querySelectorAll(".addon-category-item").forEach(el => el.classList.remove("active"));
            e.target.classList.add("active");
            renderPOS(e.target.dataset.categoryId);
        }
    });
});
// Load categories for sidebar
async function loadAddonCategories() {
    const sidebar = document.getElementById("addonCategorySidebar");
    sidebar.innerHTML = '<div class="text-center py-2">Loading...</div>';
    try {
        const res = await axios.get(`${BASE_URL}/addons/categories.php`, { params: { operation: "getAllCategories" } });
        const cats = res.data && res.data.status === 'success' && Array.isArray(res.data.data) ? res.data.data : [];
        if (!cats.length) {
            sidebar.innerHTML = '<div class="text-center py-2">No categories</div>';
            return;
        }
        let html = '<ul class="list-group list-group-flush">';
        html += `<li class="list-group-item addon-category-item active" data-category-id="">All</li>`;
        cats.forEach(cat => {
            html += `<li class="list-group-item addon-category-item" data-category-id="${cat.category_id}">${cat.category_name}</li>`;
        });
        html += '</ul>';
        sidebar.innerHTML = html;
    } catch {
        sidebar.innerHTML = '<div class="text-danger py-2">Failed to load categories</div>';
    }
}

async function loadOrderStatuses() {
    const select = document.getElementById("orderStatusFilter");
    select.innerHTML = '<option value="">All Statuses</option>';
    try {
        const res = await axios.get(`${BASE_URL}/addons/order_status.php`, { params: { operation: "getAllOrderStatus" } });
        if (Array.isArray(res.data)) {
            res.data.forEach(s => {
                select.innerHTML += `<option value="${s.order_status_name}">${s.order_status_name.charAt(0).toUpperCase() + s.order_status_name.slice(1)}</option>`;
            });
        }
    } catch { }
}

async function loadAddonOrders() {
    const tbody = document.getElementById("addonOrdersTableBody");
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    let status = document.getElementById("orderStatusFilter").value;
    let search = document.getElementById("orderSearchInput").value.trim();
    try {
        const res = await axios.get(`${BASE_URL}/addons/order.php`, { params: { operation: "getAllOrders", status, search } });
        const orders = Array.isArray(res.data) ? res.data : [];
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        orders.forEach(order => {
            tbody.innerHTML += renderOrderRow(order);
        });
    } catch {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load orders.</td></tr>';
    }
}

function renderOrderRow(order) {
    let itemsHtml = Array.isArray(order.items) ? order.items.map(i => `<span class='badge bg-secondary me-1'>${i.name} x${i.quantity}</span>`).join(' ') : '';
    let statusBadge = `<span class='badge bg-info'>${order.order_status_name || 'pending'}</span>`;
    let guestName = (order.first_name || order.last_name) ? `${order.first_name || ''} ${order.last_name || ''}`.trim() : '-';
    return `<tr>
        <td>${order.addon_order_id}</td>
        <td>${guestName}</td>
        <td>${order.reservation_id || '-'}</td>
        <td>${statusBadge}</td>
        <td>${order.order_date || '-'}</td>
        <td>${itemsHtml}</td>
        <td><button class='btn btn-sm btn-outline-primary' onclick='viewOrder(${order.addon_order_id})'><i class='fas fa-eye'></i> View</button></td>
    </tr>`;
}

function showNewOrderModal() {
    const modal = new bootstrap.Modal(document.getElementById('addonOrderModal'));
    document.getElementById('addonOrderModalLabel').textContent = 'New Add-on Order';
    // Reset reservation search
    document.getElementById('reservationSearchInput').value = '';
    document.getElementById('reservationSearchResults').innerHTML = '';
    document.getElementById('selectedReservationSummary').classList.add('d-none');
    document.getElementById('selectedReservationSummary').innerHTML = '';
    window.selectedReservation = null;
    renderPOS();
    // Reset order summary
    document.getElementById('orderSummaryBox').classList.add('d-none');
    document.getElementById('orderSummaryList').innerHTML = '';
    document.getElementById('orderSummaryTotal').textContent = '₱0.00';
    modal.show();
}

// Reservation search logic
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('reservationSearchInput');
    if (!input) return;
    let searchTimeout;
    input.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        const val = this.value.trim();
        if (!val) {
            document.getElementById('reservationSearchResults').innerHTML = '';
            return;
        }
        searchTimeout = setTimeout(async () => {
            const res = await axios.get(`${BASE_URL}/reservations/reservations.php`, { params: { search: val } });
            const results = Array.isArray(res.data) ? res.data : [];
            let html = '';
            results.forEach(r => {
                html += `<button type="button" class="list-group-item list-group-item-action reservation-result-item" data-reservation-id="${r.reservation_id}">
                    <b>#${r.reservation_id}</b> - ${r.guest_name || '-'} | ${r.check_in_date} to ${r.check_out_date} | ${r.rooms_summary || ''}
                </button>`;
            });
            document.getElementById('reservationSearchResults').innerHTML = html || '<div class="text-muted px-2">No results</div>';
        }, 300);
    });
    document.getElementById('reservationSearchResults').addEventListener('click', function (e) {
        if (e.target.classList.contains('reservation-result-item')) {
            const id = e.target.getAttribute('data-reservation-id');
            selectReservationForOrder(id, e.target.textContent);
        }
    });
});

async function selectReservationForOrder(reservationId, summaryText) {
    window.selectedReservation = reservationId;
    document.getElementById('selectedReservationSummary').classList.remove('d-none');
    document.getElementById('selectedReservationSummary').innerHTML = `<b>Selected Reservation:</b> ${summaryText}`;
    document.getElementById('reservationSearchResults').innerHTML = '';
    document.getElementById('reservationSearchInput').value = '';
}
async function renderPOS(categoryId = "") {
    const container = document.getElementById('addonOrderPOS');
    container.innerHTML = '<div class="text-center">Loading add-ons...</div>';
    // Fetch available add-ons
    let addons = [];
    try {
        const params = { operation: "getAllAddons" };
        if (categoryId) params.category = categoryId;
        const res = await axios.get(`${BASE_URL}/addons/addons.php`, { params });
        addons = Array.isArray(res.data) ? res.data.filter(a => a.is_available) : [];
    } catch {
        container.innerHTML = '<div class="text-danger">Failed to load add-ons.</div>';
        return;
    }
    // Render POS UI
    let html = `<div class='row'>`;
    if (addons.length === 0) {
        html += `<div class='col-12 text-center text-muted py-5'>No add-ons found for this category.</div>`;
    }
    addons.forEach(addon => {
        // Use correct path for add-on images
        let imgSrc = addon.image_url ? `../../assets/images/uploads/addon-images/${addon.image_url}` : '../../assets/images/no-image.png';
        html += `<div class='col-lg-4 col-md-6 mb-4'>
            <div class='card h-100 shadow-sm'>
                <img src='${imgSrc}' class='card-img-top' style='height:220px;object-fit:cover;border-radius:12px 12px 0 0;'>
                <div class='card-body'>
                    <h5 class='card-title mb-1'>${addon.name}</h5>
                    <div class='mb-2 text-muted fw-bold'>₱${parseFloat(addon.price).toFixed(2)}</div>
                    <input type='number' min='0' value='0' class='form-control addon-qty-input' data-addon-id='${addon.addon_id}' data-addon-name='${addon.name}' data-addon-price='${addon.price}' placeholder='Qty'>
                </div>
            </div>
        </div>`;
    });
    html += `</div><div class='text-end'><button class='btn btn-success btn-lg px-4' id='showOrderSummaryBtn'><i class='fas fa-list'></i> Review Order</button></div>`;
    container.innerHTML = html;
    document.getElementById('showOrderSummaryBtn').onclick = showOrderSummary;
}

function showOrderSummary() {
    // Gather selected quantities
    const qtyInputs = document.querySelectorAll('.addon-qty-input');
    let items = [];
    let total = 0;
    let summaryHtml = '';
    qtyInputs.forEach(input => {
        const qty = parseInt(input.value);
        if (qty > 0) {
            const name = input.getAttribute('data-addon-name');
            const price = parseFloat(input.getAttribute('data-addon-price'));
            items.push({ addon_id: input.getAttribute('data-addon-id'), quantity: qty, name, price });
            total += price * qty;
            summaryHtml += `<li class='list-group-item d-flex justify-content-between align-items-center'>
                <span>${name} <span class='badge bg-secondary ms-2'>x${qty}</span></span>
                <span>₱${(price * qty).toFixed(2)}</span>
            </li>`;
        }
    });
    if (!items.length) {
        Swal.fire('No add-ons selected', 'Please select at least one add-on.', 'warning');
        return;
    }
    document.getElementById('orderSummaryList').innerHTML = summaryHtml;
    document.getElementById('orderSummaryTotal').textContent = `₱${total.toFixed(2)}`;
    document.getElementById('orderSummaryBox').classList.remove('d-none');
    // Show submit button
    if (!document.getElementById('submitOrderBtn')) {
        const btn = document.createElement('button');
        btn.id = 'submitOrderBtn';
        btn.className = 'btn btn-success btn-lg mt-2';
        btn.innerHTML = '<i class="fas fa-check"></i> Submit Order';
        btn.onclick = submitOrder;
        document.getElementById('orderSummaryBox').appendChild(btn);
    }
}
function showOrderSummary() {
    // ...existing code...
}

async function submitOrder() {
    // Gather selected quantities from summary
    const summaryItems = document.querySelectorAll('#orderSummaryList .list-group-item');
    let items = [];
    summaryItems.forEach(li => {
        const name = li.querySelector('span').textContent.split(' x')[0].trim();
        const qty = parseInt(li.querySelector('.badge').textContent.replace('x', ''));
        const addon = Array.from(document.querySelectorAll('.addon-qty-input')).find(input => input.getAttribute('data-addon-name') === name);
        if (addon) {
            items.push({ addon_id: addon.getAttribute('data-addon-id'), quantity: qty });
        }
    });
    if (!items.length) {
        Swal.fire('No add-ons selected', 'Please select at least one add-on.', 'warning');
        return;
    }
    // Use selected reservation
    const reservation_id = window.selectedReservation;
    if (!reservation_id) {
        Swal.fire('No reservation selected', 'Please select a reservation for this order.', 'warning');
        return;
    }
    // Optionally, get user_id if you have session info
    let user_id = null;
    if (window.CURRENT_USER_ID) user_id = window.CURRENT_USER_ID;
    // Submit order
    try {
        const formData = new FormData();
        formData.append('operation', 'insertOrder');
        formData.append('json', JSON.stringify({ reservation_id, items, user_id }));
        const res = await axios.post(`${BASE_URL}/addons/order.php`, formData);
        if (res.data && res.data.success) {
            Swal.fire('Order placed!', '', 'success');
            loadAddonOrders();
            bootstrap.Modal.getInstance(document.getElementById('addonOrderModal')).hide();
        } else {
            Swal.fire('Failed to place order', res.data && res.data.message ? res.data.message : '', 'error');
        }
    } catch {
        Swal.fire('Failed to place order', '', 'error');
    }
}

async function viewOrder(orderId) {
    Swal.fire('Order Details', 'Order ID: ' + orderId, 'info');
}
