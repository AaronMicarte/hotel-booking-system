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

// Handle GET request
if ($_SERVER['REQUEST_METHOD'] != 'GET') {
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

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Get addon by ID
    $query = "SELECT a.*, ac.category_name 
              FROM Addon a
              JOIN AddonCategory ac ON a.category_id = ac.category_id
              WHERE a.addon_id = :id AND a.is_deleted = 0";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $_GET['id']);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $addon = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(array("addon" => $addon));
    } else {
        http_response_code(404);
        echo json_encode(array("message" => "Addon not found"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
