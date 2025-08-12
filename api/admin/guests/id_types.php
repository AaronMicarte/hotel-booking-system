<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class GuestIDType
{
    function getAllIDTypes()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT * FROM GuestIDType WHERE is_deleted = 0 ORDER BY id_type";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertIDType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "INSERT INTO GuestIDType (id_type) VALUES (:id_type)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":id_type", $json['id_type']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }
        echo json_encode($returnValue);
    }

    function getIDType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT * FROM GuestIDType WHERE guest_idtype_id = :guest_idtype_id AND is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_idtype_id", $json['guest_idtype_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateIDType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE GuestIDType SET id_type = :id_type WHERE guest_idtype_id = :guest_idtype_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":id_type", $json['id_type']);
        $stmt->bindParam(":guest_idtype_id", $json['guest_idtype_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteIDType($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE GuestIDType SET is_deleted = 1 WHERE guest_idtype_id = :guest_idtype_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_idtype_id", $json['guest_idtype_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }
}

// Request handling
$operation = '';
$json = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
    $json = isset($_GET['json']) ? $_GET['json'] : '';
    if (!$operation) {
        if (isset($_GET['guest_idtype_id'])) {
            $operation = 'getIDType';
            $json = json_encode(['guest_idtype_id' => $_GET['guest_idtype_id']]);
        } else {
            $operation = 'getAllIDTypes';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$idtype = new GuestIDType();
switch ($operation) {
    case "getAllIDTypes":
        $idtype->getAllIDTypes();
        break;
    case "insertIDType":
        $idtype->insertIDType($json);
        break;
    case "getIDType":
        $idtype->getIDType($json);
        break;
    case "updateIDType":
        $idtype->updateIDType($json);
        break;
    case "deleteIDType":
        $idtype->deleteIDType($json);
        break;
}
