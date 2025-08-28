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

        $sql = "SELECT ao.*, u.username, res.reservation_id, aos.order_status_name,
                       g.first_name, g.last_name
                FROM AddonOrder ao
                LEFT JOIN User u ON ao.user_id = u.user_id
                LEFT JOIN Reservation res ON ao.reservation_id = res.reservation_id
                LEFT JOIN Guest g ON res.guest_id = g.guest_id
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

        try {
            // 1. Insert AddonOrder
            $user_id = isset($json['user_id']) ? $json['user_id'] : null;
            $reservation_id = $json['reservation_id'];
            $order_status_id = isset($json['order_status_id']) ? $json['order_status_id'] : 1; // default to 'pending'
            $order_date = isset($json['order_date']) ? $json['order_date'] : date('Y-m-d');
            $items = isset($json['items']) ? $json['items'] : [];

            $sql = "INSERT INTO AddonOrder (user_id, reservation_id, order_status_id, order_date)
                    VALUES (:user_id, :reservation_id, :order_status_id, :order_date)";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":reservation_id", $reservation_id);
            $stmt->bindParam(":order_status_id", $order_status_id);
            $stmt->bindParam(":order_date", $order_date);
            $stmt->execute();

            $addon_order_id = $db->lastInsertId();
            $success = $addon_order_id ? true : false;
            if (!$success) {
                echo json_encode(['success' => false, 'message' => 'Failed to create order record.']);
                return;
            }

            // 2. Insert AddonOrderItems
            if (is_array($items)) {
                foreach ($items as $item) {
                    $addon_id = $item['addon_id'];
                    $quantity = isset($item['quantity']) ? $item['quantity'] : 1;
                    for ($i = 0; $i < $quantity; $i++) {
                        $stmt2 = $db->prepare("INSERT INTO AddonOrderItem (addon_order_id, addon_id) VALUES (?, ?)");
                        $stmt2->execute([$addon_order_id, $addon_id]);
                    }
                }
            }

            // 3. Add to BillingAddon
            // Get billing_id for this reservation
            $stmt3 = $db->prepare("SELECT billing_id FROM Billing WHERE reservation_id = ? AND is_deleted = 0 LIMIT 1");
            $stmt3->execute([$reservation_id]);
            $billing = $stmt3->fetch(PDO::FETCH_ASSOC);
            if (!$billing) {
                echo json_encode(['success' => false, 'message' => 'No billing record found for this reservation.']);
                return;
            }
            $billing_id = $billing['billing_id'];
            foreach ($items as $item) {
                $addon_id = $item['addon_id'];
                $quantity = isset($item['quantity']) ? $item['quantity'] : 1;
                // Get price for this addon
                $stmt4 = $db->prepare("SELECT price FROM Addon WHERE addon_id = ?");
                $stmt4->execute([$addon_id]);
                $addon = $stmt4->fetch(PDO::FETCH_ASSOC);
                $unit_price = $addon ? $addon['price'] : 0;
                $stmt5 = $db->prepare("INSERT INTO BillingAddon (addon_id, billing_id, unit_price, quantity) VALUES (?, ?, ?, ?)");
                $stmt5->execute([$addon_id, $billing_id, $unit_price, $quantity]);
            }

            echo json_encode(['success' => true, 'addon_order_id' => $addon_order_id]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function getOrder($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT ao.*, u.username, res.reservation_id, aos.order_status_name,
               g.first_name, g.last_name, CONCAT(g.first_name, ' ', g.last_name) AS guest_name
        FROM AddonOrder ao
        LEFT JOIN User u ON ao.user_id = u.user_id
        LEFT JOIN Reservation res ON ao.reservation_id = res.reservation_id
        LEFT JOIN Guest g ON res.guest_id = g.guest_id
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
