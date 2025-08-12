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

        $sql = "SELECT r.*, 
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       u.username AS created_by,
                       rs.room_status AS reservation_status
                FROM Reservation r
                LEFT JOIN Guest g ON r.guest_id = g.guest_id
                LEFT JOIN User u ON r.user_id = u.user_id
                LEFT JOIN ReservationStatus rs ON r.reservation_status_id = rs.reservation_status_id
                WHERE r.is_deleted = 0
                ORDER BY r.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
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
        }
        echo json_encode($returnValue);
    }

    function updateReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "UPDATE Reservation 
                SET user_id = :user_id,
                    reservation_status_id = :reservation_status_id,
                    guest_id = :guest_id,
                    check_in_date = :check_in_date,
                    check_out_date = :check_out_date
                WHERE reservation_id = :reservation_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $json['user_id']);
        $stmt->bindParam(':reservation_status_id', $json['reservation_status_id']);
        $stmt->bindParam(':guest_id', $json['guest_id']);
        $stmt->bindParam(':check_in_date', $json['check_in_date']);
        $stmt->bindParam(':check_out_date', $json['check_out_date']);
        $stmt->bindParam(':reservation_id', $json['reservation_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "UPDATE Reservation SET is_deleted = 1 WHERE reservation_id = :reservation_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
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
