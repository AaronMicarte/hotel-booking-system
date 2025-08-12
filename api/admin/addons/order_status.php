<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class AddonOrderStatus
{
    function getAllOrderStatuses()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT * FROM AddonOrderStatus WHERE is_deleted = 0 ORDER BY order_status_id";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertOrderStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "INSERT INTO AddonOrderStatus (order_status_name) VALUES (:order_status_name)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":order_status_name", $json['order_status_name']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }
        echo json_encode($returnValue);
    }

    function getOrderStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT * FROM AddonOrderStatus WHERE order_status_id = :order_status_id AND is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":order_status_id", $json['order_status_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateOrderStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE AddonOrderStatus SET order_status_name = :order_status_name WHERE order_status_id = :order_status_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":order_status_name", $json['order_status_name']);
        $stmt->bindParam(":order_status_id", $json['order_status_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteOrderStatus($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE AddonOrderStatus SET is_deleted = 1 WHERE order_status_id = :order_status_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":order_status_id", $json['order_status_id']);
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
        if (isset($_GET['order_status_id'])) {
            $operation = 'getOrderStatus';
            $json = json_encode(['order_status_id' => $_GET['order_status_id']]);
        } else {
            $operation = 'getAllOrderStatuses';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$orderStatus = new AddonOrderStatus();
switch ($operation) {
    case "getAllOrderStatuses":
        $orderStatus->getAllOrderStatuses();
        break;
    case "insertOrderStatus":
        $orderStatus->insertOrderStatus($json);
        break;
    case "getOrderStatus":
        $orderStatus->getOrderStatus($json);
        break;
    case "updateOrderStatus":
        $orderStatus->updateOrderStatus($json);
        break;
    case "deleteOrderStatus":
        $orderStatus->deleteOrderStatus($json);
        break;
}
