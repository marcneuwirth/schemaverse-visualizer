<?php
require '../setup.php';
header("Content-type: application/json");

if(class_exists('Memcached')) {
    $m = new Memcached();
    $m->addServer('localhost', 11211);

    $closeup = $m->get('closeup');
}

if ($closeup){
    echo $closeup;
}
else {
    @$conn = connect();
    if (!$conn) {
        echo json_encode(array('closeup' => array()));
    }

    @$attack_event = pg_query($conn, "SELECT location,
            tic,
            BOX(CIRCLE(location,1000000)) as box,
            (
                SELECT count(1)
                FROM my_events AS count_events
                WHERE action IN ('CONQUER') AND
                    tic = (SELECT last_value - 1 FROM tic_seq) AND
                    count_events.location <-> my_events.location < 1000000

            )  AS count
        FROM my_events
        WHERE action in ('CONQUER') AND
                tic = (SELECT last_value - 1 FROM tic_seq)
        ORDER BY count DESC
        LIMIT 1"
    );

    if($attack_event){
        $row = pg_fetch_row($attack_event);
        if($row){
            $position = preg_replace('/[()]/', '', $row[0]);
            $tic = $row[1];
            $box = $row[2];

            $closeup = json_encode(array(
                'closeup' => array(
                    'position' => $position,
                    'tic' => $tic,
                    'box' => $box
                )
            ));

            if($m){
                $m->set('closeup', $closeup, 30);
            }
            echo $closeup;

        }
        else {
            echo json_encode(array('closeup' => array()));
        }
    }
    else {
        echo json_encode(array('closeup' => array()));
    }

    pg_close($conn);
}
?>
