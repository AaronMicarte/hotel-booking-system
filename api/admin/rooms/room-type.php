<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods');

include_once '../../../config/Database.php';


$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$database = new Database();
$db = $database->getConnection();

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getRoomType($db, $_GET['id']);
        } else {
            getAllRoomTypes($db);
        }
        break;
    case 'POST':
        // Check if this is an update request with file upload
        if (isset($_GET['update']) && $_GET['update'] === 'true') {
            updateRoomTypeWithFile($db);
        } else {
            createRoomType($db);
        }
        break;
    case 'PUT':
        updateRoomType($db);
        break;
    case 'DELETE':
        if (isset($_GET['id'])) {
            deleteRoomType($db, $_GET['id']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing room type ID']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function getAllRoomTypes($db)
{
    try {
        // Initialize tables if they don't exist
        // initializeTables($db);

        $query = "SELECT * FROM RoomType WHERE is_deleted = FALSE ORDER BY room_type_id";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $roomTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        error_log('Room types query executed, found: ' . count($roomTypes) . ' room types');

        // Ensure we always return an array
        if ($roomTypes === false) {
            $roomTypes = [];
        }

        header('Content-Type: application/json');
        echo json_encode($roomTypes);
    } catch (PDOException $e) {
        error_log('Database error in getAllRoomTypes: ' . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    } catch (Exception $e) {
        error_log('Error in getAllRoomTypes: ' . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createRoomType($db)
{
    // Handle file upload for create
    if (isset($_FILES['room_image'])) {
        $uploadResult = handleImageUpload($_FILES['room_image']);
        if ($uploadResult['success']) {
            $imageUrl = $uploadResult['url'];
        } else {
            http_response_code(400);
            echo json_encode(['error' => $uploadResult['error']]);
            return;
        }
    } else {
        $imageUrl = $_POST['image_url'] ?? null;
    }

    $query = "INSERT INTO RoomType (type_name, description, key_features, room_size_sqm, max_capacity, price_per_stay, image_url) 
              VALUES (:name, :description, :key_features, :size, :capacity, :price, :image_url)";

    $stmt = $db->prepare($query);

    try {
        $stmt->execute([
            ':name' => $_POST['type_name'],
            ':description' => $_POST['description'],
            ':key_features' => $_POST['key_features'] ?? null,
            ':size' => $_POST['room_size_sqm'],
            ':capacity' => $_POST['max_capacity'],
            ':price' => $_POST['price_per_stay'],
            ':image_url' => $imageUrl
        ]);

        echo json_encode(['message' => 'Room type created successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateRoomType($db)
{
    $data = json_decode(file_get_contents("php://input"));

    $query = "UPDATE RoomType 
              SET type_name = :name, 
                  description = :description, 
                  key_features = :key_features,
                  room_size_sqm = :size, 
                  max_capacity = :capacity, 
                  price_per_stay = :price
              WHERE room_type_id = :id";

    $stmt = $db->prepare($query);

    try {
        $stmt->execute([
            ':id' => $data->room_type_id,
            ':name' => $data->type_name,
            ':description' => $data->description,
            ':key_features' => $data->key_features ?? null,
            ':size' => $data->room_size_sqm,
            ':capacity' => $data->max_capacity,
            ':price' => $data->price_per_stay
        ]);

        echo json_encode(['message' => 'Room type updated successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateRoomTypeWithFile($db)
{
    // Handle file upload for update
    $imageUrl = null;
    if (isset($_FILES['room_image']) && $_FILES['room_image']['error'] === UPLOAD_ERR_OK) {
        $uploadResult = handleImageUpload($_FILES['room_image']);
        if ($uploadResult['success']) {
            $imageUrl = $uploadResult['url'];
        } else {
            http_response_code(400);
            echo json_encode(['error' => $uploadResult['error']]);
            return;
        }
    }

    // Build query based on whether we have a new image
    if ($imageUrl) {
        $query = "UPDATE RoomType 
                  SET type_name = :name, 
                      description = :description, 
                      key_features = :key_features,
                      room_size_sqm = :size, 
                      max_capacity = :capacity, 
                      price_per_stay = :price,
                      image_url = :image_url
                  WHERE room_type_id = :id";
    } else {
        $query = "UPDATE RoomType 
                  SET type_name = :name, 
                      description = :description, 
                      key_features = :key_features,
                      room_size_sqm = :size, 
                      max_capacity = :capacity, 
                      price_per_stay = :price
                  WHERE room_type_id = :id";
    }

    $stmt = $db->prepare($query);

    try {
        $params = [
            ':id' => $_POST['room_type_id'],
            ':name' => $_POST['type_name'],
            ':description' => $_POST['description'],
            ':key_features' => $_POST['key_features'] ?? null,
            ':size' => $_POST['room_size_sqm'],
            ':capacity' => $_POST['max_capacity'],
            ':price' => $_POST['price_per_stay']
        ];

        if ($imageUrl) {
            $params[':image_url'] = $imageUrl;
        }

        $stmt->execute($params);

        echo json_encode(['message' => 'Room type updated successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getRoomType($db, $id)
{
    try {
        $query = "SELECT rt.*, 
                         COUNT(r.room_id) as room_count 
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
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Add function to initialize tables and sample data
// function initializeTables($db)
// {
//     try {
//         // Create RoomStatus table if it doesn't exist
//         $db->exec("CREATE TABLE IF NOT EXISTS RoomStatus (
//             room_status_id INT AUTO_INCREMENT PRIMARY KEY,
//             room_status ENUM('available', 'occupied', 'maintenance', 'reserved') NOT NULL,
//             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//             is_deleted BOOLEAN DEFAULT FALSE
//         )");

//         // Insert default room statuses
//         $statusData = [
//             [1, 'available'],
//             [2, 'occupied'],
//             [3, 'maintenance'],
//             [4, 'reserved']
//         ];

//         foreach ($statusData as $status) {
//             $stmt = $db->prepare("INSERT IGNORE INTO RoomStatus (room_status_id, room_status) VALUES (?, ?)");
//             $stmt->execute($status);
//         }

//         // Check if RoomType table has any data, if not add sample data
//         $checkQuery = "SELECT COUNT(*) as count FROM RoomType WHERE is_deleted = FALSE";
//         $stmt = $db->prepare($checkQuery);
//         $stmt->execute();
//         $result = $stmt->fetch(PDO::FETCH_ASSOC);

//         if ($result['count'] == 0) {
//             // Insert sample room types with key_features
//             $sampleTypes = [
//                 ['Standard Room', 'Comfortable standard room with essential amenities', 'WiFi, Air conditioning, TV, Private bathroom', 2, 1500.00, 25.0],
//                 ['Deluxe Room', 'Spacious room with enhanced amenities and city view', 'WiFi, Air conditioning, TV, Mini bar, City view, Balcony', 3, 2500.00, 35.0],
//                 ['Suite', 'Luxury suite with separate living area and premium amenities', 'WiFi, Air conditioning, TV, Mini bar, Living area, Kitchenette, Premium bathroom', 4, 4000.00, 50.0]
//             ];

//             foreach ($sampleTypes as $type) {
//                 $stmt = $db->prepare("INSERT INTO RoomType (type_name, description, key_features, max_capacity, price_per_stay, room_size_sqm) VALUES (?, ?, ?, ?, ?, ?)");
//                 $stmt->execute($type);
//             }
//             error_log('Sample room types with key features inserted');
//         }
//     } catch (PDOException $e) {
//         error_log('Error initializing tables: ' . $e->getMessage());
//     }
// }

function handleImageUpload($file)
{
    $uploadDir = '../../../uploads/room-types/';

    // Create directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $maxSize = 5 * 1024 * 1024; // 5MB

    if (!in_array($file['type'], $allowedTypes)) {
        return ['success' => false, 'error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'];
    }

    if ($file['size'] > $maxSize) {
        return ['success' => false, 'error' => 'File too large. Maximum size is 5MB.'];
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '.' . $extension;
    $filepath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        // Return relative path that can be accessed from web root
        $webPath = 'uploads/room-types/' . $filename;
        return ['success' => true, 'url' => $webPath];
    } else {
        return ['success' => false, 'error' => 'Failed to upload file.'];
    }
}

// Add missing deleteRoomType function
function deleteRoomType($db, $id)
{
    $query = "UPDATE RoomType SET is_deleted = TRUE WHERE room_type_id = :id";
    $stmt = $db->prepare($query);

    try {
        $stmt->execute([':id' => $id]);
        echo json_encode(['message' => 'Room type deleted successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
