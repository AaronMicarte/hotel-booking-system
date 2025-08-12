<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class Guest
{
    function getAllGuests()
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();

        $sql = "SELECT g.*, t.id_type 
                FROM Guest g 
                LEFT JOIN GuestIDType t ON g.guest_idtype_id = t.guest_idtype_id
                WHERE g.is_deleted = 0
                ORDER BY g.last_name, g.first_name";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function insertGuest($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "INSERT INTO Guest (guest_idtype_id, last_name, first_name, middle_name, suffix, date_of_birth, email, phone_number, id_number, id_picture)
                VALUES (:guest_idtype_id, :last_name, :first_name, :middle_name, :suffix, :date_of_birth, :email, :phone_number, :id_number, :id_picture)";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_idtype_id", $json['guest_idtype_id']);
        $stmt->bindParam(":last_name", $json['last_name']);
        $stmt->bindParam(":first_name", $json['first_name']);
        $stmt->bindParam(":middle_name", $json['middle_name']);
        $stmt->bindParam(":suffix", $json['suffix']);
        $stmt->bindParam(":date_of_birth", $json['date_of_birth']);
        $stmt->bindParam(":email", $json['email']);
        $stmt->bindParam(":phone_number", $json['phone_number']);
        $stmt->bindParam(":id_number", $json['id_number']);
        $stmt->bindParam(":id_picture", $json['id_picture']);
        $stmt->execute();

        $returnValue = 0;
        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }
        echo json_encode($returnValue);
    }

    function getGuest($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "SELECT g.*, t.id_type 
                FROM Guest g 
                LEFT JOIN GuestIDType t ON g.guest_idtype_id = t.guest_idtype_id
                WHERE g.guest_id = :guest_id AND g.is_deleted = 0";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_id", $json['guest_id']);
        $stmt->execute();
        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateGuest($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE Guest 
                SET guest_idtype_id = :guest_idtype_id,
                    last_name = :last_name,
                    first_name = :first_name,
                    middle_name = :middle_name,
                    suffix = :suffix,
                    date_of_birth = :date_of_birth,
                    email = :email,
                    phone_number = :phone_number,
                    id_number = :id_number,
                    id_picture = :id_picture
                WHERE guest_id = :guest_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_idtype_id", $json['guest_idtype_id']);
        $stmt->bindParam(":last_name", $json['last_name']);
        $stmt->bindParam(":first_name", $json['first_name']);
        $stmt->bindParam(":middle_name", $json['middle_name']);
        $stmt->bindParam(":suffix", $json['suffix']);
        $stmt->bindParam(":date_of_birth", $json['date_of_birth']);
        $stmt->bindParam(":email", $json['email']);
        $stmt->bindParam(":phone_number", $json['phone_number']);
        $stmt->bindParam(":id_number", $json['id_number']);
        $stmt->bindParam(":id_picture", $json['id_picture']);
        $stmt->bindParam(":guest_id", $json['guest_id']);
        $stmt->execute();

        $returnValue = $stmt->rowCount() > 0 ? 1 : 0;
        echo json_encode($returnValue);
    }

    function deleteGuest($json)
    {
        include_once '../../config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        $json = json_decode($json, true);

        $sql = "UPDATE Guest SET is_deleted = 1 WHERE guest_id = :guest_id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(":guest_id", $json['guest_id']);
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
        if (isset($_GET['guest_id'])) {
            $operation = 'getGuest';
            $json = json_encode(['guest_id' => $_GET['guest_id']]);
        } else {
            $operation = 'getAllGuests';
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
}

$guest = new Guest();
switch ($operation) {
    case "getAllGuests":
        $guest->getAllGuests();
        break;
    case "insertGuest":
        $guest->insertGuest($json);
        break;
    case "getGuest":
        $guest->getGuest($json);
        break;
    case "updateGuest":
        $guest->updateGuest($json);
        break;
    case "deleteGuest":
        $guest->deleteGuest($json);
        break;
}
