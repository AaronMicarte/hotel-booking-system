<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../../config/database.php';

class Addon
{
    private $db;
    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function getAllAddons()
    {
        $params = [];
        $query = "SELECT a.addon_id, a.name, a.price, a.is_available, a.category_id, ac.category_name
                  FROM Addon a
                  LEFT JOIN AddonCategory ac ON a.category_id = ac.category_id
                  WHERE a.is_deleted = FALSE";
        if (!empty($_GET['search'])) {
            $query .= " AND (a.name LIKE :search OR ac.category_name LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        if (!empty($_GET['category']) && is_numeric($_GET['category'])) {
            $query .= " AND a.category_id = :category_id";
            $params[':category_id'] = $_GET['category'];
        }
        $query .= " ORDER BY a.name";
        try {
            $stmt = $this->db->prepare($query);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($results ?: []);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([]);
        }
    }

    public function getAddon($json)
    {
        $data = json_decode($json, true);
        $id = isset($data['addon_id']) ? $data['addon_id'] : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode([]);
            return;
        }
        $query = "SELECT a.*, ac.category_name
                  FROM Addon a
                  LEFT JOIN AddonCategory ac ON a.category_id = ac.category_id
                  WHERE a.addon_id = :id AND a.is_deleted = FALSE";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($result ?: []);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([]);
        }
    }

    public function createAddon($json)
    {
        $data = json_decode($json, true);
        if (!$data || !isset($data['category_id'], $data['name'], $data['price'])) {
            http_response_code(400);
            echo json_encode(0);
            return;
        }
        $query = "INSERT INTO Addon (category_id, name, is_available, price)
                  VALUES (:category_id, :name, :is_available, :price)";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':category_id' => $data['category_id'],
                ':name' => $data['name'],
                ':is_available' => isset($data['is_available']) ? $data['is_available'] : true,
                ':price' => $data['price']
            ]);
            echo json_encode(1);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(0);
        }
    }

    public function updateAddon($json)
    {
        $data = json_decode($json, true);
        if (!$data || !isset($data['addon_id'])) {
            http_response_code(400);
            echo json_encode(0);
            return;
        }
        $fields = [];
        $params = [];
        if (isset($data['category_id'])) {
            $fields[] = "category_id = :category_id";
            $params[':category_id'] = $data['category_id'];
        }
        if (isset($data['name'])) {
            $fields[] = "name = :name";
            $params[':name'] = $data['name'];
        }
        if (isset($data['is_available'])) {
            $fields[] = "is_available = :is_available";
            $params[':is_available'] = $data['is_available'];
        }
        if (isset($data['price'])) {
            $fields[] = "price = :price";
            $params[':price'] = $data['price'];
        }
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(0);
            return;
        }
        $params[':id'] = $data['addon_id'];
        $query = "UPDATE Addon SET " . implode(', ', $fields) . " WHERE addon_id = :id";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            echo json_encode(1);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(0);
        }
    }

    public function deleteAddon($json)
    {
        $data = json_decode($json, true);
        $id = isset($data['addon_id']) ? $data['addon_id'] : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(0);
            return;
        }
        $query = "UPDATE Addon SET is_deleted = TRUE WHERE addon_id = :id";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute([':id' => $id]);
            echo json_encode(1);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(0);
        }
    }

    public function getAddonCategories()
    {
        $query = "SELECT category_id, category_name FROM AddonCategory WHERE is_deleted = FALSE ORDER BY category_name";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($results);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([]);
        }
    }
}

// Request handling
$operation = '';
$json = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : file_get_contents('php://input');
}

$addon = new Addon();
switch ($operation) {
    case 'getAllAddons':
        $addon->getAllAddons();
        break;
    case 'getAddon':
        $addon->getAddon($json);
        break;
    case 'createAddon':
        $addon->createAddon($json);
        break;
    case 'updateAddon':
        $addon->updateAddon($json);
        break;
    case 'deleteAddon':
        $addon->deleteAddon($json);
        break;
    case 'getAddonCategories':
        $addon->getAddonCategories();
        break;
    default:
        http_response_code(400);
        echo json_encode([]);
        break;
}
