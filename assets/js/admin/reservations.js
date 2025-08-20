import { updateReservationModal, deleteReservationModal } from '../modules/admin/reservation-module.js';

// ==========================
// === GLOBALS & CONSTANTS ===
// ==========================
const BASE_URL = "/Hotel-Reservation-Billing-System/api/admin";
let cachedRoomTypes = [];
let cachedStatuses = [];
let cachedRooms = [];

// ==========================
// === INITIALIZATION =======
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    // --- Guest search logic ---
    let allGuests = [];
    const guestSearchInput = document.getElementById("guestSearchInput");
    const guestSearchDropdown = document.getElementById("guestSearchDropdown");

    // Helper: Enable/disable guest info fields
    function setGuestFieldsDisabled(disabled) {
        [
            "firstName", "lastName", "middleName", "suffix", "dateOfBirth",
            "email", "phone", "idType", "idNumber"
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
    }

    // Fetch all guests when modal opens
    const addReservationBtn = document.getElementById("addReservationBtn");
    if (addReservationBtn) {
        addReservationBtn.addEventListener("click", async () => {
            try {
                const res = await axios.get(`${BASE_URL}/guests/guests.php`, { params: { operation: "getAllGuests" } });
                allGuests = Array.isArray(res.data) ? res.data : [];
            } catch {
                allGuests = [];
            }
            if (guestSearchInput) guestSearchInput.value = "";
            if (guestSearchDropdown) guestSearchDropdown.style.display = "none";
            setGuestFieldsDisabled(false); // Always enable fields on modal open
            document.getElementById("guestSelectId")?.remove(); // Remove hidden guest id if any
        });
    }

    if (guestSearchInput) {
        guestSearchInput.addEventListener("input", function () {
            const q = (this.value || "").toLowerCase();
            if (!q || !allGuests.length) {
                if (guestSearchDropdown) guestSearchDropdown.style.display = "none";
                setGuestFieldsDisabled(false);
                document.getElementById("guestSelectId")?.remove();
                return;
            }
            const matches = allGuests.filter(g =>
                (`${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(q))
            ).slice(0, 8);
            if (!matches.length) {
                if (guestSearchDropdown) guestSearchDropdown.style.display = "none";
                setGuestFieldsDisabled(false);
                document.getElementById("guestSelectId")?.remove();
                return;
            }
            if (guestSearchDropdown) {
                guestSearchDropdown.innerHTML = matches.map(g =>
                    `<a href="#" class="list-group-item list-group-item-action" data-guest-id="${g.guest_id}">
                        <b>${g.first_name} ${g.last_name}</b> <small>(${g.email})</small>
                    </a>`
                ).join("");
                guestSearchDropdown.style.display = "block";
            }
        });

        // Hide dropdown on blur
        guestSearchInput.addEventListener("blur", function () {
            setTimeout(() => {
                if (guestSearchDropdown) guestSearchDropdown.style.display = "none";
            }, 200);
        });
    }

    if (guestSearchDropdown) {
        guestSearchDropdown.addEventListener("mousedown", function (e) {
            const a = e.target.closest("a[data-guest-id]");
            if (!a) return;
            e.preventDefault();
            const guestId = a.getAttribute("data-guest-id");
            const guest = allGuests.find(g => g.guest_id == guestId);
            if (guest) {
                const setFieldValue = (id, value) => {
                    const field = document.getElementById(id);
                    if (field) field.value = value || "";
                };

                setFieldValue("firstName", guest.first_name);
                setFieldValue("lastName", guest.last_name);
                setFieldValue("middleName", guest.middle_name);
                setFieldValue("suffix", guest.suffix);
                setFieldValue("dateOfBirth", guest.date_of_birth);
                setFieldValue("email", guest.email);
                setFieldValue("phone", guest.phone_number);
                setFieldValue("idType", guest.id_type);
                setFieldValue("idNumber", guest.id_number);

                // Store selected guest_id in a hidden field
                let hidden = document.getElementById("guestSelectId");
                if (!hidden) {
                    hidden = document.createElement("input");
                    hidden.type = "hidden";
                    hidden.id = "guestSelectId";
                    hidden.name = "guestSelectId";
                    document.getElementById("reservationForm").appendChild(hidden);
                }
                hidden.value = guestId;

                setGuestFieldsDisabled(true); // Disable guest fields if existing guest is selected
            }
            guestSearchDropdown.style.display = "none";
        });
    }

    // Allow user to clear guest selection and re-enable fields
    ["firstName", "lastName", "email"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", function () {
                // If user edits any guest field, remove guestSelectId and enable fields
                document.getElementById("guestSelectId")?.remove();
                setGuestFieldsDisabled(false);
            });
        }
    });

    // --- Load initial data ---
    loadRoomTypes();
    loadGuests();
    loadIDTypes();
    loadStatuses().then(() => {
        updateStatusFilter(); // Call this after statuses are loaded
    });
    displayReservations();

    // --- Event Listeners with null checks ---
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", displayReservations);
    }

    if (addReservationBtn) {
        addReservationBtn.addEventListener("click", () => {
            clearReservationForm();
            new bootstrap.Modal(document.getElementById("reservationModal")).show();
            updateAvailableRooms();
            updateCheckoutDate();
        });
    }

    const saveReservationBtn = document.getElementById("saveReservationBtn");
    if (saveReservationBtn) {
        saveReservationBtn.addEventListener("click", saveReservation);
    }

    const roomTypeSelect = document.getElementById("roomTypeSelect");
    if (roomTypeSelect) {
        roomTypeSelect.addEventListener("change", updateAvailableRooms);
    }

    const checkInDate = document.getElementById("checkInDate");
    const checkInTime = document.getElementById("checkInTime");

    if (checkInDate) {
        checkInDate.addEventListener("change", () => {
            updateAvailableRooms();
            updateCheckoutDate();
        });
    }

    if (checkInTime) {
        checkInTime.addEventListener("change", () => {
            updateAvailableRooms();
            updateCheckoutDate();
        });
    }

    const newGuestBtn = document.getElementById("newGuestBtn");
    if (newGuestBtn) {
        newGuestBtn.addEventListener("click", () => {
            clearGuestForm();
            new bootstrap.Modal(document.getElementById("guestModal")).show();
        });
    }

    const saveGuestBtn = document.getElementById("saveGuestBtn");
    if (saveGuestBtn) {
        saveGuestBtn.addEventListener("click", async () => {
            await saveGuest();
            clearGuestForm();
        });
    }

    // --- Date restrictions ---
    const today = new Date();
    if (checkInDate) checkInDate.min = today.toISOString().split("T")[0];

    const dateOfBirth = document.getElementById("dateOfBirth");
    if (dateOfBirth) dateOfBirth.max = today.toISOString().split("T")[0];

    // --- Filters with proper null checks ---
    const statusFilter = document.getElementById("statusFilter");
    const applyFilters = document.getElementById("applyFilters");
    const dateFrom = document.getElementById("dateFrom");
    const dateTo = document.getElementById("dateTo");

    // Trigger filterReservations on filter changes
    if (statusFilter) {
        statusFilter.addEventListener("change", filterReservations);
    }
    if (dateFrom) {
        dateFrom.addEventListener("change", filterReservations);
    }
    if (dateTo) {
        dateTo.addEventListener("change", filterReservations);
    }
    if (applyFilters) {
        applyFilters.addEventListener("click", filterReservations);
    }

    // Reset filters and reload all reservations on refresh
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            if (statusFilter) statusFilter.value = "";
            if (dateFrom) dateFrom.value = "";
            if (dateTo) dateTo.value = "";
            const searchInput = document.getElementById("searchReservation");
            if (searchInput) searchInput.value = "";
            displayReservations();
        });
    }

    // --- Search logic ---
    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("searchReservation");
    if (searchBtn) {
        searchBtn.addEventListener("click", filterReservations);
    }
    if (searchInput) {
        searchInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                filterReservations();
            }
        });
    }
});

// ==========================
// === RESERVATIONS TABLE ===
// ==========================
async function displayReservations(data) {
    // If data is provided, use it; otherwise fetch all
    if (data) {
        displayReservationsTable(data);
        return;
    }
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

    // Only show reservations where is_deleted is false/0/"0"/"FALSE"/"false"
    const filteredReservations = Array.isArray(reservations)
        ? reservations.filter(r =>
            !r.is_deleted ||
            r.is_deleted === 0 ||
            r.is_deleted === "0" ||
            r.is_deleted === false ||
            r.is_deleted === "FALSE" ||
            r.is_deleted === "false"
        )
        : [];

    // --- Update stats overview ---
    updateReservationStatsOverview(filteredReservations);

    if (!filteredReservations.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No reservations found.</td></tr>`;
        return;
    }

    console.log("✅ Processing", filteredReservations.length, "reservations"); // DEBUG

    const totalReservationsEl = document.getElementById("totalReservations");
    if (totalReservationsEl) {
        totalReservationsEl.textContent = filteredReservations.length;
    }

    filteredReservations.forEach((res, index) => {
        // Format check-in and check-out time to 12-hour format with AM/PM
        function format12Hour(timeStr) {
            if (!timeStr) return "";
            const [h, m] = timeStr.split(":");
            let hour = parseInt(h, 10);
            const minute = m ? m.padStart(2, "0") : "00";
            const ampm = hour >= 12 ? "PM" : "AM";
            hour = hour % 12;
            if (hour === 0) hour = 12;
            return `${hour}:${minute} ${ampm}`;
        }

        const checkInTime12 = res.check_in_time ? format12Hour(res.check_in_time) : "";
        const checkOutTime12 = res.check_out_time ? format12Hour(res.check_out_time) : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${res.reservation_id || 'N/A'}</td>
        <td>${res.guest_name || (res.first_name && res.last_name ? res.first_name + ' ' + res.last_name : 'No Name')}</td>
        <td>${res.type_name ? `${res.type_name} (${res.room_number || ''})` : (res.room_number || 'No Room')}</td>
        <td>${res.check_in_date || 'N/A'}${checkInTime12 ? " " + checkInTime12 : ""}</td>
        <td>${res.check_out_date || 'N/A'}${checkOutTime12 ? " " + checkOutTime12 : ""}</td>
        <td>${getStatusBadge(res.reservation_status || res.room_status || 'pending')}</td>
        <td>
            <i class="fas fa-edit action-icon text-primary" data-action="edit" data-id="${res.reservation_id}" title="Edit" style="cursor:pointer;"></i>
            <i class="fas fa-trash action-icon text-danger" data-action="delete" data-id="${res.reservation_id}" title="Delete" style="cursor:pointer;"></i>
        </td>
        `;
        tbody.appendChild(tr);

        // Edit
        const editIcon = tr.querySelector('.fa-edit[data-action="edit"]');
        if (editIcon) {
            editIcon.addEventListener("click", () => {
                // Pass the full reservation object for editing
                window.currentReservation = res; // for guest_id reference in modal
                updateReservationModal(res, cachedRoomTypes, cachedStatuses, displayReservations);
            });
        }
        // Delete
        const deleteIcon = tr.querySelector('.fa-trash[data-action="delete"]');
        if (deleteIcon) {
            deleteIcon.addEventListener("click", () => {
                deleteReservationModal(res.reservation_id, displayReservations);
            });
        }
        // Remove check-in/check-out icons and logic
    });

    console.log("✅ Successfully rendered", reservations.length, "reservations"); // DEBUG
}

function getStatusBadge(status) {
    status = (status || '').toLowerCase();
    if (status === 'checked-in')
        return `<span class="badge" style="background:#28a745;color:#fff;">${status}</span>`;
    if (status === 'checked-out')
        return `<span class="badge" style="background:#6c757d;color:#fff;">${status}</span>`;
    if (status === 'reserved' || status === 'confirmed')
        return `<span class="badge" style="background:#0dcaf0;color:#fff;">${status}</span>`;
    if (status === 'pending')
        return `<span class="badge" style="background:#ffc107;color:#212529;border:1px solid #ffc107;">${status}</span>`;
    if (status === 'cancelled')
        return `<span class="badge" style="background:#dc3545;color:#fff;">${status}</span>`;
    return `<span class="badge bg-info">${status}</span>`;
}

// ==========================
// === RESERVATION MODAL ====
// ==========================
function clearReservationForm() {
    const form = document.getElementById("reservationForm");
    if (form) form.reset();

    const setFieldValue = (id, value) => {
        const field = document.getElementById(id);
        if (field) field.value = value || "";
    };

    setFieldValue("reservationId", "");
    setFieldValue("checkInTime", "14:00");

    const modalLabel = document.getElementById("reservationModalLabel");
    if (modalLabel) {
        modalLabel.textContent = "Add New Reservation";
    }

    updateCheckoutDate();

    const roomSelect = document.getElementById("roomSelect");
    if (roomSelect) {
        roomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
    }

    setFieldValue("roomTypeSelect", "");
    updateAvailableRooms();
    loadIDTypes();
}

function updateCheckoutDate() {
    const checkInDate = document.getElementById("checkInDate");
    const checkInTime = document.getElementById("checkInTime");
    const checkOutDate = document.getElementById("checkOutDate");
    const checkOutTime = document.getElementById("checkOutTime");

    if (!checkInDate || !checkOutDate) return;

    const checkIn = checkInDate.value;
    const checkInTimeValue = checkInTime ? (checkInTime.value || "14:00") : "14:00";

    if (checkIn && checkInTimeValue) {
        const dt = new Date(`${checkIn}T${checkInTimeValue}:00+08:00`);
        dt.setHours(dt.getHours() + 24);
        const manilaDate = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const manilaTime = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' });

        checkOutDate.value = manilaDate;
        checkOutDate.readOnly = true;

        if (checkOutTime) {
            checkOutTime.value = manilaTime;
            checkOutTime.readOnly = true;
        }
    } else {
        checkOutDate.value = "";
        if (checkOutTime) checkOutTime.value = "";
    }
}

// ==========================
// === ROOMS & ROOM TYPES ====
// ==========================
async function loadRoomTypes() {
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
    const roomTypeSelect = document.getElementById("roomTypeSelect");
    const roomSelect = document.getElementById("roomSelect");
    const checkInDate = document.getElementById("checkInDate");
    const checkOutDate = document.getElementById("checkOutDate");

    if (!roomSelect) return;

    roomSelect.innerHTML = `<option value="">-- Select Room --</option>`;

    const roomTypeId = roomTypeSelect ? roomTypeSelect.value : "";
    const checkInDateValue = checkInDate ? checkInDate.value : "";
    const checkOutDateValue = checkOutDate ? checkOutDate.value : "";

    // Defensive: Only fetch if all required fields are present
    if (!roomTypeId) {
        roomSelect.innerHTML = `<option value="">Select a room type first</option>`;
        return;
    }
    if (!checkInDateValue || !checkOutDateValue) {
        roomSelect.innerHTML = `<option value="">Select check-in and check-out date</option>`;
        return;
    }

    try {
        roomSelect.innerHTML = `<option value="">Loading available rooms...</option>`;

        const reservationId = document.getElementById("reservationId");
        const params = {
            operation: "getAvailableRooms",
            room_type_id: roomTypeId,
            check_in_date: checkInDateValue,
            check_out_date: checkOutDateValue
        };
        if (reservationId && reservationId.value) {
            params.reservation_id = reservationId.value;
        }

        // Always expect an array from API, fallback to []
        const response = await axios.get(`${BASE_URL}/rooms/rooms.php`, { params });
        roomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
        let rooms = [];
        if (Array.isArray(response.data)) {
            rooms = response.data;
        } else if (response.data && typeof response.data === 'object') {
            rooms = Object.values(response.data);
        }
        // Only show available rooms for this type
        if (!rooms.length) {
            roomSelect.innerHTML = `<option value="">No available rooms for this type</option>`;
            return;
        }
        cachedRooms = rooms;
        rooms.forEach(room => {
            const option = document.createElement("option");
            option.value = room.room_id;
            option.textContent = `${room.room_number} (${room.type_name || 'Room'})`;
            roomSelect.appendChild(option);
        });
        // Show summary at the bottom
        const typeName = cachedRoomTypes.find(t => t.room_type_id == roomTypeId)?.type_name || 'room';
        roomSelect.innerHTML += `<option disabled>───────────────</option>`;
        roomSelect.innerHTML += `<option disabled>${rooms.length} ${typeName} room(s) available</option>`;
    } catch (error) {
        console.error("Failed to load available rooms:", error);
        roomSelect.innerHTML = `<option value="">Error loading rooms: ${error.message}</option>`;
    }
}

// ==========================
// === GUESTS ===============
// ==========================
async function loadGuests() {
    const select = document.getElementById("guestSelect");
    if (!select) {
        console.warn("guestSelect element not found, skipping loadGuests");
        return;
    }

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
    } catch (error) {
        console.error("Failed to load guests:", error);
        showError("Failed to load guests.");
    }
}

function filterGuestDropdown(query) {
    const select = document.getElementById("guestSelect");
    if (!select || !cachedGuests || !cachedGuests.length) return;

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
    const form = document.getElementById("guestForm");
    if (form) form.reset();

    const guestId = document.getElementById("guestId");
    if (guestId) guestId.value = "";

    const dateOfBirth = document.getElementById("dateOfBirth");
    if (dateOfBirth) {
        const today = new Date();
        dateOfBirth.max = today.toISOString().split("T")[0];
    }
}

async function saveGuest() {
    const getFieldValue = (id) => {
        const field = document.getElementById(id);
        return field ? field.value : "";
    };

    const firstName = getFieldValue("firstName");
    const lastName = getFieldValue("lastName");
    const middleName = getFieldValue("middleName");
    const suffix = getFieldValue("suffix");
    const dateOfBirth = getFieldValue("dateOfBirth");
    const email = getFieldValue("email");
    const phone = getFieldValue("phone");
    const idType = getFieldValue("idType");
    const idNumber = getFieldValue("idNumber");

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
    } catch (error) {
        console.error("Failed to fetch ID types:", error);
    }

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

    try {
        const response = await axios.post(`${BASE_URL}/guests/guests.php`, formData);
        if (response.data == 1) {
            loadGuests();
            showSuccess("Guest added!");
        } else {
            showError("Failed to add guest.");
        }
    } catch (error) {
        console.error("Failed to save guest:", error);
        showError("Failed to add guest.");
    }
}

// ==========================
// === RESERVATION STATUS ====
// ==========================
async function loadStatuses() {
    const select = document.getElementById("statusSelect");
    if (!select) {
        console.warn("statusSelect element not found, skipping loadStatuses");
        return;
    }

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
        showError("Failed to load reservation statuses.");
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
        console.error("Error in upsertReservedRoom, fallback to saveReservedRoom:", err);
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
    try {
        await axios.post(`${BASE_URL}/reservations/reserved_rooms.php`, formData);
    } catch (error) {
        console.error("Error saving reserved room:", error);
    }
}

// ==========================
// === SAVE RESERVATION =====
// ==========================
async function saveReservation() {
    // Disable save button to prevent multiple submissions
    const saveBtn = document.getElementById("saveReservationBtn");
    if (saveBtn) saveBtn.disabled = true;
    // Defensive get value
    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : "";
    }

    // Use hidden guestSelectId if present
    let guestId = document.getElementById("guestSelectId")?.value || getVal("guestSelect");

    const reservationId = getVal("reservationId");

    // Guest fields
    const firstName = getVal("firstName");
    const lastName = getVal("lastName");
    const middleName = getVal("middleName");
    const suffix = getVal("suffix");
    const dateOfBirth = getVal("dateOfBirth");
    const email = getVal("email");
    const phone = getVal("phone");
    const idType = getVal("idType");
    const idNumber = getVal("idNumber");
    const checkInDate = getVal("checkInDate");
    const checkInTime = getVal("checkInTime") || "14:00";
    const checkOutDate = getVal("checkOutDate");
    const checkOutTime = getVal("checkOutTime") || checkInTime;
    const roomTypeId = getVal("roomTypeSelect");
    const roomId = getVal("roomSelect");
    const statusId = getVal("statusSelect");

    // Validation
    if (!firstName || !lastName || !dateOfBirth || !email || !phone || !idType || !idNumber || !checkInDate || !checkInTime || !roomTypeId || !roomId || !statusId) {
        showError("Please fill in all required fields.");
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    // Check-in date must be today or future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    if (checkIn < today) {
        showError("Check-in date cannot be before today.");
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    // --- Prevent double booking for the same guest in the same check-in/check-out date/time ---
    try {
        const resList = await axios.get(`${BASE_URL}/reservations/reservations.php`, {
            params: { operation: "getAllReservations" }
        });
        if (Array.isArray(resList.data)) {
            const overlap = resList.data.find(r =>
                r.guest_id == guestId &&
                r.reservation_id != reservationId && // allow update of self
                r.is_deleted != 1 &&
                // Overlap logic: (existing.check_in < new.check_out && existing.check_out > new.check_in)
                (
                    (r.check_in_date < checkOutDate && r.check_out_date > checkInDate) ||
                    (r.check_in_date === checkInDate && r.check_in_time === checkInTime)
                )
            );
            if (overlap) {
                showError("This guest already has a reservation that overlaps with the selected check-in/check-out date and time.");
                if (saveBtn) saveBtn.disabled = false;
                return;
            }
        }
    } catch (err) {
        // If API fails, allow reservation (fail open)
    }

    // Map id_type to guest_idtype_id
    let guest_idtype_id = null;
    try {
        const idTypesRes = await axios.get(`${BASE_URL}/guests/id_types.php`, { params: { operation: "getAllIDTypes" } });
        const idTypes = idTypesRes.data || [];
        const found = idTypes.find(t => t.id_type === idType);
        guest_idtype_id = found ? found.guest_idtype_id : null;
    } catch (error) {
        guest_idtype_id = null;
    }

    // If guestId is not selected, create guest first
    if (!guestId) {
        const guestData = {
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

        const guestForm = new FormData();
        guestForm.append("operation", "insertGuest");
        guestForm.append("json", JSON.stringify(guestData));

        try {
            const guestRes = await axios.post(`${BASE_URL}/guests/guests.php`, guestForm);
            // Accept both {guest_id: ...} and numeric guest_id
            if (guestRes.data && typeof guestRes.data === 'object' && guestRes.data.guest_id) {
                guestId = guestRes.data.guest_id;
            } else if (guestRes.data && !isNaN(guestRes.data) && Number(guestRes.data) > 0) {
                // fallback: fetch latest guest by email
                const guestsList = await axios.get(`${BASE_URL}/guests/guests.php`, { params: { operation: "getAllGuests" } });
                if (Array.isArray(guestsList.data)) {
                    const found = guestsList.data.find(g => g.email === email);
                    guestId = found ? found.guest_id : null;
                }
            }
            if (!guestId) {
                showError("Failed to save guest. Please check guest info.");
                if (saveBtn) saveBtn.disabled = false;
                return;
            }
        } catch (err) {
            console.error("Error saving guest:", err);
            showError("Failed to save guest. Please check guest info.");
            if (saveBtn) saveBtn.disabled = false;
            return;
        }
    }
    // If guestId is selected, do NOT add a new guest, just use the selected guestId

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
                    console.error("[Billing Debug] Error fetching new reservation ID:", error);
                }
            }

            // Always update ReservedRoom for this reservation
            await upsertReservedRoom(newReservationId, roomId);

            // --- AUTO-CREATE BILLING AFTER RESERVATION INSERT ---
            if (!reservationId && newReservationId) {
                try {
                    console.log("[Billing Debug] Checking for existing billing for reservation_id:", newReservationId);
                    const billingRes = await axios.get(`${BASE_URL}/billing/billing.php`, {
                        params: { operation: "getBillingByReservation", reservation_id: newReservationId }
                    });
                    console.log("[Billing Debug] Billing API getBillingByReservation response:", billingRes.data);

                    let billingExists = false;
                    if (billingRes.data && typeof billingRes.data === "object") {
                        // If object with keys, treat as exists
                        if (Array.isArray(billingRes.data)) {
                            billingExists = billingRes.data.length > 0;
                        } else {
                            billingExists = Object.keys(billingRes.data).length > 0;
                        }
                    }

                    if (!billingExists) {
                        // No billing exists, create one
                        // Default billing_status_id: 1 (unpaid), total_amount: 0, billing_date: use checkOutDate or today
                        const billingData = {
                            reservation_id: newReservationId,
                            billing_status_id: 1, // unpaid
                            total_amount: 0,
                            billing_date: checkOutDate || (new Date().toISOString().split("T")[0])
                        };
                        console.log("[Billing Debug] Inserting billing with data:", billingData);

                        const billingForm = new FormData();
                        billingForm.append("operation", "insertBilling");
                        billingForm.append("json", JSON.stringify(billingData));
                        const billingInsertRes = await axios.post(`${BASE_URL}/billing/billing.php`, billingForm);

                        console.log("[Billing Debug] Billing insert response:", billingInsertRes.data);

                        if (billingInsertRes.data != 1) {
                            console.error("[Billing Debug] Billing insert failed, API response:", billingInsertRes.data);
                            showError("Failed to auto-create billing for reservation. Please check the Billing API.");
                        }
                    } else {
                        console.log("[Billing Debug] Billing already exists for reservation_id:", newReservationId);
                    }
                } catch (err) {
                    console.error("[Billing Debug] Failed to auto-create billing for reservation:", err);
                    showError("Failed to auto-create billing for reservation. See console for details.");
                }
            }
            // --- END AUTO-CREATE BILLING ---

            displayReservations();

            const modal = document.getElementById("reservationModal");
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
            }

            showSuccess("Reservation saved!");
        } else {
            showError("Failed to save reservation.");
        }
    } catch (error) {
        console.error("Error saving reservation:", error);
        showError("An error occurred while saving the reservation.");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// ==========================
// === ROOM STATUS HELPERS ===
// ==========================
async function setRoomOccupied(roomId) {
    try {
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
    } catch (error) {
        console.error("Error setting room occupied:", error);
        return false;
    }
}

async function setRoomAvailable(roomId) {
    try {
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
    } catch (error) {
        console.error("Error setting room available:", error);
        return false;
    }
}

async function getRoomStatusIdByName(statusName) {
    try {
        const response = await axios.get(`${BASE_URL}/rooms/rooms.php`, {
            params: { operation: "getAllRoomStatus" }
        });
        if (Array.isArray(response.data)) {
            const found = response.data.find(s => s.room_status === statusName);
            return found ? found.room_status_id : null;
        }
        return null;
    } catch (error) {
        console.error("Error getting room status ID:", error);
        return null;
    }
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

// Dynamically load ID Types from API for the Add Reservation modal
async function loadIDTypes() {
    const select = document.getElementById("idType");
    if (!select) return;
    select.innerHTML = `<option value="">-- Select ID Type --</option>`;
    try {
        const response = await axios.get(`${BASE_URL}/guests/id_types.php`, {
            params: { operation: "getAllIDTypes" }
        });
        const idTypes = Array.isArray(response.data) ? response.data : [];
        idTypes.forEach(type => {
            const option = document.createElement("option");
            option.value = type.id_type;
            option.textContent = type.id_type;
            select.appendChild(option);
        });
    } catch (error) {
        // fallback: keep only the placeholder
    }
}

async function filterReservations() {
    const status = document.getElementById("statusFilter")?.value || "";
    const dateFrom = document.getElementById("dateFrom")?.value || ""; // check-in date
    const dateTo = document.getElementById("dateTo")?.value || "";     // check-out date
    const search = document.getElementById("searchReservation")?.value.trim() || "";

    let url = "/Hotel-Reservation-Billing-System/api/admin/reservations/reservations.php?operation=getAllReservations";
    const params = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (dateFrom) params.push(`date_from=${encodeURIComponent(dateFrom)}`);
    if (dateTo) params.push(`date_to=${encodeURIComponent(dateTo)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += "&" + params.join("&");

    try {
        const response = await axios.get(url);
        let reservations = response.data || [];

        // --- Filter by check-in and check-out date ---
        reservations = reservations.filter(r => {
            const checkIn = r.check_in_date;
            const checkOut = r.check_out_date;
            if (!checkIn || !checkOut) return false;
            // If both dates are set: check_in_date >= dateFrom AND check_out_date <= dateTo
            if (dateFrom && dateTo) {
                return checkIn >= dateFrom && checkOut <= dateTo;
            }
            // Only check-in date set
            if (dateFrom) {
                return checkIn >= dateFrom;
            }
            // Only check-out date set
            if (dateTo) {
                return checkOut <= dateTo;
            }
            return true;
        });

        displayReservationsTable(reservations);
    } catch (error) {
        displayReservationsTable([]);
    }
}

// --- Reservation Stats Overview ---
function updateReservationStatsOverview(reservations) {
    // Defensive: always use array
    reservations = Array.isArray(reservations) ? reservations : [];
    let total = reservations.length;
    let checkedIn = 0, checkedOut = 0, reserved = 0, pending = 0, cancelled = 0;
    reservations.forEach(r => {
        const status = (r.reservation_status || r.room_status || '').toLowerCase();
        if (status === "checked-in") checkedIn++;
        else if (status === "checked-out") checkedOut++;
        else if (status === "confirmed") reserved++;
        else if (status === "pending") pending++;
        else if (status === "cancelled") cancelled++;
    });
    document.getElementById("statTotalReservations").textContent = total;
    document.getElementById("statCheckedIn").textContent = checkedIn;
    document.getElementById("statCheckedOut").textContent = checkedOut;
    document.getElementById("statReserved").textContent = reserved;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statCancelled").textContent = cancelled;
}
