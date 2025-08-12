// ==========================
// === GLOBALS & CONSTANTS ===
// ==========================
const BASE_URL = "/Hotel-Reservation-Billing-System/api/admin";
let cachedRoomTypes = [];
let cachedGuests = [];
let cachedStatuses = [];
let cachedRooms = [];

// ==========================
// === INITIALIZATION =======
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    // --- Load initial data ---
    loadRoomTypes();
    loadGuests();
    loadStatuses().then(() => {
        updateStatusFilter(); // Call this after statuses are loaded
    });
    displayReservations();

    // --- Event Listeners ---
    document.getElementById("refreshBtn").addEventListener("click", displayReservations);
    document.getElementById("addReservationBtn").addEventListener("click", () => {
        clearReservationForm();
        new bootstrap.Modal(document.getElementById("reservationModal")).show();
        updateAvailableRooms();
        updateCheckoutDate();
    });
    document.getElementById("saveReservationBtn").addEventListener("click", saveReservation);

    document.getElementById("roomTypeSelect").addEventListener("change", updateAvailableRooms);

    document.getElementById("checkInDate").addEventListener("change", () => {
        updateAvailableRooms();
        updateCheckoutDate();
    });
    document.getElementById("checkInTime").addEventListener("change", () => {
        updateAvailableRooms();
        updateCheckoutDate();
    });

    document.getElementById("newGuestBtn").addEventListener("click", () => {
        clearGuestForm();
        new bootstrap.Modal(document.getElementById("guestModal")).show();
    });
    document.getElementById("saveGuestBtn").addEventListener("click", async () => {
        await saveGuest();
        clearGuestForm();
    });

    // --- Date restrictions ---
    const checkInDate = document.getElementById("checkInDate");
    const today = new Date();
    if (checkInDate) checkInDate.min = today.toISOString().split("T")[0];
    const dateOfBirth = document.getElementById("dateOfBirth");
    if (dateOfBirth) dateOfBirth.max = today.toISOString().split("T")[0];

    // --- Filters ---
    document.getElementById("statusFilter")?.addEventListener("change", () => {
        document.getElementById("applyFilters").click();
    });

    // --- Guest search ---
    const guestSearchInput = document.getElementById("guestSearchInput");
    if (guestSearchInput) {
        guestSearchInput.addEventListener("input", function () {
            filterGuestDropdown(this.value);
        });
    }
});

// ==========================
// === RESERVATIONS TABLE ===
// ==========================
async function displayReservations() {
    try {
        const response = await axios.get(`${BASE_URL}/reservations/reservations.php`, {
            params: { operation: "getAllReservations" }
        });
        if (response.status === 200) {
            displayReservationsTable(response.data);
        } else {
            showError("Failed to load reservations.");
        }
    } catch (error) {
        console.error("Error fetching reservations:", error);
        showError("Failed to load reservations. Please try again.");
    }
}

// ==========================
// === RESERVATIONS TABLE (WITH DEBUG) ===
// ==========================
async function displayReservations() {
    console.log("🔍 displayReservations() called"); // DEBUG
    try {
        const response = await axios.get(`${BASE_URL}/reservations/reservations.php`, {
            params: { operation: "getAllReservations" }
        });

        console.log("📡 API Response Status:", response.status); // DEBUG
        console.log("📡 API Response Data:", response.data); // DEBUG
        console.log("📡 Data Type:", typeof response.data); // DEBUG
        console.log("📡 Is Array:", Array.isArray(response.data)); // DEBUG

        if (response.status === 200) {
            displayReservationsTable(response.data);
        } else {
            showError("Failed to load reservations.");
        }
    } catch (error) {
        console.error("❌ Error fetching reservations:", error);
        console.log("❌ Error response:", error.response?.data); // DEBUG
        showError("Failed to load reservations. Please try again.");
    }
}

