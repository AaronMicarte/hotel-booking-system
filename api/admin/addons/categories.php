<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods');

include_once '../../../config/Database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getCategory($db, $_GET['id']);
        } else {
            getAllCategories($db);
        }
        break;
    case 'POST':
        createCategory($db);
        break;
    case 'PUT':
        updateCategory($db);
        break;
    case 'DELETE':
        if (isset($_GET['id'])) {
            deleteCategory($db, $_GET['id']);
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Category ID is required']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
        break;
}

// Fetch all categories
function getAllCategories($db)
{
    try {
        $query = "SELECT category_id, category_name FROM AddonCategory WHERE is_deleted = FALSE";
        $params = [];

        // Handle search parameter
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $query .= " AND category_name LIKE :search";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }

        $query .= " ORDER BY category_name";

        $stmt = $db->prepare($query);

        // Bind parameters if any
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'data' => $results]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

// Fetch a single category by ID
function getCategory($db, $id)
{
    try {
        // Validate ID
        if (!is_numeric($id) || $id <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid category ID']);
            return;
        }

        $query = "SELECT category_id, category_name FROM AddonCategory WHERE category_id = :id AND is_deleted = FALSE";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            // Return consistent response structure
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'category_id' => $result['category_id'],
                    'category_name' => $result['category_name']
                ]
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Category not found']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

// Create a new category
function createCategory($db)
{
    try {
        $data = json_decode(file_get_contents("php://input"));

        // Validate input
        if (!$data || !isset($data->category_name) || empty(trim($data->category_name))) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Category name is required']);
            return;
        }

        $categoryName = trim($data->category_name);

        // Check if category already exists
        $checkQuery = "SELECT category_id FROM AddonCategory WHERE category_name = :category_name AND is_deleted = FALSE";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':category_name', $categoryName);
        $checkStmt->execute();

        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Category already exists']);
            return;
        }

        $query = "INSERT INTO AddonCategory (category_name) VALUES (:category_name)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':category_name', $categoryName);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(['status' => 'success', 'message' => 'Category created successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create category']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

// Update an existing category
function updateCategory($db)
{
    try {
        $data = json_decode(file_get_contents("php://input"));

        // Validate input
        if (!$data || !isset($data->category_id) || !isset($data->category_name) || empty(trim($data->category_name))) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Category ID and name are required']);
            return;
        }

        $categoryId = $data->category_id;
        $categoryName = trim($data->category_name);

        // Validate ID
        if (!is_numeric($categoryId) || $categoryId <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid category ID']);
            return;
        }

        // Check if category exists
        $checkQuery = "SELECT category_id FROM AddonCategory WHERE category_id = :id AND is_deleted = FALSE";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $categoryId, PDO::PARAM_INT);
        $checkStmt->execute();

        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Category not found']);
            return;
        }

        // Check if new name already exists (excluding current category)
        $duplicateQuery = "SELECT category_id FROM AddonCategory WHERE category_name = :category_name AND category_id != :id AND is_deleted = FALSE";
        $duplicateStmt = $db->prepare($duplicateQuery);
        $duplicateStmt->bindParam(':category_name', $categoryName);
        $duplicateStmt->bindParam(':id', $categoryId, PDO::PARAM_INT);
        $duplicateStmt->execute();

        if ($duplicateStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Category name already exists']);
            return;
        }

        $query = "UPDATE AddonCategory SET category_name = :category_name WHERE category_id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':category_name', $categoryName);
        $stmt->bindParam(':id', $categoryId, PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Category updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to update category']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

// Soft delete a category
function deleteCategory($db, $id)
{
    try {
        // Validate ID
        if (!is_numeric($id) || $id <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid category ID']);
            return;
        }

        // Check if category exists
        $checkQuery = "SELECT category_id FROM AddonCategory WHERE category_id = :id AND is_deleted = FALSE";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $checkStmt->execute();

        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Category not found']);
            return;
        }

        // Check if category is being used by any addons
        $usageQuery = "SELECT COUNT(*) as count FROM Addon WHERE category_id = :id AND is_deleted = FALSE";
        $usageStmt = $db->prepare($usageQuery);
        $usageStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $usageStmt->execute();
        $usage = $usageStmt->fetch(PDO::FETCH_ASSOC);

        if ($usage['count'] > 0) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Cannot delete category. It is being used by ' . $usage['count'] . ' addon(s)']);
            return;
        }

        $query = "UPDATE AddonCategory SET is_deleted = TRUE WHERE category_id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Category deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete category']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
}
