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
    // Clear all options
    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'All Statuses';
    select.appendChild(defaultOption);
    try {
        const res = await axios.get(`${BASE_URL}/addons/order_status.php`, { params: { operation: "getAllOrderStatuses" } });
        if (Array.isArray(res.data)) {
            const seen = new Set();
            res.data.forEach(s => {
                // Only add if not already seen, not empty/null, and not just whitespace
                const name = (s.order_status_name || '').trim();
                if (name && !seen.has(name)) {
                    seen.add(name);
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
                    select.appendChild(opt);
                }
            });
            // Debug: log all dropdown options after population
            const optionValues = Array.from(select.options).map(opt => opt.value);
            console.log('Order Status Filter Options:', optionValues);
        }
    } catch (e) { /* Optionally log error: console.error(e); */ }
}

async function loadAddonOrders() {
    const tbody = document.getElementById("addonOrdersTableBody");
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    let status = document.getElementById("orderStatusFilter").value;
    let search = document.getElementById("orderSearchInput").value.trim();
    try {
        const res = await axios.get(`${BASE_URL}/addons/order.php`, { params: { operation: "getAllOrders", search } });
        let orders = Array.isArray(res.data) ? res.data : [];
        // Filter by status if selected
        if (status) {
            orders = orders.filter(order => {
                const orderStatus = (order.order_status_name || '').trim().toLowerCase();
                return orderStatus === status.trim().toLowerCase();
            });
        }
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
    let statusBadge = `<span class='badge bg-info'>${order.order_status_name || 'pending'}</span>`;
    let guestName = (order.first_name || order.last_name) ? `${order.first_name || ''} ${order.last_name || ''}`.trim() : '-';
    // Format date as 'M d, Y h:i A' in Asia/Manila timezone
    let dateStr = '-';
    if (order.order_date) {
        // Parse as UTC then add 8 hours for Manila
        let d = new Date(order.order_date + 'T00:00:00Z');
        if (order.order_date.length > 10) d = new Date(order.order_date.replace(' ', 'T') + 'Z');
        if (!isNaN(d)) {
            // Add 8 hours for Manila
            d = new Date(d.getTime() + 8 * 60 * 60 * 1000);
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
            dateStr = d.toLocaleString('en-US', options).replace(',', '');
        } else {
            dateStr = order.order_date;
        }
    }
    return `<tr>
        <td>${order.addon_order_id}</td>
        <td>${guestName}</td>
        <td>${order.reservation_id || '-'}</td>
        <td>${statusBadge}</td>
        <td>${dateStr}</td>
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
    html += `</div>`;
    container.innerHTML = html;
    // The Review Order button is now outside the scrollable area, so just set up its handler once
    const reviewBtn = document.getElementById('showOrderSummaryBtn');
    if (reviewBtn) reviewBtn.onclick = showOrderSummary;
    // Wire up submit button (only once)
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn && !submitBtn.dataset.bound) {
        submitBtn.addEventListener('click', async function () {
            submitBtn.disabled = true;
            await submitOrder();
            submitBtn.disabled = false;
        });
        submitBtn.dataset.bound = '1';
    }
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
                <span>${name} <span class='badge bg-primary ms-2'>x${qty}</span></span>
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
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) submitBtn.classList.remove('d-none');
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
    // Hide submit button after order
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) submitBtn.classList.add('d-none');
}

async function viewOrder(orderId) {
    try {
        const statusRes = await axios.get(`${BASE_URL}/addons/order_status.php`, { params: { operation: 'getAllOrderStatuses' } });
        const statusList = Array.isArray(statusRes.data) ? statusRes.data : [];
        const res = await axios.get(`${BASE_URL}/addons/order.php`, { params: { operation: 'getOrder', json: JSON.stringify({ addon_order_id: orderId }) } });
        const order = Array.isArray(res.data) ? res.data[0] : res.data;
        let itemsHtml = '';
        let total = 0;
        if (order && order.addon_order_id) {
            // Fetch items for this order (use order-item.php)
            const itemsRes = await axios.get(`${BASE_URL}/addons/order-item.php`, { params: { operation: 'getOrderItemsByOrderId', addon_order_id: orderId } });
            const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
            if (items.length) {
                itemsHtml = '<ul class="list-group mb-2">' + items.map(i => {
                    total += parseFloat(i.price) * parseInt(i.quantity);
                    return `<li class='list-group-item d-flex justify-content-between align-items-center'><span>${i.name} <span class='text-muted small'>(₱${parseFloat(i.price).toFixed(2)} each)</span></span><span class='badge bg-primary rounded-pill'>x${i.quantity}</span></li>`;
                }).join('') + '</ul>';
            } else {
                itemsHtml = '<div class="text-muted">No items found for this order.</div>';
            }
        } else {
            itemsHtml = '<div class="text-danger">Order not found.</div>';
        }
        // Format date in Asia/Manila timezone
        let dateStr = '-';
        if (order.order_date) {
            let d = new Date(order.order_date + 'T00:00:00Z');
            if (order.order_date.length > 10) d = new Date(order.order_date.replace(' ', 'T') + 'Z');
            if (!isNaN(d)) {
                d = new Date(d.getTime() + 8 * 60 * 60 * 1000);
                const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
                dateStr = d.toLocaleString('en-US', options).replace(',', '');
            } else {
                dateStr = order.order_date;
            }
        }
        // Status badge color mapping
        const statusColorMap = {
            pending: 'bg-secondary',
            processing: 'bg-warning text-dark',
            delivered: 'bg-success',
            completed: 'bg-success',
            cancelled: 'bg-danger',
            ready: 'bg-info',
        };
        const statusName = (order.order_status_name || '').toLowerCase();
        const badgeClass = statusColorMap[statusName] || 'bg-info';
        // Status dropdown (disabled, just for display)
        let statusOptions = statusList.map(s => `<option value="${s.order_status_name}"${s.order_status_name === order.order_status_name ? ' selected' : ''}>${s.order_status_name.charAt(0).toUpperCase() + s.order_status_name.slice(1)}</option>`).join('');
        Swal.fire({
            title: `Order #${orderId}`,
            html: `<div class='text-start'>
                <div class='mb-2'><b>Guest:</b> ${order.first_name || ''} ${order.last_name || ''}</div>
                <div class='mb-2'><b>Reservation:</b> ${order.reservation_id || '-'}</div>
                <div class='mb-2'><b>Status:</b> <span class='badge ${badgeClass}'>${order.order_status_name || 'pending'}</span></div>
                <div class='mb-2'><b>Date:</b> ${dateStr}</div>
                <hr>
                <div><b>Items:</b></div>
                ${itemsHtml}
                <div class='fw-bold mt-2'>Total: <span class='text-success'>₱${total.toFixed(2)}</span></div>
            </div>`,
            width: 666,
            showConfirmButton: true,
            confirmButtonText: 'Close',
            customClass: { popup: 'px-2' }
        });
    } catch (e) {
        Swal.fire('Error', 'Failed to load order details.', 'error');
    }
}
