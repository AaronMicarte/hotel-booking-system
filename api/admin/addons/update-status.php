<?php
// Include required files
require_once '../../../config/cors.php';
require_once '../../../config/database.php';

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
    echo json_encode(array("message" => "Addon ID is required"));
    exit();
}

// Get request body
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($data['is_available'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Availability status is required"));
    exit();
}

// Convert to integer (0 or 1) for database
// Properly handle various input formats (string, number, boolean)
$isAvailable = (isset($data['is_available']) && ($data['is_available'] === 1 || $data['is_available'] === '1' || $data['is_available'] === true)) ? 1 : 0;

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Check if addon exists
    $checkQuery = "SELECT addon_id FROM Addon WHERE addon_id = :id AND is_deleted = 0";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $_GET['id']);
    $checkStmt->execute();

    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(array("message" => "Addon not found"));
        exit();
    }

    // Update availability status
    $query = "UPDATE Addon SET is_available = :is_available, updated_at = NOW() WHERE addon_id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':is_available', $isAvailable, PDO::PARAM_INT);
    $stmt->bindParam(':id', $_GET['id']);

    if ($stmt->execute()) {
        echo json_encode(array(
            "success" => true,
            "message" => "Addon status updated successfully"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to update addon status"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
