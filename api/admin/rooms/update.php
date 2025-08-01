<?php
// Include required files
require_once '../../../config/cors.php';
require_once '../../../config/database.php';
require_once '../../../models/Room.php';

// Start session
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(array("message" => "Unauthorized"));
    exit();
}

// Handle PUT request
if ($_SERVER['REQUEST_METHOD'] != 'PUT') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

// Check if ID is provided
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Room ID is required"));
    exit();
}

// Get request body
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($data['room_number']) || !isset($data['room_type']) || !isset($data['status'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Room number, type, and status are required"));
    exit();
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Instantiate Room object
    $room = new Room($db);

    // Update room
    $result = $room->update(
        $_GET['id'],
        $data['room_number'],
        $data['room_type'],
        $data['status'],
        isset($data['notes']) ? $data['notes'] : null // Handle notes field
    );

    if ($result) {
        echo json_encode(array(
            "success" => true,
            "message" => "Room updated successfully"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to update room"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
