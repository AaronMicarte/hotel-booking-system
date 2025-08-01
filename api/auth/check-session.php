<?php
require_once '../../config/cors.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

// Check both user_id and user_id for backward compatibility
if (isset($_SESSION['user_id']) || isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'] ?? $_SESSION['user_id'] ?? null;
    $username = $_SESSION['username'] ?? 'Admin';
    $roleType = $_SESSION['role_type'] ?? 'admin';

    echo json_encode(array(
        "authenticated" => true,
        "user" => array(
            "user_id" => $userId,
            "username" => $username,
            "role_type" => $roleType
        )
    ));
} else {
    http_response_code(401);
    echo json_encode(array(
        "authenticated" => false,
        "message" => "Session expired or user not logged in"
    ));
}
