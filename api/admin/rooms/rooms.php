<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class Room
{
    function getAllRooms()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $params = [];
        $where = ["r.is_deleted = FALSE"];

        // Debug output for filter parameters
        error_log('Filter parameters: ' . json_encode($_GET));

        // Search functionality
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $search = "%{$_GET['search']}%";
            $where[] = "(r.room_number LIKE :search OR rt.type_name LIKE :search OR rs.room_status LIKE :search)";
            $params[':search'] = $search;
        }

        // Filter by type (support both type_name and room_type_id)
        if (isset($_GET['type_id']) && !empty($_GET['type_id'])) {
            $where[] = "r.room_type_id = :type_id";
            $params[':type_id'] = $_GET['type_id'];
            error_log('Filtering by type_id: ' . $_GET['type_id']);
        } else if (isset($_GET['type']) && !empty($_GET['type'])) {
            $where[] = "LOWER(rt.type_name) = LOWER(:type)";
            $params[':type'] = $_GET['type'];
            error_log('Filtering by type: ' . $_GET['type']);
        }

        // Filter by status
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $where[] = "LOWER(rs.room_status) = LOWER(:status)";
            $params[':status'] = $_GET['status'];
            error_log('Filtering by status: ' . $_GET['status']);
        }

        $whereClause = implode(" AND ", $where);

        // Log the final WHERE clause
        error_log('WHERE clause: ' . $whereClause);
        error_log('Params: ' . json_encode($params));

        // Updated query to include all RoomType fields
        $query = "SELECT 
                    r.*, 
                    rt.type_name, 
                    rt.description AS room_type_description,
                    rt.key_features,
                    rt.room_size_sqm,
                    rt.max_capacity,
                    rt.price_per_stay,
                    rt.image_url AS room_type_image_url,
                    rs.room_status 
                  FROM Room r 
                  LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id 
                  LEFT JOIN RoomStatus rs ON r.room_status_id = rs.room_status_id 
                  WHERE {$whereClause}
                  ORDER BY r.room_number";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($rooms);
    }
    function getRoom($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        // Also update the single room query to include all RoomType fields
        $query = "SELECT 
                    r.*, 
                    rt.type_name, 
                    rt.description AS room_type_description,
                    rt.key_features,
                    rt.room_size_sqm,
                    rt.max_capacity,
                    rt.price_per_stay,
                    rt.image_url AS room_type_image_url,
                    rs.room_status 
                  FROM Room r 
                  LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id 
                  LEFT JOIN RoomStatus rs ON r.room_status_id = rs.room_status_id 
                  WHERE r.room_id = :room_id AND r.is_deleted = FALSE";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":room_id", $json['room_id']);
        $stmt->execute();

        $room = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($room);
    }

    function insertRoom($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        // Always set initial status to 1 (available)
        $json['room_status_id'] = 1;

        $sql = "INSERT INTO Room (room_status_id, room_type_id, room_number) 
                VALUES (:status_id, :type_id, :room_number)";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':status_id', $json['room_status_id']);
        $stmt->bindParam(':type_id', $json['room_type_id']);
        $stmt->bindParam(':room_number', $json['room_number']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }

    function updateRoom($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        // Handle status-only updates
        if (isset($json['update_type']) && $json['update_type'] === 'status_only') {
            $sql = "UPDATE Room SET room_status_id = :status_id WHERE room_id = :room_id";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':status_id', $json['room_status_id']);
            $stmt->bindParam(':room_id', $json['room_id']);
            $stmt->execute();

            $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
            echo json_encode($returnValue);
            return;
        }

        // Handle regular/full updates (including status)
        $sql = "UPDATE Room 
                SET room_type_id = :type_id,
                    room_number = :room_number,
                    room_status_id = :status_id
                WHERE room_id = :room_id";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':type_id', $json['room_type_id']);
        $stmt->bindParam(':room_number', $json['room_number']);
        $stmt->bindParam(':status_id', $json['room_status_id']);
        $stmt->bindParam(':room_id', $json['room_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteRoom($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE Room SET is_deleted = TRUE WHERE room_id = :room_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":room_id", $json['room_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }
}

// Request handling
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';

    // Support direct GET by room_id (for frontend compatibility)
    if (!$operation) {
        if (isset($_GET['room_id'])) {
            $operation = 'getRoom';
            $json = json_encode(['room_id' => $_GET['room_id']]);
        } else {
            $operation = 'getAllRooms';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$room = new Room();
switch ($operation) {
    case "getAllRooms":
        $room->getAllRooms();
        break;
    case "insertRoom":
        $room->insertRoom($json);
        break;
    case "getRoom":
        $room->getRoom($json);
        break;
    case "updateRoom":
        $room->updateRoom($json);
        break;
    case "deleteRoom":
        $room->deleteRoom($json);
        break;
}
