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

    $roomTypes = $masterData->getRoomTypes();

    // Transform for frontend compatibility
    $transformedData = [];
    foreach ($roomTypes as $room) {
        $transformedData[$room['type_code']] = [
            'id' => $room['type_code'],
            'title' => $room['type_name'],
            'type' => strtolower($room['type_code']),
            'price' => (float)$room['price_per_stay'],
            'capacity' => (int)$room['max_capacity'],
            'size' => $room['room_size'],
            'description' => $room['description'],
            'period' => '24 hours',
            'checkIn' => 'From 12:00 PM',
            'checkOut' => 'Until 12:00 PM',
            'image' => '../assets/images/' . strtolower($room['type_code']) . '/' . strtolower($room['type_code']) . '-1.jpg',
            'features' => $this->getDefaultFeatures(strtolower($room['type_code']))
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $transformedData,
        'message' => 'Room types retrieved successfully'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

function getDefaultFeatures($type)
{
    $features = [
        'regular' => [
            ['icon' => 'fas fa-bed', 'text' => 'Double bed'],
            ['icon' => 'fas fa-tv', 'text' => '28" LED TV'],
            ['icon' => 'fas fa-wifi', 'text' => 'Free WiFi'],
            ['icon' => 'fas fa-shower', 'text' => 'Private bathroom'],
            ['icon' => 'fas fa-snowflake', 'text' => 'Air conditioning'],
            ['icon' => 'fas fa-parking', 'text' => 'Free parking']
        ],
        'deluxe' => [
            ['icon' => 'fas fa-bed', 'text' => 'Queen-size bed'],
            ['icon' => 'fas fa-tv', 'text' => '32" LED TV'],
            ['icon' => 'fas fa-wifi', 'text' => 'High-speed WiFi'],
            ['icon' => 'fas fa-shower', 'text' => 'Hot & cold shower'],
            ['icon' => 'fas fa-snowflake', 'text' => 'Air conditioning'],
            ['icon' => 'fas fa-coffee', 'text' => 'Coffee facilities']
        ],
        'executive' => [
            ['icon' => 'fas fa-bed', 'text' => 'King-size bed'],
            ['icon' => 'fas fa-tv', 'text' => '43" Smart TV'],
            ['icon' => 'fas fa-wifi', 'text' => 'Premium WiFi'],
            ['icon' => 'fas fa-bath', 'text' => 'Luxury bathroom'],
            ['icon' => 'fas fa-snowflake', 'text' => 'Climate control'],
            ['icon' => 'fas fa-concierge-bell', 'text' => 'Room service']
        ]
    ];

    return $features[$type] ?? $features['regular'];
}
