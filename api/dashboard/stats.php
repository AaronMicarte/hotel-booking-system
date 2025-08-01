<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Check if Dashboard class file exists
if (!file_exists('../../models/Dashboard.php')) {
    http_response_code(500);
    echo json_encode(array("message" => "Dashboard model not found"));
    exit();
}

require_once '../../models/Dashboard.php';

// Check if Dashboard class is defined
if (!class_exists('Dashboard')) {
    http_response_code(500);
    echo json_encode(array("message" => "Dashboard class not defined"));
    exit();
}

session_start();

// Authentication check
if (!isset($_SESSION['user_id']) && !isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(array("message" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    $dashboard = new Dashboard($db);

    // Get date range parameters if provided
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');

    $stats = array(
        "total_rooms" => $dashboard->getTotalRooms(),
        "available_rooms" => $dashboard->getAvailableRooms(),
        "total_guests" => $dashboard->getTotalGuests(),
        "active_reservations" => $dashboard->getActiveReservations(),
        "total_revenue" => $dashboard->getTotalRevenue(),
        "recent_reservations" => $dashboard->getRecentReservations(),
        "room_status_distribution" => $dashboard->getRoomStatusDistribution(),
        "revenue_by_date" => $dashboard->getRevenueByDateRange($startDate, $endDate),
        "booking_count_by_date" => $dashboard->getBookingCountByDateRange($startDate, $endDate)
    );

    http_response_code(200);
    echo json_encode($stats);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "message" => "Server error: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ));
}
