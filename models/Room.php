<?php
class Room
{
    // Database connection and table name
    private $conn;
    private $table_name = "Room";
    private $room_type_table = "RoomType";
    private $room_status_table = "RoomStatus";

    // Object properties
    public $room_id;
    public $room_number;
    public $room_type_id;
    public $room_status_id;
    public $is_deleted;
    public $created_at;
    public $updated_at;

    // Constructor with DB
    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Get all rooms with pagination, search and filtering
     */
    public function getAll($page = 1, $limit = 10, $search = '', $type = '', $status = '')
    {
        // Calculate offset
        $offset = ($page - 1) * $limit;

        // Base query
        $query = "SELECT r.room_id, r.room_number, rt.type_name as room_type, 
                 rs.room_status as status, r.created_at, r.updated_at
                 FROM " . $this->table_name . " r
                 JOIN " . $this->room_type_table . " rt ON r.room_type_id = rt.room_type_id
                 JOIN " . $this->room_status_table . " rs ON r.room_status_id = rs.room_status_id
                 WHERE r.is_deleted = 0";

        // Add search condition
        if (!empty($search)) {
            $query .= " AND (r.room_number LIKE :search 
                      OR rt.type_name LIKE :search 
                      OR rs.room_status LIKE :search)";
        }

        // Add type filter
        if (!empty($type)) {
            $query .= " AND rt.type_name = :type";
        }

        // Add status filter
        if (!empty($status)) {
            $query .= " AND rs.room_status = :status";
        }

        // Count total records matching the criteria
        $countQuery = str_replace("r.room_id, r.room_number, rt.type_name as room_type, 
                 rs.room_status as status, r.created_at, r.updated_at", "COUNT(*) as total", $query);

        // Prepare and execute count query
        $countStmt = $this->conn->prepare($countQuery);

        // Bind parameters for count query
        if (!empty($search)) {
            $searchParam = "%{$search}%";
            $countStmt->bindParam(':search', $searchParam);
        }

        if (!empty($type)) {
            $countStmt->bindParam(':type', $type);
        }

        if (!empty($status)) {
            $countStmt->bindParam(':status', $status);
        }

        $countStmt->execute();
        $row = $countStmt->fetch(PDO::FETCH_ASSOC);
        $total = $row['total'];

        // Add order and limit to query
        $query .= " ORDER BY r.room_number ASC LIMIT :limit OFFSET :offset";

        // Prepare query
        $stmt = $this->conn->prepare($query);

        // Bind parameters
        if (!empty($search)) {
            $searchParam = "%{$search}%";
            $stmt->bindParam(':search', $searchParam);
        }

        if (!empty($type)) {
            $stmt->bindParam(':type', $type);
        }

        if (!empty($status)) {
            $stmt->bindParam(':status', $status);
        }

        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

        // Execute query
        $stmt->execute();

        // Get results
        $rooms = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rooms[] = $row;
        }

        // Return data with pagination info
        return [
            'rooms' => $rooms,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit)
        ];
    }

    /**
     * Get single room by ID
     */
    public function getById($id)
    {
        $query = "SELECT r.room_id, r.room_number, rt.type_name as room_type, 
                 rs.room_status as status, r.created_at, r.updated_at
                 FROM " . $this->table_name . " r
                 JOIN " . $this->room_type_table . " rt ON r.room_type_id = rt.room_type_id
                 JOIN " . $this->room_status_table . " rs ON r.room_status_id = rs.room_status_id
                 WHERE r.room_id = :id AND r.is_deleted = 0";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new room
     * @param string $room_number The room number
     * @param string $room_type The room type (regular, deluxe, executive)
     * @param string $status The room status (available, occupied, maintenance, reserved)
     * @return int|bool Returns room_id on success, false on failure
     * @throws Exception If room type or status is invalid
     */
    public function create($room_number, $room_type, $status)
    {
        // First get the type and status IDs
        $type_id = $this->getRoomTypeId($room_type);
        $status_id = $this->getRoomStatusId($status);

        if (!$type_id) {
            throw new Exception("Invalid room type: " . $room_type);
        }

        if (!$status_id) {
            throw new Exception("Invalid room status: " . $status);
        }

        $query = "INSERT INTO " . $this->table_name . " 
                 (room_number, room_type_id, room_status_id, created_at, updated_at, is_deleted)
                 VALUES (:room_number, :room_type_id, :room_status_id, NOW(), NOW(), 0)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':room_number', $room_number);
        $stmt->bindParam(':room_type_id', $type_id);
        $stmt->bindParam(':room_status_id', $status_id);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }

        return false;
    }

    /**
     * Update an existing room
     */
    public function update($id, $room_number, $room_type, $status)
    {
        // First get the type and status IDs
        $type_id = $this->getRoomTypeId($room_type);
        $status_id = $this->getRoomStatusId($status);

        if (!$type_id) {
            throw new Exception("Invalid room type: " . $room_type);
        }

        if (!$status_id) {
            throw new Exception("Invalid room status: " . $status);
        }

        $query = "UPDATE " . $this->table_name . " 
                 SET room_number = :room_number, room_type_id = :room_type_id, 
                 room_status_id = :room_status_id, updated_at = NOW()
                 WHERE room_id = :id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':room_number', $room_number);
        $stmt->bindParam(':room_type_id', $type_id);
        $stmt->bindParam(':room_status_id', $status_id);
        $stmt->bindParam(':id', $id);

        return $stmt->execute();
    }

    /**
     * Update room status
     */
    public function updateStatus($id, $status)
    {
        // Get status ID
        $status_id = $this->getRoomStatusId($status);

        if (!$status_id) {
            throw new Exception("Invalid room status: " . $status);
        }

        $query = "UPDATE " . $this->table_name . " 
                 SET room_status_id = :status_id, updated_at = NOW()
                 WHERE room_id = :id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':status_id', $status_id);
        $stmt->bindParam(':id', $id);

        return $stmt->execute();
    }

    /**
     * Get room type ID by name
     */
    private function getRoomTypeId($type_name)
    {
        // Convert room type name to lowercase for case-insensitive comparison
        $type_name = strtolower($type_name);

        $query = "SELECT room_type_id FROM " . $this->room_type_table . " 
                 WHERE LOWER(type_name) = :type_name AND is_deleted = 0";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':type_name', $type_name);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $row['room_type_id'] : false;
    }

    /**
     * Get room status ID by name
     */
    private function getRoomStatusId($status_name)
    {
        // Convert status name to lowercase for case-insensitive comparison
        $status_name = strtolower($status_name);

        $query = "SELECT room_status_id FROM " . $this->room_status_table . " 
                 WHERE LOWER(room_status) = :status_name AND is_deleted = 0";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status_name', $status_name);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $row['room_status_id'] : false;
    }
}
