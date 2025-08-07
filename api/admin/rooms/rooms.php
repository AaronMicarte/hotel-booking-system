<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods,Authorization');

include_once '../../../config/Database.php';

// Initialize DB connection
$database = new Database();
$db = $database->getConnection();

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle different HTTP methods
switch ($method) {
    case 'GET':
        if (isset($_GET['room_id'])) {
            getRoom($db, $_GET['room_id']);
        } else {
            getAllRooms($db);
        }
        break;
    case 'POST':
        createRoom($db);
        break;
    case 'PUT':
        updateRoom($db);
        break;
    case 'DELETE':
        if (isset($_GET['room_id'])) {
            deleteRoom($db, $_GET['room_id']);
        }
        break;
    default:
        echo json_encode(['message' => 'Method not allowed']);
        break;
}

// Get all rooms
function getAllRooms($db)
{
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

// Get single room
function getRoom($db, $id)
{
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
              WHERE r.room_id = ? AND r.is_deleted = FALSE";
    $stmt = $db->prepare($query);
    $stmt->execute([$id]);

    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($room);
}

// Create room
function createRoom($db)
{
    $data = json_decode(file_get_contents("php://input"));

    if (!$data || !isset($data->room_number) || !isset($data->room_type_id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    // Always set initial status to 1 (available)
    $data->room_status_id = 1;

    $query = "INSERT INTO Room (room_status_id, room_type_id, room_number) 
              VALUES (:status_id, :type_id, :room_number)";

    $stmt = $db->prepare($query);

    try {
        $stmt->bindParam(':status_id', $data->room_status_id);
        $stmt->bindParam(':type_id', $data->room_type_id);
        $stmt->bindParam(':room_number', $data->room_number);

        if ($stmt->execute()) {
            $room_id = $db->lastInsertId();
            http_response_code(201);
            echo json_encode([
                'message' => 'Room created successfully',
                'room_id' => $room_id
            ]);
        } else {
            throw new Exception("Failed to create room");
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Update room
function updateRoom($db)
{
    $data = json_decode(file_get_contents("php://input"));

    // Handle status-only updates
    if (isset($data->update_type) && $data->update_type === 'status_only') {
        if (!isset($data->room_id) || !isset($data->room_status_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields for status update']);
            return;
        }

        $query = "UPDATE Room SET room_status_id = :status_id WHERE room_id = :room_id";
        $stmt = $db->prepare($query);

        try {
            $stmt->bindParam(':status_id', $data->room_status_id);
            $stmt->bindParam(':room_id', $data->room_id);

            if ($stmt->execute()) {
                echo json_encode(['message' => 'Room status updated successfully']);
            } else {
                throw new Exception("Failed to update room status");
            }
            return;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    // Handle regular updates
    if (!$data || !isset($data->room_id) || !isset($data->room_number) || !isset($data->room_type_id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    $query = "UPDATE Room 
              SET room_type_id = :type_id,
                  room_number = :room_number
              WHERE room_id = :room_id";

    $stmt = $db->prepare($query);

    try {
        $stmt->bindParam(':type_id', $data->room_type_id);
        $stmt->bindParam(':room_number', $data->room_number);
        $stmt->bindParam(':room_id', $data->room_id);

        if ($stmt->execute()) {
            echo json_encode(['message' => 'Room updated successfully']);
        } else {
            throw new Exception("Failed to update room");
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Delete room (soft delete)
function deleteRoom($db, $id)
{
    $query = "UPDATE Room SET is_deleted = TRUE WHERE room_id = ?";
    $stmt = $db->prepare($query);

    try {
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Room deleted successfully']);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}
