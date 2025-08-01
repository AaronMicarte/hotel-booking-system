<?php
class MasterData
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // Guest ID Types
    public function getGuestIDTypes()
    {
        $query = "SELECT * FROM GuestIDType WHERE is_deleted = 0 AND is_active = 1 ORDER BY id_type_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Reservation Status
    public function getReservationStatuses()
    {
        $query = "SELECT * FROM ReservationStatus WHERE is_deleted = 0 AND is_active = 1 ORDER BY status_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Room Status
    public function getRoomStatuses()
    {
        $query = "SELECT * FROM RoomStatus WHERE is_deleted = 0 AND is_active = 1 ORDER BY status_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Room Types
    public function getRoomTypes()
    {
        $query = "SELECT * FROM RoomType WHERE is_deleted = 0 AND is_active = 1 ORDER BY price_per_stay";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Billing Status
    public function getBillingStatuses()
    {
        $query = "SELECT * FROM BillingStatus WHERE is_deleted = 0 AND is_active = 1 ORDER BY status_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Addon Categories
    public function getAddonCategories()
    {
        $query = "SELECT * FROM AddonCategory WHERE is_deleted = 0 AND is_active = 1 ORDER BY category_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Addons with Category
    public function getAddons($category_id = null)
    {
        $query = "SELECT a.*, ac.category_name, ac.category_code 
                  FROM Addon a 
                  JOIN AddonCategory ac ON a.addon_category_id = ac.addon_category_id
                  WHERE a.is_deleted = 0 AND a.is_available = 1";

        if ($category_id) {
            $query .= " AND a.addon_category_id = :category_id";
        }

        $query .= " ORDER BY ac.category_name, a.addon_name";

        $stmt = $this->conn->prepare($query);

        if ($category_id) {
            $stmt->bindParam(':category_id', $category_id);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Payment Method Categories
    public function getPaymentMethodCategories()
    {
        $query = "SELECT * FROM PaymentMethodCategory WHERE is_deleted = 0 AND is_active = 1 ORDER BY category_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Payment Methods with Category
    public function getPaymentMethods($category_id = null)
    {
        $query = "SELECT pm.*, pmc.category_name, pmc.category_code 
                  FROM PaymentMethod pm 
                  JOIN PaymentMethodCategory pmc ON pm.payment_method_category_id = pmc.payment_method_category_id
                  WHERE pm.is_deleted = 0 AND pm.is_active = 1";

        if ($category_id) {
            $query .= " AND pm.payment_method_category_id = :category_id";
        }

        $query .= " ORDER BY pmc.category_name, pm.method_name";

        $stmt = $this->conn->prepare($query);

        if ($category_id) {
            $stmt->bindParam(':category_id', $category_id);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get all master data at once
    public function getAllMasterData()
    {
        return [
            'guest_id_types' => $this->getGuestIDTypes(),
            'reservation_statuses' => $this->getReservationStatuses(),
            'room_statuses' => $this->getRoomStatuses(),
            'room_types' => $this->getRoomTypes(),
            'billing_statuses' => $this->getBillingStatuses(),
            'addon_categories' => $this->getAddonCategories(),
            'addons' => $this->getAddons(),
            'payment_method_categories' => $this->getPaymentMethodCategories(),
            'payment_methods' => $this->getPaymentMethods()
        ];
    }

    // Room Type by Code
    public function getRoomTypeByCode($type_code)
    {
        $query = "SELECT * FROM RoomType WHERE type_code = :type_code AND is_deleted = 0 AND is_active = 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':type_code', $type_code);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
