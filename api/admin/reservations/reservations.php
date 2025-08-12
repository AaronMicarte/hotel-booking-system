<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class Reservation
{
    function getAllReservations()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        // Get query parameters
        $statusFilter = isset($_GET['status']) ? $_GET['status'] : null;
        $dateFrom = isset($_GET['dateFrom']) ? $_GET['dateFrom'] : null;
        $dateTo = isset($_GET['dateTo']) ? $_GET['dateTo'] : null;
        $search = isset($_GET['search']) ? $_GET['search'] : null;


        $sql = "SELECT res.*, 
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       g.guest_id,
                       rs.reservation_status AS reservation_status,
                       rs.reservation_status_id,
                       r.room_number,
                       rt.type_name,
                       r.room_id,
                       rt.room_type_id
                FROM Reservation res
                LEFT JOIN Guest g ON res.guest_id = g.guest_id
                LEFT JOIN ReservationStatus rs ON res.reservation_status_id = rs.reservation_status_id
                LEFT JOIN ReservedRoom rr ON res.reservation_id = rr.reservation_id AND rr.is_deleted = 0
                LEFT JOIN Room r ON rr.room_id = r.room_id
                LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id
                WHERE res.is_deleted = 0";

        // Apply filters
        $params = array();
        if ($statusFilter) {
            $sql .= " AND rs.reservation_status = :status";
            $params[':status'] = $statusFilter;
        }
        if ($dateFrom) {
            $sql .= " AND res.check_in_date >= :dateFrom";
            $params[':dateFrom'] = $dateFrom;
        }
        if ($dateTo) {
            $sql .= " AND res.check_in_date <= :dateTo";
            $params[':dateTo'] = $dateTo;
        }
        if ($search) {
            $sql .= " AND (res.reservation_id LIKE :search 
                          OR CONCAT(g.first_name, ' ', g.last_name) LIKE :search 
                          OR rs.reservation_status LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $sql .= " ORDER BY res.reservation_id DESC";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fix: Always return an array, never null/false
        if (!$reservations) $reservations = [];

        echo json_encode($reservations);
    }

    function getReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "SELECT r.*, 
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       u.username AS created_by,
                       rs.room_status AS reservation_status
                FROM Reservation r
                LEFT JOIN Guest g ON r.guest_id = g.guest_id
                LEFT JOIN User u ON r.user_id = u.user_id
                LEFT JOIN ReservationStatus rs ON r.reservation_status_id = rs.reservation_status_id
                WHERE r.reservation_id = :reservation_id AND r.is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "INSERT INTO Reservation (user_id, reservation_status_id, guest_id, check_in_date, check_out_date)
                VALUES (:user_id, :reservation_status_id, :guest_id, :check_in_date, :check_out_date)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $json['user_id']);
        $stmt->bindParam(':reservation_status_id', $json['reservation_status_id']);
        $stmt->bindParam(':guest_id', $json['guest_id']);
        $stmt->bindParam(':check_in_date', $json['check_in_date']);
        $stmt->bindParam(':check_out_date', $json['check_out_date']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
            $reservationId = $db->lastInsertId();
            // Always insert into ReservedRoom if room_id is provided and not already reserved for this reservation
            if (!empty($json['room_id'])) {
                $sqlCheck = "SELECT COUNT(*) FROM ReservedRoom WHERE reservation_id = :reservation_id AND room_id = :room_id AND is_deleted = 0";
                $stmtCheck = $db->prepare($sqlCheck);
                $stmtCheck->bindParam(':reservation_id', $reservationId);
                $stmtCheck->bindParam(':room_id', $json['room_id']);
                $stmtCheck->execute();
                $exists = $stmtCheck->fetchColumn();
                if (!$exists) {
                    $sql2 = "INSERT INTO ReservedRoom (reservation_id, room_id) VALUES (:reservation_id, :room_id)";
                    $stmt2 = $db->prepare($sql2);
                    $stmt2->bindParam(':reservation_id', $reservationId);
                    $stmt2->bindParam(':room_id', $json['room_id']);
                    $stmt2->execute();
                }
            }
            // Update the room status to reserved
            $this->updateRoomStatus($json['room_id'], 4); // 4 = reserved
        }
        echo json_encode($returnValue);
    }

    function updateReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        // First, get the current room_id if any
        $sql = "SELECT rr.room_id 
                FROM ReservedRoom rr 
                WHERE rr.reservation_id = :reservation_id AND rr.is_deleted = 0
                LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->execute();
        $oldRoomId = $stmt->fetch(PDO::FETCH_COLUMN);

        // Update reservation
        $sql = "UPDATE Reservation 
                SET guest_id = :guest_id, 
                    check_in_date = :check_in_date, 
                    check_out_date = :check_out_date, 
                    reservation_status_id = :reservation_status_id
                WHERE reservation_id = :reservation_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_id", $json['guest_id']);
        $stmt->bindParam(":check_in_date", $json['check_in_date']);
        $stmt->bindParam(":check_out_date", $json['check_out_date']);
        $stmt->bindParam(":reservation_status_id", $json['reservation_status_id']);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0 || $oldRoomId != $json['room_id']) {
            $returnValue = 1;

            // If room has changed, update ReservedRoom
            if ($oldRoomId != $json['room_id']) {
                // Update old room status to available
                if ($oldRoomId) {
                    $this->updateRoomStatus($oldRoomId, 1); // 1 = available

                    // Mark old reservation as deleted
                    $sql = "UPDATE ReservedRoom SET is_deleted = 1 
                            WHERE reservation_id = :reservation_id AND room_id = :room_id";
                    $stmt = $db->prepare($sql);
                    $stmt->bindParam(":reservation_id", $json['reservation_id']);
                    $stmt->bindParam(":room_id", $oldRoomId);
                    $stmt->execute();
                }

                // Insert new ReservedRoom record
                $sql = "INSERT INTO ReservedRoom (reservation_id, room_id)
                        VALUES (:reservation_id, :room_id)";
                $stmt = $db->prepare($sql);
                $stmt->bindParam(":reservation_id", $json['reservation_id']);
                $stmt->bindParam(":room_id", $json['room_id']);
                $stmt->execute();

                // Update new room status based on reservation status
                $roomStatusId = 4; // Default to reserved (4)

                // If checked-in, mark as occupied
                if ($json['reservation_status_id'] == 3) {
                    $roomStatusId = 2; // 2 = occupied
                } else if ($json['reservation_status_id'] == 4 || $json['reservation_status_id'] == 5) {
                    $roomStatusId = 1; // 1 = available for checked-out or cancelled
                }

                $this->updateRoomStatus($json['room_id'], $roomStatusId);
            } else {
                // Room hasn't changed, but status might have - update room status accordingly
                $roomStatusId = 4; // Default to reserved (4)

                // If checked-in, mark as occupied
                if ($json['reservation_status_id'] == 3) {
                    $roomStatusId = 2; // 2 = occupied
                } else if ($json['reservation_status_id'] == 4 || $json['reservation_status_id'] == 5) {
                    $roomStatusId = 1; // 1 = available for checked-out or cancelled
                }

                $this->updateRoomStatus($json['room_id'], $roomStatusId);
            }
        }
        echo json_encode($returnValue);
    }

    function getAllStatuses()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT * FROM ReservationStatus WHERE is_deleted = 0 ORDER BY reservation_status_id";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($statuses);
    }

    // Helper function to update room status
    private function updateRoomStatus($roomId, $statusId)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "UPDATE Room SET room_status_id = :status_id WHERE room_id = :room_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":room_id", $roomId);
        $stmt->bindParam(":status_id", $statusId);
        return $stmt->execute();
    }

    // Method to delete a reservation (soft delete)
    function deleteReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $reservationId = $json['reservation_id'];

        // Soft delete the reservation
        $sql = "UPDATE Reservation SET is_deleted = 1 WHERE reservation_id = :reservation_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $reservationId);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;

            // Also mark ReservedRoom as deleted and update room status to available
            $sql = "SELECT room_id FROM ReservedRoom WHERE reservation_id = :reservation_id AND is_deleted = 0";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(":reservation_id", $reservationId);
            $stmt->execute();
            $roomIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Mark ReservedRoom as deleted
            $sql = "UPDATE ReservedRoom SET is_deleted = 1 WHERE reservation_id = :reservation_id";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(":reservation_id", $reservationId);
            $stmt->execute();

            // Update room status to available
            foreach ($roomIds as $roomId) {
                $this->updateRoomStatus($roomId, 1); // 1 = available
            }
        }
        echo json_encode($returnValue);
    }
}

// --- Unified request handling (like SIR MAC) ---
$operation = '';
$json = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';
    if (!$operation) {
        if (isset($_GET['reservation_id'])) {
            $operation = 'getReservation';
            $json = json_encode(['reservation_id' => $_GET['reservation_id']]);
        } else {
            $operation = 'getAllReservations';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$reservation = new Reservation();
switch ($operation) {
    case "getAllReservations":
        $reservation->getAllReservations();
        break;
    case "insertReservation":
        $reservation->insertReservation($json);
        break;
    case "getReservation":
        $reservation->getReservation($json);
        break;
    case "updateReservation":
        $reservation->updateReservation($json);
        break;
    case "deleteReservation":
        $reservation->deleteReservation($json);
        break;
}
