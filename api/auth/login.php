<?php
// Include required files
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Set content type to JSON
header("Content-Type: application/json");

// Only accept POST requests
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

// Get request body
$data = json_decode(file_get_contents("php://input"), true);

// Validate input
if (!isset($data['username']) || !isset($data['password'])) {
    echo json_encode(["success" => false, "message" => "Username and password are required"]);
    exit;
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    // FIX: Corrected JOIN condition - Join on user_roles_id (which exists in both tables)
    // instead of trying to join on ur.user_id which doesn't match the schema
    $query = "SELECT u.user_id, u.username, u.password, ur.role_type 
              FROM User u 
              JOIN UserRoles ur ON u.user_roles_id = ur.user_roles_id 
              WHERE u.username = :username AND u.is_deleted = 0";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data['username']);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Verify password
        if (password_verify($data['password'], $user['password'])) {
            // Password verified successfully
        } else if ($data['password'] === $user['password']) {
            // Plain text password match (development only)
        } else {
            echo json_encode(["success" => false, "message" => "Invalid credentials"]);
            exit;
        }

        // Start session with enhanced security
        session_start();
        session_regenerate_id(true); // Regenerate session ID for security

        // Generate a secure token
        $token = bin2hex(random_bytes(32));

        // Store session data
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role_type'] = $user['role_type'];
        $_SESSION['admin_token'] = $token;
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['admin_user'] = [
            "user_id" => $user['user_id'],
            "username" => $user['username'],
            "role_type" => $user['role_type']
        ];

        // Return user info (excluding password)
        unset($user['password']);

        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "token" => $token,
            "user" => [
                "user_id" => $user['user_id'],
                "username" => $user['username'],
                "role_type" => $user['role_type']
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid credentials"]);
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
