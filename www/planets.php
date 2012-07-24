<?php
require '../setup.php';
header("Content-type: application/json");

if(class_exists('Memcached')) {
	$m = new Memcached();
	$m->addServer('localhost', 11211);

	$planets = $m->get('planets');
}

if ($planets){
	echo $planets;
}
else {
	@$conn = connect();
	if (!$conn) {
		echo json_encode(array('planets' => array()));
		exit;
	}

	@$result = pg_query($conn, "SELECT
			planets.*,
			event.id as event_id,
			READ_EVENT(event.id) as description,
			event.action as action,
            event.tic as tic
		FROM planets
		LEFT JOIN event on (
            event.location <-> planets.location < 1000 and
            action in ('CONQUER') and
            event.tic = (SELECT last_value - 1 FROM tic_seq)
        )

	");
	if (!$result) {
		echo json_encode(array('planets' => array()));
		exit;
	}

	$arr = pg_fetch_all($result);
	$planets = json_encode(array('planets' => $arr));
	if($m){
		$m->set('planets', $planets, 30);
	}
	echo $planets;
	pg_close($conn);
}
?>
