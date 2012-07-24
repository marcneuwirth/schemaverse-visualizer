<?php
require '../setup.php';
header("Content-type: application/json");

if(class_exists('Memcached')) {
	$m = new Memcached();
	$m->addServer('localhost', 11211);

	$players = $m->get('players');
}

if ($players){
	echo $players;
}
else {
	@$conn = connect();
	if (!$conn) {
		echo json_encode(array('players' => array()));
		exit;
	}

	@$result = pg_query($conn, "SELECT conqueror_id,
        get_player_username(conqueror_id) AS conqueror_name, get_player_symbol(conqueror_id) AS symbol, get_player_rgb(conqueror_id) AS rgb
        FROM planets GROUP BY conqueror_id
    ");
	if (!$result) {
		echo json_encode(array('players' => array()));
		exit;
	}

	$arr = pg_fetch_all($result);
	$players = json_encode(array('players' => $arr));
	if($m){
		$m->set('players', $players, 120);
	}
	echo $players;
	pg_close($conn);
}
?>
