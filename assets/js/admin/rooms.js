import {
    updateRoomModal,
    deleteRoomModal,
    updateRoomTypeModal,
    deleteRoomTypeModal
} from '../modules/admin/rooms-module.js';

/**
 * Rooms Management - Main Module
 * Handles room listing, creation, editing, and status updates
 */

// API Base URL
const BASE_URL = "http://localhost/Hotel-Reservation-Billing-System/api";
let cachedRoomTypes = [];

// Status cycle order
const ROOM_STATUSES = ['available', 'occupied', 'maintenance', 'reserved'];

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    loadRoomTypes();
    loadRooms();

    document.getElementById("addRoomBtn")?.addEventListener("click", openRoomModal);
    document.getElementById("saveRoomBtn")?.addEventListener("click", saveRoom);
    document.getElementById("applyFilters")?.addEventListener("click", filterRooms);
    document.getElementById("searchBtn")?.addEventListener("click", searchRooms);
    document.getElementById("addRoomTypeBtn")?.addEventListener("click", openRoomTypeModal);
    document.getElementById("saveRoomTypeBtn")?.addEventListener("click", saveRoomType);
    document.getElementById("refreshBtn")?.addEventListener("click", loadRooms);
    document.getElementById("roomtypes-tab")?.addEventListener("click", loadRoomTypes);
    document.getElementById("roomImage")?.addEventListener("change", previewImage);
    document.getElementById("searchRoom")?.addEventListener("keyup", (e) => {
        if (e.key === "Enter") searchRooms();
    });
});

async function loadRooms() {
    const roomsTableBody = document.getElementById("roomsTableBody");
    roomsTableBody.innerHTML = `<tr><td colspan="7" class="text-center">Loading rooms...</td></tr>`;
    try {
        const response = await axios.get(`${BASE_URL}/admin/rooms/rooms.php`, {
            params: { operation: 'getAllRooms' }
        });
        displayRooms(response.data || []);
    } catch (error) {
        roomsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading rooms</td></tr>`;
    }
}

async function loadRoomTypes() {
    const tableBody = document.getElementById("roomTypesTableBody");
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading room types...</td></tr>`;
    try {
        const response = await axios.get(`${BASE_URL}/admin/rooms/room-type.php`);
        let types = response.data || [];
        if (Array.isArray(types)) {
            types = types.filter(t => t.is_deleted === false || t.is_deleted === 0 || t.is_deleted === "0" || t.is_deleted === "FALSE" || t.is_deleted === "false");
        }
        cachedRoomTypes = types;
        displayRoomTypes(cachedRoomTypes);
        populateTypeFilter();
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading room types</td></tr>`;
    }
}

function displayRooms(rooms) {
    const tableBody = document.getElementById("roomsTableBody");
    tableBody.innerHTML = "";
    rooms.forEach(room => {
        tableBody.innerHTML += `
            <tr>
                <td>${room.room_number}</td>
                <td>${room.type_name}</td>
                <td>${room.key_features ? `<small>${room.key_features.split(',').map(f => f.trim()).join(' • ')}</small>` : '-'}</td>
                <td>
                    <span class="badge bg-${getStatusColor(room.room_status)}">
                        ${room.room_status}
                    </span>
                </td>
                <td>${room.max_capacity || '-'}</td>
                <td>₱${room.price_per_stay || '0.00'}</td>
                <td>${formatDate(room.updated_at)}</td>
                <td class="text-center">
                    <i class="fas fa-edit text-primary btn-edit-room" data-room-id="${room.room_id}" title="Edit" style="cursor:pointer;margin-right:10px;"></i>
                    <i class="fas fa-trash text-danger btn-delete-room" data-room-id="${room.room_id}" title="Delete" style="cursor:pointer;"></i>
                </td>
            </tr>
        `;
    });
    document.getElementById("totalRooms").textContent = rooms.length;

    // Modular event binding (SIR MAC style)
    tableBody.querySelectorAll('.btn-edit-room').forEach(btn => {
        btn.addEventListener('click', () => {
            updateRoomModal(parseInt(btn.dataset.roomId), cachedRoomTypes, loadRooms);
        });
    });
    tableBody.querySelectorAll('.btn-delete-room').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteRoomModal(parseInt(btn.dataset.roomId), loadRooms);
        });
    });

}

function displayRoomTypes(types) {
    const tableBody = document.getElementById("roomTypesTableBody");
    tableBody.innerHTML = "";
    if (!Array.isArray(types) || types.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No room types found.</td></tr>`;
        return;
    }
    types.forEach(type => {
        let imgSrc = '';
        if (typeof type.image_url === 'string' && type.image_url.trim() !== '') {
            if (type.image_url.startsWith('http')) {
                imgSrc = type.image_url;
            } else {
                imgSrc = window.location.origin + "/Hotel-Reservation-Billing-System/assets/images/uploads/room-types/" + type.image_url.replace(/^.*[\\\/]/, '');
            }
        } else {
            imgSrc = window.location.origin + "/Hotel-Reservation-Billing-System/assets/images/uploads/room-types/placeholder-room.jpg";
        }
        tableBody.innerHTML += `
            <tr>
                <td>
                    <img src="${imgSrc}" class="img-thumbnail" style="max-width:80px;max-height:80px;" onerror="this.onerror=null;this.src='../../assets/images/uploads/room-types/placeholder-room.jpg';">
                </td>
                <td>${type.type_name}</td>
                <td>${type.description || '-'}</td>
                <td>${type.key_features ? `<small>${type.key_features.split(',').map(f => f.trim()).join(' • ')}</small>` : '-'}</td>
                <td>${type.max_capacity || '-'}</td>
                <td>₱${type.price_per_stay || '0.00'}</td>
                <td>${type.room_size_sqm || '-'} sqm</td>
                <td class="text-center">
                    <i class="fas fa-edit text-primary btn-edit-roomtype" data-roomtype-id="${type.room_type_id}" title="Edit"  style="cursor:pointer;">
                    </i>
                    <i class="fas fa-trash text-danger btn-delete-roomtype" data-roomtype-id="${type.room_type_id}" title="Delete"  style="cursor:pointer;"> 
                    </i>
                </td>
            </tr>
        `;
    });

    // Modular event binding (SIR MAC style)
    tableBody.querySelectorAll('.btn-edit-roomtype').forEach(btn => {
        btn.addEventListener('click', () => {
            updateRoomTypeModal(parseInt(btn.dataset.roomtypeId), loadRoomTypes);
        });
    });
    tableBody.querySelectorAll('.btn-delete-roomtype').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteRoomTypeModal(parseInt(btn.dataset.roomtypeId), loadRoomTypes);
        });
    });
}

