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

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
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

    // Create room
    $result = $room->create(
        $data['room_number'],
        $data['room_type'],
        $data['status']
    );

    if ($result) {
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "Room created successfully",
            "room_id" => $result
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to create room"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
