<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class AddonOrder
{
    function getAllOrders()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT ao.*, u.username, res.reservation_id, aos.order_status_name
                FROM AddonOrder ao
                LEFT JOIN User u ON ao.user_id = u.user_id
                LEFT JOIN Reservation res ON ao.reservation_id = res.reservation_id
                LEFT JOIN AddonOrderStatus aos ON ao.order_status_id = aos.order_status_id
                WHERE ao.is_deleted = 0
                ORDER BY ao.order_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertOrder($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "INSERT INTO AddonOrder (user_id, reservation_id, order_status_id, order_date)
                VALUES (:user_id, :reservation_id, :order_status_id, :order_date)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":user_id", $json['user_id']);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->bindParam(":order_status_id", $json['order_status_id']);
        $stmt->bindParam(":order_date", $json['order_date']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }
        echo json_encode($returnValue);
    }

    function getOrder($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT ao.*, u.username, res.reservation_id, aos.order_status_name
                FROM AddonOrder ao
                LEFT JOIN User u ON ao.user_id = u.user_id
                LEFT JOIN Reservation res ON ao.reservation_id = res.reservation_id
                LEFT JOIN AddonOrderStatus aos ON ao.order_status_id = aos.order_status_id
                WHERE ao.addon_order_id = :addon_order_id AND ao.is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":addon_order_id", $json['addon_order_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateOrder($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE AddonOrder 
                SET user_id = :user_id,
                    reservation_id = :reservation_id,
                    order_status_id = :order_status_id,
                    order_date = :order_date
                WHERE addon_order_id = :addon_order_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":user_id", $json['user_id']);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->bindParam(":order_status_id", $json['order_status_id']);
        $stmt->bindParam(":order_date", $json['order_date']);
        $stmt->bindParam(":addon_order_id", $json['addon_order_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteOrder($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE AddonOrder SET is_deleted = 1 WHERE addon_order_id = :addon_order_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":addon_order_id", $json['addon_order_id']);
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
        if (isset($_GET['addon_order_id'])) {
            $operation = 'getOrder';
            $json = json_encode(['addon_order_id' => $_GET['addon_order_id']]);
        } else {
            $operation = 'getAllOrders';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$order = new AddonOrder();
switch ($operation) {
    case "getAllOrders":
        $order->getAllOrders();
        break;
    case "insertOrder":
        $order->insertOrder($json);
        break;
    case "getOrder":
        $order->getOrder($json);
        break;
    case "updateOrder":
        $order->updateOrder($json);
        break;
    case "deleteOrder":
        $order->deleteOrder($json);
        break;
}
