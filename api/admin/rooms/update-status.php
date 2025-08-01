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

// Handle PATCH request
if ($_SERVER['REQUEST_METHOD'] != 'PATCH') {
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
if (!isset($data['status']) || empty($data['status'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Status is required"));
    exit();
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Instantiate Room object
    $room = new Room($db);

    // Update room status
    $result = $room->updateStatus($_GET['id'], $data['status']);

    if ($result) {
        echo json_encode(array(
            "success" => true,
            "message" => "Room status updated successfully"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to update room status"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
