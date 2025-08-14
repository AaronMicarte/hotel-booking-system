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
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       res.reservation_id,
                       res.check_in_date,
                       res.check_out_date,
                       r.room_number,
                       rt.type_name,
                       rt.price_per_stay,
                       bs.billing_status
                FROM Billing b
                LEFT JOIN Reservation res ON b.reservation_id = res.reservation_id
                LEFT JOIN Guest g ON res.guest_id = g.guest_id
                LEFT JOIN ReservedRoom rr ON res.reservation_id = rr.reservation_id AND rr.is_deleted = 0
                LEFT JOIN Room r ON rr.room_id = r.room_id
                LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id
                LEFT JOIN BillingStatus bs ON b.billing_status_id = bs.billing_status_id
                WHERE b.is_deleted = 0
                ORDER BY b.billing_id DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $billings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$billings || !is_array($billings) || count($billings) === 0) {
            echo json_encode([]);
            exit;
        }

        foreach ($billings as &$billing) {
            // Get total paid
            $stmt2 = $db->prepare("SELECT SUM(amount_paid) as paid FROM Payment WHERE billing_id = :billing_id AND is_deleted = 0");
            $stmt2->bindParam(":billing_id", $billing['billing_id']);
            $stmt2->execute();
            $row = $stmt2->fetch(PDO::FETCH_ASSOC);
            $billing['amount_paid'] = $row && $row['paid'] ? $row['paid'] : 0;

            // Calculate total_bill (room + addons)
            $room_price = isset($billing['price_per_stay']) ? floatval($billing['price_per_stay']) : 0;
            $addons_total = 0;
            $stmt3 = $db->prepare("SELECT unit_price, quantity FROM BillingAddon WHERE billing_id = :billing_id AND is_deleted = 0");
            $stmt3->bindParam(":billing_id", $billing['billing_id']);
            $stmt3->execute();
            $addons = $stmt3->fetchAll(PDO::FETCH_ASSOC);
            foreach ($addons as $addon) {
                $addons_total += floatval($addon['unit_price']) * intval($addon['quantity']);
            }
            $billing['total_bill'] = $room_price + $addons_total;

            // Set billing_date to reservation's check_out_date if available
            if (!empty($billing['check_out_date'])) {
                $billing['billing_date'] = $billing['check_out_date'];
            }
        }

        echo json_encode($billings);
        exit;
    }

    function getBillingByReservation($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "SELECT b.*, 
                       CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                       r.room_id, r.room_number, rt.type_name, rt.price_per_stay
                FROM Billing b
                LEFT JOIN Reservation res ON b.reservation_id = res.reservation_id
                LEFT JOIN Guest g ON res.guest_id = g.guest_id
                LEFT JOIN ReservedRoom rr ON res.reservation_id = rr.reservation_id AND rr.is_deleted = 0
                LEFT JOIN Room r ON rr.room_id = r.room_id
                LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id
                WHERE b.reservation_id = :reservation_id AND b.is_deleted = 0
                LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":reservation_id", $json['reservation_id']);
        $stmt->execute();
        $billing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$billing) {
            echo json_encode([]);
            exit;
        }

        // Get addons for this billing
        $sql2 = "SELECT ba.*, a.name AS addon_name
                 FROM BillingAddon ba
                 LEFT JOIN Addon a ON ba.addon_id = a.addon_id
                 WHERE ba.billing_id = :billing_id AND ba.is_deleted = 0";
        $stmt2 = $db->prepare($sql2);
        $stmt2->bindParam(":billing_id", $billing['billing_id']);
        $stmt2->execute();
        $addons = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        // Calculate total addon price
        $addons_total = 0;
        foreach ($addons as &$addon) {
            $addon['subtotal'] = $addon['unit_price'] * $addon['quantity'];
            $addons_total += $addon['subtotal'];
        }

        $room_price = floatval($billing['price_per_stay']);
        $total_bill = $room_price + $addons_total;

        // Get payments
        $sql3 = "SELECT p.*, p.amount_paid, p.payment_date, ps.name AS method_name, p.notes
                 FROM Payment p
                 LEFT JOIN PaymentSubMethod ps ON p.sub_method_id = ps.sub_method_id
                 WHERE p.billing_id = :billing_id AND p.is_deleted = 0";
        $stmt3 = $db->prepare($sql3);
        $stmt3->bindParam(":billing_id", $billing['billing_id']);
        $stmt3->execute();
        $payments = $stmt3->fetchAll(PDO::FETCH_ASSOC);

        $amount_paid = 0;
        foreach ($payments as $p) {
            $amount_paid += floatval($p['amount_paid']);
        }

        $remaining_amount = $total_bill - $amount_paid;

        $billing['room_price'] = $room_price;
        $billing['addons'] = $addons;
        $billing['addons_total'] = $addons_total;
        $billing['total_bill'] = $total_bill;
        $billing['payments'] = $payments;
        $billing['amount_paid'] = $amount_paid;
        $billing['remaining_amount'] = $remaining_amount;

        echo json_encode($billing);
        exit;
    }

    function getBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "SELECT * FROM Billing WHERE billing_id = :billing_id AND is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":billing_id", $json['billing_id']);
        $stmt->execute();
        $billing = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($billing);
    }

    function insertBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

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

    function updateBilling($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = is_array($json) ? $json : json_decode($json, true);

        $sql = "UPDATE Billing SET 
                    reservation_id = :reservation_id,
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
        $json = is_array($json) ? $json : json_decode($json, true);

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
        } elseif (isset($_GET['reservation_id'])) {
            $operation = 'getBillingByReservation';
            $json = json_encode(['reservation_id' => $_GET['reservation_id']]);
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
    case "getBillingByReservation":
        $billing->getBillingByReservation($json);
        break;
    case "getBilling":
        $billing->getBilling($json);
        break;
    case "insertBilling":
        $billing->insertBilling($json);
        break;
    case "updateBilling":
        $billing->updateBilling($json);
        break;
    case "deleteBilling":
        $billing->deleteBilling($json);
        break;
}