function populateTypeFilter() {
    const typeFilter = document.getElementById("typeFilter");
    if (!typeFilter) return;
    typeFilter.innerHTML = '<option value="">All Types</option>';
    cachedRoomTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type.room_type_id;
        option.textContent = type.type_name;
        typeFilter.appendChild(option);
    });
}

async function filterRooms() {
    const typeId = document.getElementById("typeFilter").value || "";
    const status = document.getElementById("statusFilter").value || "";
    let url = `${BASE_URL}/admin/rooms/rooms.php`;
    const params = [];
    if (typeId) params.push(`type_id=${encodeURIComponent(typeId)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (params.length > 0) url += "?" + params.join("&");
    try {
        const response = await axios.get(url);
        const rooms = response.data || [];
        displayRooms(rooms);

        // Toast logic
        let toastMsg = '';
        if (status) {
            toastMsg = `Found ${rooms.length} ${status.toLowerCase()} room${rooms.length === 1 ? '' : 's'}`;
        } else if (typeId) {
            // Find type name from cachedRoomTypes
            const typeObj = cachedRoomTypes.find(t => t.room_type_id == typeId);
            const typeName = typeObj ? typeObj.type_name : 'selected';
            toastMsg = `Found ${rooms.length} ${typeName} room${rooms.length === 1 ? '' : 's'}`;
        } else {
            toastMsg = `Found ${rooms.length} room${rooms.length === 1 ? '' : 's'}`;
        }
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: toastMsg,
                showConfirmButton: false,
                timer: 1800
            });
        }
    } catch {
        displayRooms([]);
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'No rooms found',
                showConfirmButton: false,
                timer: 1800
            });
        }
    }
}

async function searchRooms() {
    const searchTerm = document.getElementById("searchRoom").value.trim();
    if (!searchTerm) {
        await loadRooms();
        return;
    }
    try {
        const response = await axios.get(`${BASE_URL}/admin/rooms/rooms.php?search=${encodeURIComponent(searchTerm)}`);
        const rooms = response.data || [];
        displayRooms(rooms);
        // Toast logic for search
        let toastMsg = `Found ${rooms.length} room${rooms.length === 1 ? '' : 's'}`;
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: toastMsg,
                showConfirmButton: false,
                timer: 1800
            });
        }
    } catch {
        displayRooms([]);
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'No rooms found',
                showConfirmButton: false,
                timer: 1800
            });
        }
    }
}

function openRoomModal() {
    const form = document.getElementById("roomForm");
    form.reset();
    document.getElementById("roomId").value = "";
    document.getElementById("roomModalLabel").textContent = "Add New Room";
    populateRoomTypeSelect();
    new bootstrap.Modal(document.getElementById("roomModal")).show();
}

function populateRoomTypeSelect(selectedId = "") {
    const select = document.getElementById("roomType");
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Room Type --</option>';
    cachedRoomTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type.room_type_id;
        option.textContent = type.type_name;
        if (selectedId && selectedId == type.room_type_id) option.selected = true;
        select.appendChild(option);
    });
}

async function saveRoom() {
    const roomNumber = document.getElementById("roomNumber").value;
    const roomTypeId = document.getElementById("roomType").value;
    const roomId = document.getElementById("roomId").value; // <-- FIX: get roomId from DOM
    if (!roomNumber || !roomTypeId) {
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please fill in all required fields',
                showConfirmButton: false,
                timer: 1800
            });
        } else {
            alert("Please fill in all required fields");
        }
        return;
    }
    // Find type name for toast
    const typeObj = cachedRoomTypes.find(t => t.room_type_id == roomTypeId);
    const typeName = typeObj ? typeObj.type_name : '';
    // Prepare payload for API contract
    const roomData = {
        room_number: roomNumber,
        room_type_id: parseInt(roomTypeId)
    };
    if (!roomId) {
        // Always set status to 1 (available) for new rooms, as required by backend
        roomData.room_status_id = 1;
    } else {
        roomData.room_id = parseInt(roomId);
    }
    try {
        let response;
        if (roomId) {
            // For update, use PUT with operation=updateRoom
            response = await axios.put(`${BASE_URL}/admin/rooms/rooms.php`, {
                operation: 'updateRoom',
                json: JSON.stringify(roomData)
            });
        } else {
            // For insert, use POST with operation=insertRoom and json
            const formData = new FormData();
            formData.append('operation', 'insertRoom');
            formData.append('json', JSON.stringify(roomData));
            response = await axios.post(`${BASE_URL}/admin/rooms/rooms.php`, formData);
        }
        // API returns 1 for success
        if (response.data == 1 || (response.data && response.data.message)) {
            bootstrap.Modal.getInstance(document.getElementById("roomModal")).hide();
            await loadRooms();
            if (window.Swal) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: roomId
                        ? `Room ${roomNumber} updated successfully`
                        : `Room ${roomNumber} ${typeName} added`,
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        } else {
            throw new Error('API did not return success');
        }
    } catch {
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Failed to save room',
                showConfirmButton: false,
                timer: 2500
            });
        } else {
            alert("Failed to save room");
        }
    }
}

function openRoomTypeModal(roomType = null) {
    const form = document.getElementById("roomTypeForm");
    form.reset();
    document.getElementById("roomTypeId").value = "";
    document.getElementById("imagePreview").innerHTML = "";

    if (roomType) {
        // Edit mode
        document.getElementById("roomTypeId").value = roomType.room_type_id;
        document.getElementById("typeName").value = roomType.type_name || "";
        document.getElementById("typeDescription").value = roomType.description || "";
        document.getElementById("keyFeatures").value = roomType.key_features || "";
        document.getElementById("maxCapacity").value = roomType.max_capacity || "";
        document.getElementById("pricePerStay").value = roomType.price_per_stay || "";
        document.getElementById("roomSize").value = roomType.room_size_sqm || "";
        document.getElementById("roomTypeModalLabel").textContent = "Edit Room Type";
        // Show image or placeholder
        let imgSrc = '';
        if (roomType.image_url) {
            if (roomType.image_url.startsWith('http')) {
                imgSrc = roomType.image_url;
            } else {
                imgSrc = window.location.origin + "/Hotel-Reservation-Billing-System/assets/images/uploads/room-types/" + roomType.image_url.replace(/^.*[\\\/]/, '');
            }
        } else {
            imgSrc = window.location.origin + "/Hotel-Reservation-Billing-System/assets/images/uploads/room-types/placeholder-room.jpg";
        }
        const img = document.createElement("img");
        img.src = imgSrc;
        img.classList.add("img-thumbnail", "mt-2");
        img.style.maxHeight = "150px";
        document.getElementById("imagePreview").appendChild(img);
    } else {
        // Add mode - always clear all fields and show correct modal title
        document.getElementById("roomTypeModalLabel").textContent = "Add New Room Type";
        document.getElementById("typeName").value = "";
        document.getElementById("typeDescription").value = "";
        document.getElementById("keyFeatures").value = "";
        document.getElementById("maxCapacity").value = "";
        document.getElementById("pricePerStay").value = "";
        document.getElementById("roomSize").value = "";
        // Always show placeholder image
        const img = document.createElement("img");
        img.src = window.location.origin + "/Hotel-Reservation-Billing-System/assets/images/uploads/room-types/placeholder-room.jpg";
        img.classList.add("img-thumbnail", "mt-2");
        img.style.maxHeight = "150px";
        document.getElementById("imagePreview").appendChild(img);
    }
    new bootstrap.Modal(document.getElementById("roomTypeModal")).show();
}
// Only handles adding a new room type (createRoomType)
async function saveRoomType() {
    const typeName = document.getElementById("typeName").value;
    const description = document.getElementById("typeDescription").value;
    const keyFeatures = document.getElementById("keyFeatures").value;
    const maxCapacity = document.getElementById("maxCapacity").value;
    const pricePerStay = document.getElementById("pricePerStay").value;
    const roomSize = document.getElementById("roomSize").value;
    const roomImage = document.getElementById("roomImage").files[0];

    if (!typeName) {
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Type name is required',
                showConfirmButton: false,
                timer: 1800
            });
        } else {
            alert("Type name is required");
        }
        return;
    }

    // Prepare FormData for API contract (with image)
    const formData = new FormData();
    formData.append('type_name', typeName);
    formData.append('description', description);
    formData.append('key_features', keyFeatures);
    formData.append('max_capacity', maxCapacity);
    formData.append('price_per_stay', pricePerStay);
    formData.append('room_size_sqm', roomSize);
    if (roomImage) formData.append('room_image', roomImage);
    formData.append('operation', 'createRoomType');

    try {
        const response = await axios.post(`${BASE_URL}/admin/rooms/room-type.php`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data && response.data.error) {
            throw new Error(response.data.error);
        }
        await loadRoomTypes();
        if (response.data && (response.data.message || response.data === 1)) {
            bootstrap.Modal.getInstance(document.getElementById("roomTypeModal")).hide();
            if (window.Swal) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Room type added!',
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        } else {
            throw new Error('API did not return success');
        }
    } catch (err) {
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Failed to save room type',
                text: err && err.message ? err.message : '',
                showConfirmButton: false,
                timer: 2500
            });
        } else {
            alert("Failed to save room type: " + (err && err.message ? err.message : ''));
        }
    }
}
// Function to preview the selected image
function previewImage(event) {
    const imagePreview = document.getElementById("imagePreview");
    imagePreview.innerHTML = "";
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.classList.add("img-thumbnail", "mt-2");
            img.style.maxHeight = "150px";
            imagePreview.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
}

function getStatusColor(status) {
    const colors = {
        "available": "success",
        "occupied": "danger",
        "maintenance": "warning",
        "reserved": "info"
    };
    return colors[status] || "secondary";
}

function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
}
