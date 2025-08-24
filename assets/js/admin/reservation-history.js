document.addEventListener("DOMContentLoaded", async () => {
    // Log user id on reservation history page load
    let userId = null;
    try {
        const userStr = sessionStorage.getItem('admin_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user && user.user_id) {
                userId = user.user_id;
                console.log("[RESERVATION HISTORY] Current session user_id:", userId);
            }
        }
    } catch (e) {
    }

    const tbody = document.getElementById("historyTableBody");
    const infoDiv = document.getElementById("historyInfo");
    const searchInput = document.getElementById("historySearchInput");

    let allHistory = [];

    async function fetchAllHistory() {
        try {
            // Fetch all reservation status histories with reservation, guest, and room info
            const resp = await axios.get("/Hotel-Reservation-Billing-System/api/admin/reservations/reservations.php", {
                params: { operation: "getAllReservationStatusHistory" }
            });
            console.log("[RESERVATION HISTORY] API response:", resp.data);
            allHistory = Array.isArray(resp.data) ? resp.data : [];
            renderTable(allHistory);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load history.</td></tr>`;
        }
    }

    function renderTable(data) {
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">No status history found.</td></tr>`;
            return;
        }
        tbody.innerHTML = "";
        data.forEach(h => {
            // User icon and info
            let userHtml = '';
            if (h.username) {
                userHtml = `<i class="fas fa-user-circle me-1 text-primary"></i> <span>${h.username}</span>`;
            } else if (h.changed_by_user_id) {
                userHtml = `<i class="fas fa-user-circle me-1 text-secondary"></i> <span>User #${h.changed_by_user_id}</span>`;
            } else {
                userHtml = `<i class="fas fa-robot me-1 text-muted"></i> <span>System</span>`;
            }
            // Room info (type + number)
            let roomInfo = '';
            if (h.type_name && h.room_number) {
                roomInfo = `${h.type_name} (${h.room_number})`;
            } else if (h.room_number) {
                roomInfo = h.room_number;
            } else {
                roomInfo = '-';
            }
            // Status icon (refer to dashboard-stats.js)
            let status = (h.reservation_status || h.status_id || '').toString();
            let statusIcon = '<i class="fas fa-question-circle text-secondary"></i>';
            let statusText = status;
            if (status) {
                const s = status.toLowerCase();
                if (s === 'confirmed') statusIcon = '<i class="fas fa-check-circle text-info"></i>';
                else if (s === 'pending') statusIcon = '<i class="fas fa-hourglass-half text-warning"></i>';
                else if (s === 'checked-in') statusIcon = '<i class="fas fa-door-open text-success"></i>';
                else if (s === 'checked-out') statusIcon = '<i class="fas fa-sign-out-alt text-primary"></i>';
                else if (s === 'cancelled') statusIcon = '<i class="fas fa-times-circle text-danger"></i>';
            }
            // Role (always show, even if user missing)
            let role = h.user_role ? `<span class="text-muted small">${h.user_role}</span>` : `<span class="text-muted small">-</span>`;
            // Date (for filter)
            let changedAt = h.changed_at ? new Date(h.changed_at).toLocaleString() : '';
            tbody.innerHTML += `
                <tr>
                    <td>${h.reservation_id || ''}</td>
                    <td>${h.guest_name || ''}</td>
                    <td>${roomInfo}</td>
                    <td>${changedAt}</td>
                    <td>${statusIcon} ${statusText}</td>
                    <td>${userHtml}</td>
                    <td>${role}</td>
                </tr>
            `;
        });
    }

    // Use flatpickr for date pickers if available
    if (window.flatpickr) {
        flatpickr("#dateFrom", {
            dateFormat: "Y-m-d",
            allowInput: true,
            onChange: function (selectedDates, dateStr) {
                // Set minDate for dateTo
                const dateToPicker = document.getElementById("dateTo")._flatpickr;
                if (dateToPicker) {
                    dateToPicker.set("minDate", dateStr || null);
                }
                filterTable();
            }
        });
        flatpickr("#dateTo", {
            dateFormat: "Y-m-d",
            allowInput: true,
            onChange: function (selectedDates, dateStr) {
                // Set maxDate for dateFrom
                const dateFromPicker = document.getElementById("dateFrom")._flatpickr;
                if (dateFromPicker) {
                    dateFromPicker.set("maxDate", dateStr || null);
                }
                filterTable();
            }
        });
    } else {
        // Fallback: native date input
        document.getElementById("dateFrom")?.addEventListener("change", function () {
            // Set min for dateTo
            const dateTo = document.getElementById("dateTo");
            if (dateTo) dateTo.min = this.value;
            filterTable();
        });
        document.getElementById("dateTo")?.addEventListener("change", function () {
            // Set max for dateFrom
            const dateFrom = document.getElementById("dateFrom");
            if (dateFrom) dateFrom.max = this.value;
            filterTable();
        });
    }

    // Filter table by search and date
    function filterTable() {
        const q = (document.getElementById("historySearchInput")?.value || "").toLowerCase();
        const dateFrom = document.getElementById("dateFrom")?.value;
        const dateTo = document.getElementById("dateTo")?.value;
        let filtered = allHistory;
        if (q) {
            filtered = filtered.filter(h =>
                (h.reservation_id && h.reservation_id.toString().includes(q)) ||
                (h.guest_name && h.guest_name.toLowerCase().includes(q))
            );
        }
        if (dateFrom) {
            filtered = filtered.filter(h => h.changed_at && h.changed_at.slice(0, 10) >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(h => h.changed_at && h.changed_at.slice(0, 10) <= dateTo);
        }
        renderTable(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterTable);
    }
    document.getElementById("dateFrom")?.addEventListener("change", filterTable);
    document.getElementById("dateTo")?.addEventListener("change", filterTable);

    // Attach search input event (now possibly dynamically created)
    document.addEventListener("input", function (e) {
        if (e.target && e.target.id === "historySearchInput") {
            filterTable();
        }
    });

    await fetchAllHistory();
});
