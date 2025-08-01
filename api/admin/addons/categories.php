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

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Query to get categories with item counts
    $query = "SELECT ac.category_id, ac.category_name, COUNT(a.addon_id) as item_count
              FROM AddonCategory ac
              LEFT JOIN Addon a ON ac.category_id = a.category_id AND a.is_deleted = 0
              WHERE ac.is_deleted = 0
              GROUP BY ac.category_id
              ORDER BY ac.category_name ASC";

    // Execute query
    $stmt = $db->prepare($query);
    $stmt->execute();

    // Fetch results
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Return response
    echo json_encode(array(
        "categories" => $categories
    ));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
