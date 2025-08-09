<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods,Authorization');


include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getAddon($db, $_GET['id']);
        } else {
            getAllAddons($db);
        }
        break;
    case 'POST':
        createAddon($db);
        break;
    case 'PUT':
        updateAddon($db);
        break;
    case 'DELETE':
        if (isset($_GET['id'])) {
            deleteAddon($db, $_GET['id']);
        }
        break;
}

// Fetch all addons
function getAllAddons($db)
{
    try {
        $query = "SELECT a.addon_id, a.name, a.price, a.is_available, a.category_id, ac.category_name 
                  FROM Addon a 
                  LEFT JOIN AddonCategory ac ON a.category_id = ac.category_id 
                  WHERE a.is_deleted = FALSE";

        $params = [];

        // Handle search parameter - search in both name and category using LIKE '%search%'
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $searchTerm = '%' . $_GET['search'] . '%';
            $query .= " AND (a.name LIKE :search OR ac.category_name LIKE :search)";
            $params[':search'] = $searchTerm;
        }

        // Handle category filter
        if (isset($_GET['category']) && !empty($_GET['category']) && is_numeric($_GET['category'])) {
            $query .= " AND a.category_id = :category_id";
            $params[':category_id'] = $_GET['category'];
        }

        $query .= " ORDER BY a.name";

        $stmt = $db->prepare($query);

        // Bind parameters if any
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'data' => $results ?: []]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// Fetch a single addon by ID
function getAddon($db, $id)
{
    $query = "SELECT a.*, ac.category_name 
              FROM Addon a 
              LEFT JOIN AddonCategory ac ON a.category_id = ac.category_id 
              WHERE a.addon_id = :id AND a.is_deleted = FALSE";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo json_encode($result);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Addon not found']);
    }
}

// Create a new addon
function createAddon($db)
{
    $data = json_decode(file_get_contents("php://input"));

    try {
        $query = "INSERT INTO Addon (category_id, name, is_available, price) 
                 VALUES (:category_id, :name, :is_available, :price)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':category_id' => $data->category_id,
            ':name' => $data->name,
            ':is_available' => isset($data->is_available) ? $data->is_available : true,
            ':price' => $data->price
        ]);

        echo json_encode(['status' => 'success', 'message' => 'Addon created successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// Update an existing addon
function updateAddon($db)
{
    $data = json_decode(file_get_contents("php://input"));

    // Only update fields that are provided (partial update)
    $fields = [];
    $params = [];

    if (isset($data->category_id)) {
        $fields[] = "category_id = :category_id";
        $params[':category_id'] = $data->category_id;
    }
    if (isset($data->name)) {
        $fields[] = "name = :name";
        $params[':name'] = $data->name;
    }
    if (isset($data->is_available)) {
        $fields[] = "is_available = :is_available";
        $params[':is_available'] = $data->is_available;
    }
    if (isset($data->price)) {
        $fields[] = "price = :price";
        $params[':price'] = $data->price;
    }

    // Always require addon_id
    if (!isset($data->addon_id)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'addon_id is required']);
        return;
    }
    $params[':id'] = $data->addon_id;

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No fields to update']);
        return;
    }

    $query = "UPDATE Addon SET " . implode(', ', $fields) . " WHERE addon_id = :id";
    $stmt = $db->prepare($query);

    try {
        $stmt->execute($params);
        echo json_encode(['status' => 'success', 'message' => 'Addon updated successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// Soft delete an addon
function deleteAddon($db, $id)
{
    $query = "UPDATE Addon SET is_deleted = TRUE WHERE addon_id = :id";
    $stmt = $db->prepare($query);

    try {
        $stmt->execute([':id' => $id]);
        echo json_encode(['status' => 'success', 'message' => 'Addon deleted successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

function getAddonCategories($db)
{
    $query = "SELECT category_id, category_name FROM AddonCategory WHERE is_deleted = FALSE ORDER BY category_name";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['status' => 'success', 'data' => $results]);
}
