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

// Check if ID is provided
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Reservation ID is required"));
    exit();
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Create Reservation object
    $reservation = new Reservation($db);

    // Get reservation by ID
    $id = $_GET['id'];
    $result = $reservation->getReservationById($id);

    if (!$result) {
        http_response_code(404);
        echo json_encode(array("message" => "Reservation not found"));
        exit();
    }

    // Return response
    http_response_code(200);
    echo json_encode(array("reservation" => $result));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