function displayReservationsTable(reservations) {
    console.log("📊 displayReservationsTable called with:", reservations); // DEBUG
    console.log("📊 Reservations length:", reservations?.length); // DEBUG

    const tbody = document.getElementById("reservationsTableBody");
    if (!tbody) {
        console.error("❌ reservationsTableBody element not found!");
        return;
    }

    tbody.innerHTML = "";

    // Check if reservations is null, undefined, or not an array
    if (!reservations) {
        console.log("⚠️ Reservations is null or undefined");
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No reservations data received.</td></tr>`;
        return;
    }

    if (!Array.isArray(reservations)) {
        console.log("⚠️ Reservations is not an array, type:", typeof reservations);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Invalid reservations data format.</td></tr>`;
        return;
    }

    if (!reservations.length) {
        console.log("⚠️ Reservations array is empty");
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No reservations found.</td></tr>`;
        return;
    }

    console.log("✅ Processing", reservations.length, "reservations"); // DEBUG
    document.getElementById("totalReservations").textContent = reservations.length;

    reservations.forEach((res, index) => {
        console.log(`📝 Processing reservation ${index + 1}:`, res); // DEBUG

        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${res.reservation_id || 'N/A'}</td>
        <td>${res.guest_name || res.first_name + ' ' + res.last_name || 'No Name'}</td>
        <td>${res.type_name ? `${res.type_name} (${res.room_number || ''})` : (res.room_number || 'No Room')}</td>
        <td>${res.check_in_date || 'N/A'}${res.check_in_time ? " " + res.check_in_time : ""}</td>
        <td>${res.check_out_date || 'N/A'}${res.check_out_time ? " " + res.check_out_time : ""}</td>
        <td>${getStatusBadge(res.reservation_status || res.room_status || 'pending')}</td>
        <td>
            <i class="fas fa-edit action-icon text-primary" data-action="edit" data-id="${res.reservation_id}" title="Edit" style="cursor:pointer;"></i>
            ${res.reservation_status === 'confirmed' ? `<i class="fas fa-sign-in-alt action-icon text-success" data-action="checkin" data-room="${res.room_id}" title="Check In" style="cursor:pointer;"></i>` : ''}
            ${res.reservation_status === 'checked-in' ? `<i class="fas fa-sign-out-alt action-icon text-warning" data-action="checkout" data-room="${res.room_id}" title="Check Out" style="cursor:pointer;"></i>` : ''}
        </td>
        `;
        tbody.appendChild(tr);

        // Add event listeners for icon actions
        const editIcon = tr.querySelector('.fa-edit[data-action="edit"]');
        if (editIcon) {
            editIcon.addEventListener("click", () => editReservation(res));
        }
        const checkinIcon = tr.querySelector('.fa-sign-in-alt[data-action="checkin"]');
        if (checkinIcon) {
            checkinIcon.addEventListener("click", async () => {
                await setRoomOccupied(res.room_id);
                displayReservations();
            });
        }
        const checkoutIcon = tr.querySelector('.fa-sign-out-alt[data-action="checkout"]');
        if (checkoutIcon) {
            checkoutIcon.addEventListener("click", async () => {
                await setRoomAvailable(res.room_id);
                displayReservations();
            });
        }
    });

    console.log("✅ Successfully rendered", reservations.length, "reservations"); // DEBUG
}

function getStatusBadge(status) {
    status = (status || '').toLowerCase();
    if (status === 'pending') return `<span class="badge bg-warning text-dark">${status}</span>`;
    if (status === 'confirmed') return `<span class="badge bg-success">${status}</span>`;
    if (status === 'checked-in') return `<span class="badge bg-primary">${status}</span>`;
    if (status === 'checked-out') return `<span class="badge bg-secondary">${status}</span>`;
    if (status === 'cancelled') return `<span class="badge bg-danger">${status}</span>`;
    return `<span class="badge bg-info">${status}</span>`;
}

