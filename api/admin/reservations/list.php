<?php
// Include necessary files
require_once '../../../config/cors.php';
require_once '../../../config/database.php';
require_once '../../../models/Reservation.php';

// Start session for authentication
session_start();

// Check if user is authenticated
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(array("message" => "Unauthorized"));
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Create Reservation object
    $reservation = new Reservation($db);

    // Get pagination parameters
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

    // Get filter parameters
    $filters = array();

    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $filters['search'] = $_GET['search'];
    }

    if (isset($_GET['status']) && !empty($_GET['status'])) {
        $filters['status'] = $_GET['status'];
    }

    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
        $filters['date_from'] = $_GET['date_from'];
    }

    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
        $filters['date_to'] = $_GET['date_to'];
    }

    // Get reservations with pagination and filters
    $result = $reservation->getReservations($page, $limit, $filters);

    // Return response
    http_response_code(200);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
