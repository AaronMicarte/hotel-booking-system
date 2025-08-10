<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class RoomTypeAPI
{
    function getAllRoomTypes()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $query = "SELECT * FROM RoomType WHERE is_deleted = FALSE ORDER BY room_type_id";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $roomTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($roomTypes ?: []);
    }

    function getRoomType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $json = json_decode($json, true);
        $id = $json['room_type_id'];

        $query = "SELECT rt.*, COUNT(r.room_id) as room_count 
                  FROM RoomType rt 
                  LEFT JOIN Room r ON rt.room_type_id = r.room_type_id 
                  WHERE rt.room_type_id = ? AND rt.is_deleted = FALSE 
                  GROUP BY rt.room_type_id";
        $stmt = $db->prepare($query);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result === false) {
            http_response_code(404);
            echo json_encode(['error' => 'Room type not found']);
            return;
        }

        echo json_encode($result);
    }

    function createRoomType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        // If using multipart/form-data, get fields from $_POST and file from $_FILES
        $type_name = $_POST['type_name'] ?? null;
        $description = $_POST['description'] ?? null;
        $key_features = $_POST['key_features'] ?? null;
        $room_size_sqm = $_POST['room_size_sqm'] ?? null;
        $max_capacity = $_POST['max_capacity'] ?? null;
        $price_per_stay = $_POST['price_per_stay'] ?? null;
        $imageUrl = null;

        // Handle file upload if present
        if (isset($_FILES['room_image']) && $_FILES['room_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../../assets/images/uploads/room-types/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileTmp = $_FILES['room_image']['tmp_name'];
            $fileName = basename($_FILES['room_image']['name']);
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array($fileExt, $allowed)) {
                $newFileName = uniqid('roomtype_', true) . '.' . $fileExt;
                $destPath = $uploadDir . $newFileName;
                if (move_uploaded_file($fileTmp, $destPath)) {
                    // Save just the filename
                    $imageUrl = $newFileName;
                }
            }
        }

        $query = "INSERT INTO RoomType (type_name, description, key_features, room_size_sqm, max_capacity, price_per_stay, image_url) 
                  VALUES (:name, :description, :key_features, :size, :capacity, :price, :image_url)";

        $stmt = $db->prepare($query);

        try {
            $stmt->bindParam(':name', $type_name);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':key_features', $key_features);
            $stmt->bindParam(':size', $room_size_sqm);
            $stmt->bindParam(':capacity', $max_capacity);
            $stmt->bindParam(':price', $price_per_stay);
            $stmt->bindParam(':image_url', $imageUrl);
            $stmt->execute();
            echo json_encode(['message' => 'Room type created successfully']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    function updateRoomType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        // If using multipart/form-data, get fields from $_POST and file from $_FILES
        $room_type_id = $_POST['room_type_id'] ?? null;
        $type_name = $_POST['type_name'] ?? null;
        $description = $_POST['description'] ?? null;
        $key_features = $_POST['key_features'] ?? null;
        $room_size_sqm = $_POST['room_size_sqm'] ?? null;
        $max_capacity = $_POST['max_capacity'] ?? null;
        $price_per_stay = $_POST['price_per_stay'] ?? null;
        $imageUrl = null;

        // Handle file upload if present
        if (isset($_FILES['room_image']) && $_FILES['room_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../../assets/images/uploads/room-types/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileTmp = $_FILES['room_image']['tmp_name'];
            $fileName = basename($_FILES['room_image']['name']);
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array($fileExt, $allowed)) {
                $newFileName = uniqid('roomtype_', true) . '.' . $fileExt;
                $destPath = $uploadDir . $newFileName;
                if (move_uploaded_file($fileTmp, $destPath)) {
                    // Save just the filename
                    $imageUrl = $newFileName;
                }
            }
        }

        $query = "UPDATE RoomType 
                  SET type_name = :name, 
                      description = :description, 
                      key_features = :key_features,
                      room_size_sqm = :size, 
                      max_capacity = :capacity, 
                      price_per_stay = :price";
        if ($imageUrl) {
            $query .= ", image_url = :image_url";
        }
        $query .= " WHERE room_type_id = :id";

        $stmt = $db->prepare($query);

        try {
            $stmt->bindParam(':id', $room_type_id);
            $stmt->bindParam(':name', $type_name);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':key_features', $key_features);
            $stmt->bindParam(':size', $room_size_sqm);
            $stmt->bindParam(':capacity', $max_capacity);
            $stmt->bindParam(':price', $price_per_stay);
            if ($imageUrl) {
                $stmt->bindParam(':image_url', $imageUrl);
            }
            $stmt->execute();
            echo json_encode(['message' => 'Room type updated successfully']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    function deleteRoomType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $json = json_decode($json, true);
        $id = $json['room_type_id'];

        $query = "UPDATE RoomType SET is_deleted = TRUE WHERE room_type_id = :id";
        $stmt = $db->prepare($query);

        try {
            $stmt->execute([':id' => $id]);
            echo json_encode(['message' => 'Room type deleted successfully']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

// Request handling
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';

    // Support direct GET by id (for frontend compatibility)
    if (!$operation) {
        if (isset($_GET['id'])) {
            $operation = 'getRoomType';
            $json = json_encode(['room_type_id' => $_GET['id']]);
        } else {
            $operation = 'getAllRoomTypes';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$roomTypeAPI = new RoomTypeAPI();
switch ($operation) {
    case "getAllRoomTypes":
        $roomTypeAPI->getAllRoomTypes();
        break;
    case "getRoomType":
        $roomTypeAPI->getRoomType($json);
        break;
    case "createRoomType":
        $roomTypeAPI->createRoomType($json);
        break;
    case "updateRoomType":
        $roomTypeAPI->updateRoomType($json);
        break;
    case "deleteRoomType":
        $roomTypeAPI->deleteRoomType($json);
        break;
}
