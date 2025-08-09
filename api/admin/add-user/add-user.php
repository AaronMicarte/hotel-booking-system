<?php
header('Content-Type: application/json');
require_once '../../config/database.php';

// Check request method
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle GET request - retrieve user roles
    try {
        // Connect to database
        $db = new Database();
        $conn = $db->getConnection();

        // DEBUG: Check how many roles exist
        $stmt = $conn->prepare("SELECT user_roles_id, role_type FROM UserRoles WHERE is_deleted = 0 ORDER BY role_type");
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // DEBUG: If no roles, add a message
        if (!$roles || count($roles) === 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'No roles found. Please check your UserRoles table. Try running: INSERT INTO UserRoles (role_type) VALUES (\'admin\'), (\'front desk\');'
            ]);
        } else {
            echo json_encode(['status' => 'success', 'roles' => $roles]);
        }
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

// Handle POST request - add new user
// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

// Get the form data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (empty($data['username']) || empty($data['password']) || empty($data['user_roles_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
    exit;
}

try {
    // Connect to database
    $db = new Database();
    $conn = $db->getConnection();

    // Check if username already exists
    $checkStmt = $conn->prepare("SELECT user_id FROM User WHERE username = :username AND is_deleted = 0");
    $checkStmt->bindParam(':username', $data['username']);
    $checkStmt->execute();
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo json_encode(['status' => 'error', 'message' => 'Username already exists']);
        exit;
    }

    // Hash the password
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

    // Prepare and execute the insert statement
    $stmt = $conn->prepare("INSERT INTO User (username, password, email, user_roles_id) VALUES (:username, :password, :email, :user_roles_id)");
    $stmt->bindParam(':username', $data['username']);
    $stmt->bindParam(':password', $hashedPassword);
    $stmt->bindParam(':email', $data['email']);
    $stmt->bindParam(':user_roles_id', $data['user_roles_id']);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'User added successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to add user: ' . implode(", ", $stmt->errorInfo())]);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
