<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

session_start();

class Auth
{
    function login($json)
    {
        include "../../config/connection-pdo.php";
        $json = json_decode($json, true);

        $username = $json['username'];
        $password = $json['password'];

        // Check User table with UserRoles - logic moved directly here
        $sql = "SELECT 
                    u.user_id AS id, 
                    u.username, 
                    u.password, 
                    u.email,
                    ur.role_type
                FROM User u
                LEFT JOIN UserRoles ur ON u.user_roles_id = ur.user_roles_id
                WHERE u.username = :username 
                AND u.is_deleted = 0";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":username", $username);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $password === $user['password']) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role_type'] = $user['role_type'] ?? 'front_desk';
            $_SESSION['logged_in'] = true;

            unset($user['password']);
            $user['role_type'] = $user['role_type'] ?? 'front_desk';

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => $user
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password'
            ]);
        }
    }

    function logout()
    {
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
    }

    function checkSession()
    {
        if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'role_type' => $_SESSION['role_type']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        }
    }
}

// Request handling
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
} else {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';
}

$auth = new Auth();
switch ($operation) {
    case "login":
        $auth->login($json);
        break;
    case "logout":
        $auth->logout();
        break;
    case "checkSession":
        $auth->checkSession();
        break;
}
