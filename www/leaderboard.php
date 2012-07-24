<?php
require '../setup.php';
header("Content-type: application/json");

if(class_exists('Memcached')) {
    $m = new Memcached();
    $m->addServer('localhost', 11211);

    $leader_board = $m->get('leader_board');
}

if ($leader_board){
    echo $leader_board;
}
else {
    @$conn = connect();
    if (!$conn) {
        echo json_encode(array('leader_board' => array()));
        exit;
    }

    @$result = pg_query($conn, "SELECT * FROM leader_board");
    if (!$result) {
        echo json_encode(array('leader_board' => array()));
        exit;
    }

    $arr = pg_fetch_all($result);
    $leader_board = json_encode(array('leader_board' => $arr));
    if($m){
        $m->set('leader_board', $leader_board, 30);
    }
    echo $leader_board;
    pg_close($conn);
}
?>
