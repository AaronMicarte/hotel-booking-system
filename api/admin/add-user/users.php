<?php
require_once '../../config/database.php';
header('Content-Type: application/json');
session_start(); // <-- Add this to access session

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // List all users or get single user
    if (isset($_GET['id'])) {
        $stmt = $conn->prepare("SELECT u.*, ur.role_type FROM User u JOIN UserRoles ur ON u.user_roles_id = ur.user_roles_id WHERE u.user_id = :id");
        $stmt->bindParam(':id', $_GET['id']);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            echo json_encode(['status' => 'success', 'user' => $user]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'User not found']);
        }
    } else {
        // Exclude current user from the list
        $currentUserId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
        if ($currentUserId) {
            // Show ALL users (active and inactive), except current user
            $stmt = $conn->prepare("SELECT u.*, ur.role_type FROM User u JOIN UserRoles ur ON u.user_roles_id = ur.user_roles_id WHERE u.user_id != :current_user_id ORDER BY u.created_at DESC");
            $stmt->bindParam(':current_user_id', $currentUserId);
        } else {
            // Show ALL users (active and inactive)
            $stmt = $conn->prepare("SELECT u.*, ur.role_type FROM User u JOIN UserRoles ur ON u.user_roles_id = ur.user_roles_id ORDER BY u.created_at DESC");
        }
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['status' => 'success', 'users' => $users]);
    }
    exit;
}

if ($method === 'PUT') {
    // Update user (edit or status)
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'User ID required']);
        exit;
    }

    // Status-only update (activate/deactivate)
    if (isset($data['update_type']) && $data['update_type'] === 'status_only' && isset($data['is_deleted'])) {
        $stmt = $conn->prepare("UPDATE User SET is_deleted = :is_deleted WHERE user_id = :user_id");
        $stmt->bindParam(':is_deleted', $data['is_deleted']);
        $stmt->bindParam(':user_id', $data['user_id']);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'User status updated']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update user status']);
        }
        exit;
    }

    // Normal update (edit user)
    if (empty($data['username']) || empty($data['user_roles_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Required fields missing']);
        exit;
    }
    $fields = "username = :username, email = :email, user_roles_id = :user_roles_id";
    if (!empty($data['password'])) {
        $fields .= ", password = :password";
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    $sql = "UPDATE User SET $fields WHERE user_id = :user_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':username', $data['username']);
    $stmt->bindParam(':email', $data['email']);
    $stmt->bindParam(':user_roles_id', $data['user_roles_id']);
    $stmt->bindParam(':user_id', $data['user_id']);
    if (!empty($data['password'])) {
        $stmt->bindParam(':password', $data['password']);
    }
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'User updated']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update user']);
    }
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
