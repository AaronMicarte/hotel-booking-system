<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../models/MasterData.php';

if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    $masterData = new MasterData($db);

    $result = $masterData->getAllMasterData();

    echo json_encode([
        'success' => true,
        'data' => $result,
        'message' => 'Master data retrieved successfully'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
