const baseApiUrl = "/Hotel-Reservation-Billing-System/api/admin/reservations/reservations.php";

document.addEventListener("DOMContentLoaded", () => {
    displayReservations();

    document.getElementById("refreshBtn").addEventListener("click", displayReservations);

    document.getElementById("addReservationBtn").addEventListener("click", () => {
        // Show modal for new reservation
        clearReservationForm();
        new bootstrap.Modal(document.getElementById("reservationModal")).show();
    });

    document.getElementById("saveReservationBtn").addEventListener("click", saveReservation);
});

async function displayReservations() {
    const response = await axios.get(baseApiUrl, {
        params: { operation: "getAllReservations" }
    });
    if (response.status === 200) {
        displayReservationsTable(response.data);
    } else {
        showError("Failed to load reservations.");
    }
}

function displayReservationsTable(reservations) {
    const tbody = document.getElementById("reservationsTableBody");
    tbody.innerHTML = "";
    if (!reservations.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No reservations found.</td></tr>`;
        return;
    }
    reservations.forEach(res => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${res.reservation_id}</td>
            <td>${res.guest_name || ""}</td>
            <td>${res.room_id || ""}</td>
            <td>${res.check_in_date || ""}</td>
            <td>${res.check_out_date || ""}</td>
            <td>${res.reservation_status || ""}</td>
            <td>
                <button class="btn btn-sm btn-primary btn-edit" data-id="${res.reservation_id}">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
        tr.querySelector(".btn-edit").addEventListener("click", () => editReservation(res));
    });
}

function editReservation(res) {
    // Fill modal with reservation data
    document.getElementById("reservationId").value = res.reservation_id;
    document.getElementById("guestSelect").value = res.guest_id || "";
    document.getElementById("checkInDate").value = res.check_in_date || "";
    document.getElementById("checkOutDate").value = res.check_out_date || "";
    document.getElementById("roomTypeSelect").value = res.room_type_id || "";
    document.getElementById("roomSelect").value = res.room_id || "";
    document.getElementById("statusSelect").value = res.reservation_status_id || "";

    new bootstrap.Modal(document.getElementById("reservationModal")).show();
}

function clearReservationForm() {
    document.getElementById("reservationForm").reset();
    document.getElementById("reservationId").value = "";
}

async function saveReservation() {
    const reservationId = document.getElementById("reservationId").value;
    const guestId = document.getElementById("guestSelect").value;
    const checkInDate = document.getElementById("checkInDate").value;
    const checkOutDate = document.getElementById("checkOutDate").value;
    const roomTypeId = document.getElementById("roomTypeSelect").value;
    const roomId = document.getElementById("roomSelect").value;
    const statusId = document.getElementById("statusSelect").value;

    const jsonData = {
        guest_id: guestId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        room_type_id: roomTypeId,
        room_id: roomId,
        reservation_status_id: statusId
    };
    let operation = "insertReservation";
    if (reservationId) {
        jsonData.reservation_id = reservationId;
        operation = "updateReservation";
    }

    const formData = new FormData();
    formData.append("operation", operation);
    formData.append("json", JSON.stringify(jsonData));

    const response = await axios.post(baseApiUrl, formData);
    if (response.data == 1) {
        displayReservations();
        bootstrap.Modal.getInstance(document.getElementById("reservationModal")).hide();
        showSuccess("Reservation saved!");
    } else {
        showError("Failed to save reservation.");
    }
}

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
