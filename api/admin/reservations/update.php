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

// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// Validate required fields
if (!$data) {
    http_response_code(400);
    echo json_encode(array("message" => "No data provided for update"));
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

    // Set reservation properties from the data provided
    if (isset($data->guest_id)) $reservation->guest_id = $data->guest_id;
    if (isset($data->check_in_date)) $reservation->check_in_date = $data->check_in_date;
    if (isset($data->check_out_date)) $reservation->check_out_date = $data->check_out_date;
    if (isset($data->room_id)) $reservation->room_id = $data->room_id;
    if (isset($data->status)) $reservation->status = $data->status;

    // Update reservation
    if ($reservation->updateReservation()) {
        http_response_code(200);
        echo json_encode(array("message" => "Reservation updated successfully"));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Unable to update reservation"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
