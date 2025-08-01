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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// Validate required fields
if (
    !$data || !isset($data->guest_id) || !isset($data->check_in_date) ||
    !isset($data->check_out_date) || !isset($data->room_id) || !isset($data->status)
) {
    http_response_code(400);
    echo json_encode(array("message" => "Missing required fields"));
    exit();
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Create Reservation object
    $reservation = new Reservation($db);

    // Set reservation properties
    $reservation->guest_id = $data->guest_id;
    $reservation->check_in_date = $data->check_in_date;
    $reservation->check_out_date = $data->check_out_date;
    $reservation->room_id = $data->room_id;
    $reservation->status = $data->status;
    $reservation->user_id = $_SESSION['user_id']; // Set logged-in user as creator

    // Create reservation
    if ($reservation->createReservation()) {
        http_response_code(201);
        echo json_encode(array(
            "message" => "Reservation created successfully",
            "reservation_id" => $reservation->reservation_id
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Unable to create reservation"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
