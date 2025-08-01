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

// Handle PUT request
if ($_SERVER['REQUEST_METHOD'] != 'PUT' && $_SERVER['REQUEST_METHOD'] != 'PATCH') {
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

    // Build update query based on provided data
    $updateFields = array();
    $params = array(':id' => $_GET['id']);

    // Update category if provided
    if (isset($data['category'])) {
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

        $updateFields[] = "category_id = :category_id";
        $params[':category_id'] = $categoryId;
    }

    // Update name if provided
    if (isset($data['name'])) {
        $updateFields[] = "name = :name";
        $params[':name'] = $data['name'];
    }

    // Update price if provided
    if (isset($data['price'])) {
        $updateFields[] = "price = :price";
        $params[':price'] = $data['price'];
    }

    // Update availability status if provided
    if (isset($data['is_available'])) {
        $updateFields[] = "is_available = :is_available";
        // Make sure is_available is properly converted to integer 0 or 1
        $isAvailable = (isset($data['is_available']) && ($data['is_available'] === 1 || $data['is_available'] === '1' || $data['is_available'] === true)) ? 1 : 0;
        $params[':is_available'] = $isAvailable;
    }

    // Check if we have fields to update
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(array("message" => "No fields to update"));
        exit();
    }

    // Always update the updated_at timestamp
    $updateFields[] = "updated_at = NOW()";

    // Build and execute update query
    $query = "UPDATE Addon SET " . implode(", ", $updateFields) . " WHERE addon_id = :id";
    $stmt = $db->prepare($query);

    // Bind all parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }

    if ($stmt->execute()) {
        echo json_encode(array(
            "success" => true,
            "message" => "Addon updated successfully"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to update addon"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