// ==========================
// === RESERVATION MODAL ====
// ==========================
function editReservation(res) {
    document.getElementById("reservationId").value = res.reservation_id;
    document.getElementById("guestSelect").value = res.guest_id || "";
    document.getElementById("checkInDate").value = res.check_in_date || "";
    document.getElementById("checkInTime").value = res.check_in_time || "14:00";
    updateCheckoutDate();
    if (res.room_type_id) {
        document.getElementById("roomTypeSelect").value = res.room_type_id;
        updateAvailableRooms().then(() => {
            if (res.room_id) {
                document.getElementById("roomSelect").value = res.room_id;
            }
        });
    }
    document.getElementById("statusSelect").value = res.reservation_status_id || "";
    document.getElementById("reservationModalLabel").textContent = "Edit Reservation #" + res.reservation_id;
    new bootstrap.Modal(document.getElementById("reservationModal")).show();
}

function clearReservationForm() {
    document.getElementById("reservationForm").reset();
    document.getElementById("reservationId").value = "";
    document.getElementById("checkInTime").value = "14:00";
    document.getElementById("reservationModalLabel").textContent = "Add New Reservation";
    updateCheckoutDate();
    const roomSelect = document.getElementById("roomSelect");
    roomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
    document.getElementById("roomTypeSelect").value = "";
    updateAvailableRooms();
}

function updateCheckoutDate() {
    const checkIn = document.getElementById("checkInDate").value;
    const checkInTime = document.getElementById("checkInTime").value || "14:00";
    const checkOut = document.getElementById("checkOutDate");
    const checkOutTime = document.getElementById("checkOutTime");
    if (checkIn && checkInTime) {
        const dt = new Date(`${checkIn}T${checkInTime}:00+08:00`);
        dt.setHours(dt.getHours() + 24);
        const manilaDate = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const manilaTime = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' });
        checkOut.value = manilaDate;
        checkOutTime.value = manilaTime;
        checkOut.readOnly = true;
        checkOutTime.readOnly = true;
    } else {
        checkOut.value = "";
        checkOutTime.value = "";
    }
}

