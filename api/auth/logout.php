<?php
require_once '../../config/cors.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

session_destroy();

echo json_encode(array("message" => "Logout successful"));
