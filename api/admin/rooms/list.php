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

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Instantiate Room object
    $room = new Room($db);

    // Get parameters
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $type = isset($_GET['type']) ? $_GET['type'] : '';
    $status = isset($_GET['status']) ? $_GET['status'] : '';

    // Validate parameters
    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 100) $limit = 10;

    // Get rooms
    $result = $room->getAll($page, $limit, $search, $type, $status);

    // Return response
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