// ==========================
// === ROOMS & ROOM TYPES ====
// ==========================
async function loadRoomTypes() {
    // Always fetch room types and store as a map for fast lookup
    const select = document.getElementById("roomTypeSelect");
    if (!select) return;
    select.innerHTML = `<option value="">-- Select Room Type --</option>`;
    try {
        const response = await axios.get(`${BASE_URL}/rooms/room-type.php`);
        // Ensure array and filter out deleted types
        cachedRoomTypes = Array.isArray(response.data)
            ? response.data.filter(t => !t.is_deleted || t.is_deleted === 0 || t.is_deleted === "0" || t.is_deleted === "FALSE" || t.is_deleted === "false")
            : [];
        cachedRoomTypes.forEach(type => {
            const option = document.createElement("option");
            option.value = type.room_type_id;
            option.textContent = type.type_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load room types:", error);
        showError("Failed to load room types.");
    }
}

async function updateAvailableRooms() {
    const roomTypeId = document.getElementById("roomTypeSelect").value;
    const select = document.getElementById("roomSelect");
    select.innerHTML = `<option value="">-- Select Room --</option>`;
    const checkInDate = document.getElementById("checkInDate").value;
    const checkOutDate = document.getElementById("checkOutDate").value;

    // Defensive: Only fetch if all required fields are present
    if (!roomTypeId) {
        select.innerHTML = `<option value="">Select a room type first</option>`;
        return;
    }
    if (!checkInDate || !checkOutDate) {
        select.innerHTML = `<option value="">Select check-in and check-out date</option>`;
        return;
    }

    try {
        select.innerHTML = `<option value="">Loading available rooms...</option>`;
        const reservationId = document.getElementById("reservationId").value;
        const params = {
            operation: "getAvailableRooms",
            room_type_id: roomTypeId,
            check_in_date: checkInDate,
            check_out_date: checkOutDate
        };
        if (reservationId) params.reservation_id = reservationId;

        // Always expect an array from API, fallback to []
        const response = await axios.get(`${BASE_URL}/rooms/rooms.php`, { params });
        select.innerHTML = `<option value="">-- Select Room --</option>`;
        let rooms = [];
        if (Array.isArray(response.data)) {
            rooms = response.data;
        } else if (response.data && typeof response.data === 'object') {
            rooms = Object.values(response.data);
        }
        // Only show available rooms for this type
        if (!rooms.length) {
            select.innerHTML = `<option value="">No available rooms for this type</option>`;
            return;
        }
        cachedRooms = rooms;
        rooms.forEach(room => {
            const option = document.createElement("option");
            option.value = room.room_id;
            option.textContent = `${room.room_number} (${room.type_name || 'Room'})`;
            select.appendChild(option);
        });
        // Show summary at the bottom
        const typeName = cachedRoomTypes.find(t => t.room_type_id == roomTypeId)?.type_name || 'room';
        select.innerHTML += `<option disabled>───────────────</option>`;
        select.innerHTML += `<option disabled>${rooms.length} ${typeName} room(s) available</option>`;
    } catch (error) {
        console.error("Failed to load available rooms:", error);
        select.innerHTML = `<option value="">Error loading rooms: ${error.message}</option>`;
    }
}

// ==========================
// === GUESTS ===============
// ==========================
async function loadGuests() {
    const select = document.getElementById("guestSelect");
    select.innerHTML = `<option value="">-- Select Guest --</option>`;
    try {
        const response = await axios.get(`${BASE_URL}/guests/guests.php`, {
            params: { operation: "getAllGuests" }
        });
        cachedGuests = response.data || [];
        cachedGuests.forEach(guest => {
            const option = document.createElement("option");
            option.value = guest.guest_id;
            option.textContent = `${guest.first_name} ${guest.suffix ? guest.suffix + " " : ""}${guest.last_name}`;
            select.appendChild(option);
        });
    } catch {
        showError("Failed to load guests.");
    }
}

function filterGuestDropdown(query) {
    const select = document.getElementById("guestSelect");
    if (!select || !cachedGuests.length) return;
    const q = (query || "").toLowerCase();
    select.innerHTML = `<option value="">-- Select Guest --</option>`;
    cachedGuests
        .filter(g => (`${g.first_name} ${g.last_name} ${g.suffix || ""}`.toLowerCase().includes(q)))
        .forEach(guest => {
            const option = document.createElement("option");
            option.value = guest.guest_id;
            option.textContent = `${guest.first_name} ${guest.suffix ? guest.suffix + " " : ""}${guest.last_name}`;
            select.appendChild(option);
        });
}

function clearGuestForm() {
    document.getElementById("guestForm").reset();
    document.getElementById("guestId").value = "";
    const dateOfBirth = document.getElementById("dateOfBirth");
    if (dateOfBirth) {
        const today = new Date();
        dateOfBirth.max = today.toISOString().split("T")[0];
    }
}

async function saveGuest() {
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const middleName = document.getElementById("middleName").value;
    const suffix = document.getElementById("suffix").value;
    const dateOfBirth = document.getElementById("dateOfBirth").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const idType = document.getElementById("idType").value;
    const idNumber = document.getElementById("idNumber").value;

    // Validation
    if (!firstName || !lastName || !dateOfBirth || !email || !phone || !idType || !idNumber) {
        showError("Please fill in all guest fields.");
        return;
    }
    // Date of birth cannot be in the future
    const today = new Date();
    const dob = new Date(dateOfBirth);
    today.setHours(0, 0, 0, 0);
    if (dob > today) {
        showError("Date of birth cannot be in the future.");
        return;
    }

    // Find guest_idtype_id from idType
    let guest_idtype_id = null;
    try {
        const idTypesRes = await axios.get(`${BASE_URL}/guests/id_types.php`, { params: { operation: "getAllIDTypes" } });
        const idTypes = idTypesRes.data || [];
        const found = idTypes.find(t => t.id_type === idType);
        guest_idtype_id = found ? found.guest_idtype_id : null;
    } catch { }

    const jsonData = {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        suffix: suffix,
        date_of_birth: dateOfBirth,
        email: email,
        phone_number: phone,
        id_type: idType,
        id_number: idNumber,
        guest_idtype_id: guest_idtype_id
    };

    const formData = new FormData();
    formData.append("operation", "insertGuest");
    formData.append("json", JSON.stringify(jsonData));

    const response = await axios.post(`${BASE_URL}/guests/guests.php`, formData);
    if (response.data == 1) {
        loadGuests();
        showSuccess("Guest added!");
    } else {
        showError("Failed to add guest.");
    }
}

// ==========================
// === RESERVATION STATUS ====
// ==========================
async function loadStatuses() {
    const select = document.getElementById("statusSelect");
    select.innerHTML = "";
    try {
        const response = await axios.get(`${BASE_URL}/reservations/reservation_status.php`);
        if (response.data && Array.isArray(response.data)) {
            cachedStatuses = response.data;
            if (cachedStatuses.length === 0) {
                select.innerHTML = `<option value="">No statuses found</option>`;
                return;
            }
            cachedStatuses.forEach(status => {
                const option = document.createElement("option");
                option.value = status.reservation_status_id;
                option.textContent = status.reservation_status;
                select.appendChild(option);
            });
        } else {
            throw new Error("Invalid response format from reservation_status.php");
        }
    } catch (error) {
        console.error("Error loading reservation statuses:", error);
    }
}

function updateStatusFilter() {
    const statusFilter = document.getElementById("statusFilter");
    if (!statusFilter || !cachedStatuses || cachedStatuses.length === 0) return;
    statusFilter.innerHTML = `<option value="">All Statuses</option>`;
    cachedStatuses.forEach(status => {
        const option = document.createElement("option");
        option.value = status.reservation_status;
        option.textContent = status.reservation_status.charAt(0).toUpperCase() + status.reservation_status.slice(1);
        statusFilter.appendChild(option);
    });
}

// REMOVED THE DUPLICATE DOMContentLoaded EVENT LISTENER THAT WAS CAUSING DUPLICATION

// ==========================
// === RESERVED ROOMS LOGIC =
// ==========================
async function upsertReservedRoom(reservationId, roomId) {
    if (!reservationId || !roomId) return;
    try {
        const checkRes = await axios.get(`${BASE_URL}/reservations/reserved_rooms.php`, {
            params: { operation: "getAllReservedRooms" }
        });
        let reservedRoom = null;
        if (Array.isArray(checkRes.data)) {
            reservedRoom = checkRes.data.find(rr => rr.reservation_id == reservationId && rr.is_deleted == 0);
        }
        if (reservedRoom) {
            if (reservedRoom.room_id != roomId) {
                await axios.post(`${BASE_URL}/reservations/reserved_rooms.php`, new FormData(Object.entries({
                    operation: "deleteReservedRoom",
                    json: JSON.stringify({ reserved_room_id: reservedRoom.reserved_room_id })
                })));
                await saveReservedRoom(reservationId, roomId);
            }
        } else {
            await saveReservedRoom(reservationId, roomId);
        }
    } catch (err) {
        await saveReservedRoom(reservationId, roomId);
    }
}

async function saveReservedRoom(reservationId, roomId) {
    if (!reservationId || !roomId) return;
    const formData = new FormData();
    formData.append("operation", "insertReservedRoom");
    formData.append("json", JSON.stringify({
        reservation_id: reservationId,
        room_id: roomId,
    }));
    await axios.post(`${BASE_URL}/reservations/reserved_rooms.php`, formData);
}

// ==========================
// === SAVE RESERVATION =====
// ==========================
async function saveReservation() {
    const reservationId = document.getElementById("reservationId").value;
    const guestId = document.getElementById("guestSelect").value;
    const checkInDate = document.getElementById("checkInDate").value;
    const checkInTime = document.getElementById("checkInTime").value || "14:00";
    const checkOutDate = document.getElementById("checkOutDate").value;
    const checkOutTime = document.getElementById("checkOutTime").value || checkInTime;
    const roomTypeId = document.getElementById("roomTypeSelect").value;
    const roomId = document.getElementById("roomSelect").value;
    const statusId = document.getElementById("statusSelect").value;

    // Validation
    if (!guestId || !checkInDate || !checkInTime || !roomTypeId || !roomId || !statusId) {
        showError("Please fill in all required fields.");
        return;
    }
    // Check-in date must be today or future
    const today = new Date();
    const checkIn = new Date(checkInDate);
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
        showError("Check-in date cannot be in the past.");
        return;
    }

    const jsonData = {
        guest_id: guestId,
        check_in_date: checkInDate,
        check_in_time: checkInTime,
        check_out_date: checkOutDate,
        check_out_time: checkOutTime,
        room_type_id: roomTypeId,
        room_id: roomId,
        reservation_status_id: statusId
    };

    let operation = "insertReservation";
    if (reservationId) {
        jsonData.reservation_id = reservationId;
        operation = "updateReservation";
    }

    // Save reservation
    const formData = new FormData();
    formData.append("operation", operation);
    formData.append("json", JSON.stringify(jsonData));

    try {
        const response = await axios.post(`${BASE_URL}/reservations/reservations.php`, formData);
        let newReservationId = reservationId;

        if (response.data == 1) {
            // If new, fetch the latest reservation_id for this guest
            if (!reservationId) {
                try {
                    const resList = await axios.get(`${BASE_URL}/reservations/reservations.php`, {
                        params: { operation: "getAllReservations" }
                    });
                    if (Array.isArray(resList.data)) {
                        const found = resList.data.filter(r => r.guest_id == guestId).sort((a, b) => b.reservation_id - a.reservation_id)[0];
                        newReservationId = found ? found.reservation_id : null;
                    }
                } catch (error) {
                    console.error("Error fetching new reservation ID:", error);
                }
            }

            // Always update ReservedRoom for this reservation
            await upsertReservedRoom(newReservationId, roomId);

            displayReservations();
            bootstrap.Modal.getInstance(document.getElementById("reservationModal")).hide();
            showSuccess("Reservation saved!");
        } else {
            showError("Failed to save reservation.");
        }
    } catch (error) {
        console.error("Error saving reservation:", error);
        showError("An error occurred while saving the reservation.");
    }
}

// ==========================
// === ROOM STATUS HELPERS ===
// ==========================
async function setRoomOccupied(roomId) {
    const formData = new FormData();
    formData.append("operation", "updateRoom");
    formData.append("json", JSON.stringify({
        room_id: roomId,
        room_status_id: await getRoomStatusIdByName('occupied'),
        update_type: "status_only"
    }));
    const response = await axios({
        url: `${BASE_URL}/rooms/rooms.php`,
        method: "POST",
        data: formData
    });
    return response.data == 1;
}

async function setRoomAvailable(roomId) {
    const formData = new FormData();
    formData.append("operation", "updateRoom");
    formData.append("json", JSON.stringify({
        room_id: roomId,
        room_status_id: await getRoomStatusIdByName('available'),
        update_type: "status_only"
    }));
    const response = await axios({
        url: `${BASE_URL}/rooms/rooms.php`,
        method: "POST",
        data: formData
    });
    return response.data == 1;
}

async function getRoomStatusIdByName(statusName) {
    const response = await axios.get(`${BASE_URL}/rooms/rooms.php`, {
        params: { operation: "getAllRoomStatus" }
    });
    if (Array.isArray(response.data)) {
        const found = response.data.find(s => s.room_status === statusName);
        return found ? found.room_status_id : null;
    }
    return null;
}

// ==========================
// === UTILITIES ============
// ==========================
function showError(msg) {
    if (window.Swal) {
        Swal.fire("Error", msg, "error");
    } else {
        alert(msg);
    }
}

function showSuccess(msg) {
    if (window.Swal) {
        Swal.fire("Success", msg, "success");
    } else {
        alert(msg);
    }
}