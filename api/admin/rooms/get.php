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

// Handle GET request
if ($_SERVER['REQUEST_METHOD'] != 'GET') {
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

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Instantiate Room object
    $room = new Room($db);

    // Get room by ID
    $roomData = $room->getById($_GET['id']);

    if (!$roomData) {
        http_response_code(404);
        echo json_encode(array("message" => "Room not found"));
        exit();
    }

    // Return response
    echo json_encode(array("success" => true, "room" => $roomData));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
