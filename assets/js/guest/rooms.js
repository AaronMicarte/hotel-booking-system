const API_BASE = '/Hotel-Reservation-Billing-System/api/admin/rooms/rooms.php';
let selectedFeatureIds = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRoomTypes();
    loadFeatures();
    fetchAndRenderRooms();

    document.getElementById('roomSearchForm').addEventListener('submit', function (e) {
        e.preventDefault();
        fetchAndRenderRooms();
    });
});

async function fetchAndRenderRooms() {
    showLoading(true);

    // Correct guest capacity filter: show rooms with max_capacity >= selected value
    const capacity = document.getElementById('filterCapacity').value;
    const type = document.getElementById('filterRoomType').value;
    const features = selectedFeatureIds;
    const checkin = document.getElementById('filterCheckin').value;
    const checkout = document.getElementById('filterCheckout').value;

    const params = { operation: 'getAllRooms' };
    if (type) params.type_id = type;
    if (features.length === 1) params.feature_id = features[0];
    if (checkin) params.checkin = checkin;
    if (checkout) params.checkout = checkout;

    try {
        const { data } = await axios.get(API_BASE, { params });
        let rooms = Array.isArray(data) ? data : [];

        // Multi-feature filter
        if (features.length > 0) {
            rooms = rooms.filter(room => {
                if (!Array.isArray(room.features)) return false;
                const roomFeatureIds = room.features.map(f => String(f.feature_id));
                return features.every(fid => roomFeatureIds.includes(String(fid)));
            });
        }

        // Filter by guest capacity (show rooms with max_capacity >= selected value)
        if (capacity) {
            rooms = rooms.filter(room =>
                Number(room.max_capacity) >= Number(capacity)
            );
        }

        renderRooms(rooms);
    } catch (err) {
        renderRooms([]);
    } finally {
        showLoading(false);
    }
}

function renderRooms(rooms) {
    const grid = document.getElementById('roomsGrid');
    const noRooms = document.getElementById('noRoomsMsg');

    grid.innerHTML = '';

    if (!rooms.length) {
        noRooms.classList.remove('d-none');
        return;
    }

    noRooms.classList.add('d-none');

    rooms.forEach(room => {
        let img = '';
        if (room.room_type_image_url) {
            img = room.room_type_image_url.startsWith('http')
                ? room.room_type_image_url
                : `/Hotel-Reservation-Billing-System/assets/images/uploads/room-types/${room.room_type_image_url.replace(/^.*[\\\/]/, '')}`;
        } else {
            img = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop';
        }

        // Determine booking status (skip "occupied" rooms)
        let status = (room.room_status || '').toLowerCase();
        if (status === 'occupied') return; // Do not show occupied rooms

        // Dot indicator for available, reserved, maintenance
        let statusDot = '';
        let statusText = '';
        if (status === 'available') {
            statusDot = `<span title="Available" style="display:inline-block;width:12px;height:12px;background:#28a745;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>`;
            statusText = `<span class="small text-success align-middle">Available</span>`;
        } else if (status === 'reserved') {
            statusDot = `<span title="Reserved" style="display:inline-block;width:12px;height:12px;background:#0dcaf0;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>`;
            statusText = `<span class="small text-info align-middle">Reserved</span>`;
        } else if (status === 'maintenance') {
            statusDot = `<span title="Maintenance" style="display:inline-block;width:12px;height:12px;background:#ffc107;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>`;
            statusText = `<span class="small text-warning align-middle">Maintenance</span>`;
        }

        // Only allow booking if available
        const isBookable = status === 'available';

        grid.innerHTML += `
            <div class="col-xl-4 col-lg-6 col-md-6">
            <div class="room-card d-flex flex-column h-100">
                <div class="room-image" style="background-image: url('${img}');"></div>
                <div class="room-content d-flex flex-column flex-grow-1">
                <div class="d-flex align-items-center mb-2" style="min-height:24px;">
                    ${statusDot}${statusText}
                </div>
                <div class="badge-container">
                    <span class="custom-badge badge-primary">${room.type_name || 'Standard'}</span>
                    <span class="custom-badge badge-info">${room.room_size_sqm ? room.room_size_sqm + ' sqm' : 'Spacious'}</span>
                    <span class="custom-badge badge-dark">${room.max_capacity || '2'} guests</span>
                </div>
                <div class="features-container">
                    ${(room.features || []).map(f =>
            `<span class="feature-tag">${f.feature_name || f}</span>`
        ).join('')}
                </div>
                <div class="room-footer mt-auto">
                    <span class="price">₱${room.price_per_stay ? Number(room.price_per_stay).toLocaleString() : '0'}/night</span>
                    <a href="../rooms/room-template.html?type=${room.type_name || ''}" class="book-btn${isBookable ? '' : ' disabled'}"
                    ${isBookable ? '' : 'tabindex="-1" aria-disabled="true" style="pointer-events:none;opacity:0.6;"'}>
                    <i class="fas fa-arrow-right"></i>
                    ${isBookable ? 'Book Now' : 'Not Available'}
                    </a>
                </div>
                </div>
            </div>
            </div>
        `;
    });
}

async function loadRoomTypes() {
    try {
        const { data } = await axios.get('/Hotel-Reservation-Billing-System/api/admin/rooms/room-type.php');
        const select = document.getElementById('filterRoomType');
        select.innerHTML = `<option value="">All Room Types</option>` +
            (Array.isArray(data) ? data : []).map(t =>
                `<option value="${t.room_type_id}">${t.type_name}</option>`
            ).join('');
    } catch (error) {
        console.log('Error loading room types:', error);
    }
}

async function loadFeatures() {
    try {
        const { data } = await axios.get('/Hotel-Reservation-Billing-System/api/admin/rooms/feature.php');
        renderFeatureChips(Array.isArray(data) ? data : []);
    } catch {
        renderFeatureChips([]);
    }
}

function renderFeatureChips(features) {
    const container = document.getElementById('featureChipsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!features.length) {
        container.innerHTML = '<span class="text-muted">No features available</span>';
        return;
    }

    features.forEach(f => {
        if (f.is_deleted && (f.is_deleted === true || f.is_deleted === 1 || f.is_deleted === "1")) return;

        const isActive = selectedFeatureIds.includes(String(f.feature_id));
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `feature-chip ${isActive ? 'active' : ''}`;
        chip.setAttribute('data-feature-id', f.feature_id);
        chip.innerHTML = `<i class="fas fa-check-circle me-1"></i>${f.feature_name}`;
        chip.onclick = () => toggleFeatureChip(f.feature_id);

        container.appendChild(chip);
    });
}

function toggleFeatureChip(featureId) {
    featureId = String(featureId);
    const idx = selectedFeatureIds.indexOf(featureId);

    if (idx === -1) {
        selectedFeatureIds.push(featureId);
    } else {
        selectedFeatureIds.splice(idx, 1);
    }

    loadFeatures();
    fetchAndRenderRooms();
}

function showLoading(show) {
    const loader = document.getElementById('loadingSpinner');
    const grid = document.getElementById('roomsGrid');

    if (show) {
        loader.classList.remove('d-none');
        grid.style.opacity = '0.3';
    } else {
        loader.classList.add('d-none');
        grid.style.opacity = '1';
    }
}
