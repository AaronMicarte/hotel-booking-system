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

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

// Get request body
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($data['name']) || !isset($data['category']) || !isset($data['price'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Name, category, and price are required"));
    exit();
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // Get category ID
    $categoryQuery = "SELECT category_id FROM AddonCategory WHERE category_name = :category_name AND is_deleted = 0";
    $categoryStmt = $db->prepare($categoryQuery);
    $categoryStmt->bindParam(':category_name', $data['category']);
    $categoryStmt->execute();

    if ($categoryStmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(array("message" => "Invalid category"));
        exit();
    }

    $categoryRow = $categoryStmt->fetch(PDO::FETCH_ASSOC);
    $categoryId = $categoryRow['category_id'];
    
    // Convert is_available to integer (0 or 1)
    $isAvailable = isset($data['is_available']) && ($data['is_available'] === '1' || $data['is_available'] === 1) ? 1 : 0;

    // Create addon
    $query = "INSERT INTO Addon (category_id, name, price, is_available, created_at, updated_at, is_deleted) 
              VALUES (:category_id, :name, :price, :is_available, NOW(), NOW(), 0)";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':category_id', $categoryId);
    $stmt->bindParam(':name', $data['name']);
    $stmt->bindParam(':price', $data['price']);
    $stmt->bindParam(':is_available', $isAvailable, PDO::PARAM_INT);

    if ($stmt->execute()) {
        $addonId = $db->lastInsertId();

        http_response_code(201);
        echo json_encode(array(
            "message" => "Addon created successfully",
            "addon_id" => $addonId
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to create addon"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
