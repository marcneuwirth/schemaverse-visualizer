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

    @$result = pg_query($conn, "
        select id, stats.username, (
            100000 + 10000
            + fuel_mined - ship_upgrades
            - ( ships_built * ( select cost from price_list where code = upper('ship') ) )
        ) networth,
        ships_built - ships_lost ships,
        planets_conquered - planets_lost planets,
        symbol, rgb
        from current_player_stats stats
        join player_list on stats.player_id = id
        where 1=1
        and fuel_mined > 0
        and ships_built > 0
        and planets_conquered >= -1
        order by
            planets_conquered - planets_lost desc,
            ships_built - ships_lost desc,
            (
                100000 + 10000
                + fuel_mined - ship_upgrades
                - ( ships_built * ( select cost from price_list where code = upper('ship') ) )
            ) desc
        limit 10
        ;

    ");
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
