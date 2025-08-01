<?php
class Dashboard
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Get total number of rooms
     */
    public function getTotalRooms()
    {
        $query = "SELECT COUNT(*) as total FROM Room WHERE is_deleted = 0";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total'] ?? 0;
    }

    /**
     * Get number of available rooms
     */
    public function getAvailableRooms()
    {
        $query = "SELECT COUNT(*) as available FROM Room r 
                  JOIN RoomStatus rs ON r.room_status_id = rs.room_status_id
                  WHERE rs.room_status = 'available' AND r.is_deleted = 0";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['available'] ?? 0;
    }

    /**
     * Get total number of guests
     */
    public function getTotalGuests()
    {
        $query = "SELECT COUNT(*) as total FROM Guest WHERE is_deleted = 0";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total'] ?? 0;
    }

    /**
     * Get number of active reservations
     */
    public function getActiveReservations()
    {
        $query = "SELECT COUNT(*) as active FROM Reservation r
                  JOIN ReservationStatus rs ON r.reservation_status_id = rs.reservation_status_id
                  WHERE rs.room_status IN ('confirmed', 'checked-in') AND r.is_deleted = 0";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['active'] ?? 0;
    }

    /**
     * Get total revenue
     */
    public function getTotalRevenue()
    {
        $query = "SELECT SUM(amount_paid) as total FROM Payment WHERE is_deleted = 0";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total'] ?? 0;
    }

    /**
     * Get recent reservations
     */
    public function getRecentReservations($limit = 10)
    {
        $query = "SELECT r.reservation_id as id, 
                  CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                  r.check_in_date, r.check_out_date, rs.room_status as status
                  FROM Reservation r
                  JOIN Guest g ON r.guest_id = g.guest_id
                  JOIN ReservationStatus rs ON r.reservation_status_id = rs.reservation_status_id
                  WHERE r.is_deleted = 0
                  ORDER BY r.created_at DESC
                  LIMIT :limit";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get room status distribution
     */
    public function getRoomStatusDistribution()
    {
        $query = "SELECT rs.room_status as status, COUNT(*) as count 
                  FROM Room r
                  JOIN RoomStatus rs ON r.room_status_id = rs.room_status_id
                  WHERE r.is_deleted = 0
                  GROUP BY rs.room_status";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $distribution = [];
        foreach ($results as $row) {
            $distribution[$row['status']] = (int)$row['count'];
        }

        return $distribution;
    }

    /**
     * Get revenue by date range
     */
    public function getRevenueByDateRange($startDate, $endDate)
    {
        $query = "SELECT 
                    DATE(payment_date) as date,
                    SUM(amount_paid) as amount
                  FROM Payment
                  WHERE is_deleted = 0 
                  AND payment_date BETWEEN :start_date AND :end_date
                  GROUP BY DATE(payment_date)
                  ORDER BY date";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get booking count by date range
     */
    public function getBookingCountByDateRange($startDate, $endDate)
    {
        $query = "SELECT 
                    DATE(created_at) as date,
                    COUNT(reservation_id) as count
                  FROM Reservation
                  WHERE is_deleted = 0 
                  AND created_at BETWEEN :start_date AND :end_date
                  GROUP BY DATE(created_at)
                  ORDER BY date";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
