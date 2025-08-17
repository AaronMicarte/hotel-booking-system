<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class RoomImage
{
    function getAllRoomImages()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $params = [];
        $where = ["ri.is_deleted = FALSE"];

        if (isset($_GET['room_id']) && !empty($_GET['room_id'])) {
            $where[] = "ri.room_id = :room_id";
            $params[':room_id'] = $_GET['room_id'];
        }

        $whereClause = implode(" AND ", $where);

        $query = "SELECT 
                    ri.*, 
                    r.room_number
                  FROM RoomImage ri
                  LEFT JOIN Room r ON ri.room_id = r.room_id
                  WHERE {$whereClause}
                  ORDER BY ri.created_at DESC";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($images);
    }

    function getRoomImage($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $query = "SELECT 
                    ri.*, 
                    r.room_number
                  FROM RoomImage ri
                  LEFT JOIN Room r ON ri.room_id = r.room_id
                  WHERE ri.room_image_id = :room_image_id AND ri.is_deleted = FALSE";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":room_image_id", $json['room_image_id']);
        $stmt->execute();

        $image = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($image);
    }

    function insertRoomImage($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        // Handle file upload if present
        $room_id = null;
        $image_url = null;

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['json'])) {
            $json = json_decode($_POST['json'], true);
            $room_id = $json['room_id'];
        } else {
            $json = json_decode($json, true);
            $room_id = $json['room_id'];
            $image_url = $json['image_url'] ?? null;
        }

        // If file uploaded, save it and set $image_url
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../../assets/images/uploads/room-images/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileTmp = $_FILES['image']['tmp_name'];
            $fileName = basename($_FILES['image']['name']);
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array($fileExt, $allowed)) {
                $newFileName = uniqid('roomimg_', true) . '.' . $fileExt;
                $destPath = $uploadDir . $newFileName;
                if (move_uploaded_file($fileTmp, $destPath)) {
                    // Save just the filename for DB
                    $image_url = $newFileName;
                } else {
                    echo json_encode(['error' => 'Failed to upload image']);
                    return;
                }
            } else {
                echo json_encode(['error' => 'Invalid file type']);
                return;
            }
        }

        if (!$image_url) {
            echo json_encode(['error' => 'No image provided']);
            return;
        }

        $sql = "INSERT INTO RoomImage (room_id, image_url) 
                VALUES (:room_id, :image_url)";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':room_id', $room_id);
        $stmt->bindParam(':image_url', $image_url);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function updateRoomImage($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        // Accept both JSON and file upload
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['json'])) {
            $json = json_decode($_POST['json'], true);
        } else {
            $json = json_decode($json, true);
        }

        $room_image_id = $json['room_image_id'];

        // Get current image info
        $stmt = $db->prepare("SELECT * FROM RoomImage WHERE room_image_id = :room_image_id");
        $stmt->bindParam(':room_image_id', $room_image_id);
        $stmt->execute();
        $current = $stmt->fetch(PDO::FETCH_ASSOC);

        $image_url = $current ? $current['image_url'] : null;
        $room_id = isset($json['room_id']) ? $json['room_id'] : ($current ? $current['room_id'] : null);

        // If file uploaded, save it and update $image_url
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../../assets/images/uploads/room-images/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileTmp = $_FILES['image']['tmp_name'];
            $fileName = basename($_FILES['image']['name']);
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array($fileExt, $allowed)) {
                $newFileName = uniqid('roomimg_', true) . '.' . $fileExt;
                $destPath = $uploadDir . $newFileName;
                if (move_uploaded_file($fileTmp, $destPath)) {
                    // Optionally delete old image file
                    if ($image_url && file_exists($uploadDir . $image_url)) {
                        @unlink($uploadDir . $image_url);
                    }
                    $image_url = $newFileName;
                } else {
                    echo json_encode(['error' => 'Failed to upload image']);
                    return;
                }
            } else {
                echo json_encode(['error' => 'Invalid file type']);
                return;
            }
        }

        if (!$image_url) {
            echo json_encode(['error' => 'No image provided']);
            return;
        }

        $sql = "UPDATE RoomImage 
                SET room_id = :room_id,
                    image_url = :image_url
                WHERE room_image_id = :room_image_id";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':room_id', $room_id);
        $stmt->bindParam(':image_url', $image_url);
        $stmt->bindParam(':room_image_id', $room_image_id);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteRoomImage($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE RoomImage SET is_deleted = TRUE WHERE room_image_id = :room_image_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":room_image_id", $json['room_image_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }
}

// Handle request routing
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';

    if (!$operation) {
        if (isset($_GET['room_image_id'])) {
            $operation = 'getRoomImage';
            $json = json_encode(['room_image_id' => $_GET['room_image_id']]);
        } else {
            $operation = 'getAllRoomImages';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$roomImage = new RoomImage();

switch ($operation) {
    case "getAllRoomImages":
        $roomImage->getAllRoomImages();
        break;
    case "insertRoomImage":
        $roomImage->insertRoomImage($json);
        break;
    case "getRoomImage":
        $roomImage->getRoomImage($json);
        break;
    case "updateRoomImage":
        $roomImage->updateRoomImage($json);
        break;
    case "deleteRoomImage":
        $roomImage->deleteRoomImage($json);
        break;
    default:
        echo json_encode(['error' => 'Invalid operation']);
        break;
}
