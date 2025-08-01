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

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

    // Set reservation ID
    $reservation->reservation_id = $_GET['id'];

    // Check if reservation exists
    $existingReservation = $reservation->getReservationById($reservation->reservation_id);
    if (!$existingReservation) {
        http_response_code(404);
        echo json_encode(array("message" => "Reservation not found"));
        exit();
    }

    // Delete reservation (soft delete)
    if ($reservation->deleteReservation()) {
        http_response_code(200);
        echo json_encode(array("message" => "Reservation deleted successfully"));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Unable to delete reservation"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
