<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class Billing
{
    function getAllBillings()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT b.*, 
                       r.reservation_id, 
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       bs.billing_status
                FROM Billing b
                LEFT JOIN Reservation r ON b.reservation_id = r.reservation_id
                LEFT JOIN Guest g ON r.guest_id = g.guest_id
                LEFT JOIN BillingStatus bs ON b.billing_status_id = bs.billing_status_id
                WHERE b.is_deleted = 0
                ORDER BY b.billing_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "INSERT INTO Billing (reservation_id, billing_status_id, total_amount, billing_date)
                VALUES (:reservation_id, :billing_status_id, :total_amount, :billing_date)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->bindParam(":billing_status_id", $json['billing_status_id']);
        $stmt->bindParam(":total_amount", $json['total_amount']);
        $stmt->bindParam(":billing_date", $json['billing_date']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }
        echo json_encode($returnValue);
    }

    function getBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT b.*, 
                       r.reservation_id, 
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       bs.billing_status
                FROM Billing b
                LEFT JOIN Reservation r ON b.reservation_id = r.reservation_id
                LEFT JOIN Guest g ON r.guest_id = g.guest_id
                LEFT JOIN BillingStatus bs ON b.billing_status_id = bs.billing_status_id
                WHERE b.billing_id = :billing_id AND b.is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":billing_id", $json['billing_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE Billing 
                SET reservation_id = :reservation_id,
                    billing_status_id = :billing_status_id,
                    total_amount = :total_amount,
                    billing_date = :billing_date
                WHERE billing_id = :billing_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->bindParam(":billing_status_id", $json['billing_status_id']);
        $stmt->bindParam(":total_amount", $json['total_amount']);
        $stmt->bindParam(":billing_date", $json['billing_date']);
        $stmt->bindParam(":billing_id", $json['billing_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE Billing SET is_deleted = 1 WHERE billing_id = :billing_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":billing_id", $json['billing_id']);
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
        if (isset($_GET['billing_id'])) {
            $operation = 'getBilling';
            $json = json_encode(['billing_id' => $_GET['billing_id']]);
        } else {
            $operation = 'getAllBillings';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$billing = new Billing();
switch ($operation) {
    case "getAllBillings":
        $billing->getAllBillings();
        break;
    case "insertBilling":
        $billing->insertBilling($json);
        break;
    case "getBilling":
        $billing->getBilling($json);
        break;
    case "updateBilling":
        $billing->updateBilling($json);
        break;
    case "deleteBilling":
        $billing->deleteBilling($json);
        break;
}
