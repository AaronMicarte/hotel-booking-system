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

    // Get parameters
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $category = isset($_GET['category']) ? $_GET['category'] : '';

    // Validate parameters
    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 100) $limit = 10;

    // Calculate offset
    $offset = ($page - 1) * $limit;

    // Base query
    $query = "SELECT a.*, ac.category_name 
              FROM Addon a
              JOIN AddonCategory ac ON a.category_id = ac.category_id
              WHERE a.is_deleted = 0";

    // Add search condition
    if (!empty($search)) {
        $query .= " AND (a.name LIKE :search)";
    }

    // Add category filter
    if (!empty($category)) {
        $query .= " AND ac.category_name = :category";
    }

    // Count total records
    $countQuery = str_replace("a.*, ac.category_name", "COUNT(*) as total", $query);
    $countStmt = $db->prepare($countQuery);

    // Bind parameters for count query
    if (!empty($search)) {
        $searchParam = "%{$search}%";
        $countStmt->bindParam(':search', $searchParam);
    }

    if (!empty($category)) {
        $countStmt->bindParam(':category', $category);
    }

    $countStmt->execute();
    $totalRow = $countStmt->fetch(PDO::FETCH_ASSOC);
    $total = $totalRow['total'];

    // Add sorting and pagination
    $query .= " ORDER BY a.name ASC LIMIT :limit OFFSET :offset";

    // Prepare main query
    $stmt = $db->prepare($query);

    // Bind parameters
    if (!empty($search)) {
        $searchParam = "%{$search}%";
        $stmt->bindParam(':search', $searchParam);
    }

    if (!empty($category)) {
        $stmt->bindParam(':category', $category);
    }

    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

    // Execute query
    $stmt->execute();

    // Fetch results
    $addons = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Return response
    echo json_encode(array(
        "addons" => $addons,
        "total" => $total,
        "page" => $page,
        "limit" => $limit,
        "pages" => ceil($total / $limit)
    ));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Server error: " . $e->getMessage()));
}
