<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class ReservationStatus
{
    function getAllStatuses()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT * FROM ReservationStatus WHERE is_deleted = 0 ORDER BY reservation_status_id";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "INSERT INTO ReservationStatus (reservation_status) VALUES (:reservation_status)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_status", $json['reservation_status']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }
        echo json_encode($returnValue);
    }

    function getStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT * FROM ReservationStatus WHERE reservation_status_id = :reservation_status_id AND is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_status_id", $json['reservation_status_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE ReservationStatus SET reservation_status = :reservation_status WHERE reservation_status_id = :reservation_status_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_status", $json['reservation_status']);
        $stmt->bindParam(":reservation_status_id", $json['reservation_status_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE ReservationStatus SET is_deleted = 1 WHERE reservation_status_id = :reservation_status_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_status_id", $json['reservation_status_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }
}

// Request handling
$operation = '';
$json = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';
    if (!$operation) {
        if (isset($_GET['reservation_status_id'])) {
            $operation = 'getStatus';
            $json = json_encode(['reservation_status_id' => $_GET['reservation_status_id']]);
        } else {
            $operation = 'getAllStatuses';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$resStatus = new ReservationStatus();
switch ($operation) {
    case "getAllStatuses":
        $resStatus->getAllStatuses();
        break;
    case "insertStatus":
        $resStatus->insertStatus($json);
        break;
    case "getStatus":
        $resStatus->getStatus($json);
        break;
    case "updateStatus":
        $resStatus->updateStatus($json);
        break;
    case "deleteStatus":
        $resStatus->deleteStatus($json);
        break;
}
