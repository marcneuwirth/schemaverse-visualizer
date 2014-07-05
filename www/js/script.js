var schemaverse = {
    common: {
        players: [],
        color: d3.scale.category20(),
        init: function(){
            var playersInterval = setInterval(schemaverse.common.getPlayers, 300000);
        },
        symbol: function(i){
            var symbols = ["\u2640","\u2641","\u2642","\u2643","\u2644","\u2645","\u2646","\u2647","\u2648","\u2649","\u2642","\u264A","\u264B","\u264C","\u264D","\u264E","\u264F","\u2630","\u2631","\u2632","\u2633","\u2634","\u2635","\u2636","\u2637","\u2638","\u2639","\u2632","\u263A","\u263B","\u263C","\u263D","\u263E","\u263F","\u2640","\u2641","\u2642","\u2643","\u2644","\u2645","\u2646","\u2647","\u2648","\u2649","\u2642","\u264A","\u264B","\u264C","\u264D","\u264E","\u264F","\u2650","\u2651","\u2652","\u2653","\u2654","\u2655","\u2656","\u2657","\u2658","\u2659","\u2652","\u265A","\u265B","\u265C","\u265D","\u265E","\u265F"];
            var length = symbols.length;

            return symbols[i % length];
        },

        getSymbol: function(d, i) {
            if(d.conqueror_id === null){
                return "\u26aa";
            }
            else if (d.conqueror_symbol){
                return d.conqueror_symbol;
            }
            return schemaverse.common.symbol(d.conqueror_id);
        },

        getColor: function(d, i) {
            if(d.conqueror_id === null){
                return '#000';
            }
            else if (d.conqueror_color){
                return '#' + d.conqueror_color;
            }
            return schemaverse.common.color(d.conqueror_id);
        },

        getPlayers: function(callback){
            d3.json("players.json", function(data) {
                var players = schemaverse.common.players;
                for(var i = 0, length = data.players.length; i < length; i++){
                    var player = data.players[i];
                    if(player.conqueror_id){
                        players[player.conqueror_id] = player;
                    }
                }
                if(callback && typeof callback === 'function'){
                    callback();
                }
            });
        },

        movePlanets: function(vis, x, y){
            planets = vis.selectAll("text.planet")
                .transition()
                    .duration(4000)
                        .attr("transform", function(d) { return "translate(" + x(d.location_x) + "," + y(d.location_y) + ")"; });
        },

        drawPlanets: function(planetData, vis, x, y){

            planets = vis.selectAll("text.planet")
                .data(planetData, function(d){ return d.id; });

            var enter = planets.enter().append("text")
                .attr('id', function(d){ return 'planet-' + d.id; })
                .attr('dx', -5)
                .attr('dy', 5);

            if( x && y ){
                enter.attr("transform", function(d) { return "translate(" + x(d.location_x) + "," + y(d.location_y) + ")"; });
            }


            planets
                .attr("class", function(d){
                    var classes = 'dot planet';

                    if(d.conqueror_id === null){
                        classes += ' unclaimed';
                    }
                    else {
                        classes += ' player-' + d.conqueror_id;
                    }

                    if(d.description !== null){
                        classes += ' conquered';
                    }
                    return classes;
                })
                .tooltip(function(d, i) {
                    var svg = d3.select(document.createElement("svg")).attr("height", 50);
                    var player = schemaverse.common.players[d.conqueror_id];

                    g = svg.append("g");
                    g.append("text")
                        .text(schemaverse.common.getSymbol(d,i))
                        .attr("fill", schemaverse.common.getColor(d,i))
                        .attr("font-size", 50)
                        .attr("dy", "40")
                        .attr("dx", "0");
                    g.append("text")
                        .text("Owner: " + d.conqueror_name)
                        .attr("dy", "10")
                        .attr("dx", "60");
                    g.append("text")
                        .text("Location: " + d.location)
                        .attr("dy", "20")
                        .attr("dx", "60");
                    if(d.mine_limit){
                        g.append("text")
                            .text("Mine Limit: " + d.mine_limit)
                            .attr("dy", "30")
                            .attr("dx", "60");
                    }
                    if(player && player.count){
                        g.append("text")
                            .text("Total Planets: " + player.count)
                            .attr("dy", "40")
                            .attr("dx", "60");
                    }
                    if(d.action){
                        g.append("text")
                            .text(d.action)
                            .attr("dy", "50")
                            .attr("dx", "60");
                    }
                    return {
                        type: "popover",
                        title: d.name,
                        content: svg,
                        detection: "shape",
                        placement: "mouse",
                        gravity: "left",
                        displacement: [-300, -60],
                        mousemove: false
                    };
                })
                .on("mouseover.event", function(d){
                    d3.select(this).classed("selected", true);

                })
                .on("mouseout.event", function(d){
                    d3.select(this).classed("selected", false);
                })
                .attr("fill", schemaverse.common.getColor)
                .text(schemaverse.common.getSymbol);
        }
    },
    map: {
        vis: null,
        x: null,
        y: null,
        init: function(callback){
            var width = 700;
            var height = 700;
            var margin = 1;
            var extentX;
            var extentY;
            var x;
            var y;
            var xrule;
            var yrule;

            var vis = schemaverse.map.vis = d3.select("#container .main")
                .append("svg")
                .attr("width", width + margin * 2)
                .attr("height", height + margin * 2)
                .attr("class", "map")
                .append("g")
                .attr("transform", "translate(" + margin + "," + margin + ")");

            vis.append("rect")
                .attr("width", width)
                .attr("height", height);

            var $growl = $('.growl').append('<ul />').growl();
            var tic = -1;
            var currentTic;

            function getPlanets(callback){

                d3.json("planets.json", function(data) {
                    var planetData = data.planets;

                    schemaverse.common.players.map(function(d){
                        d.count = 0;
                    });

                    planetData.map(function(d){
                        d.location_x = parseFloat(d.location_x, 10);
                        d.location_y = parseFloat(d.location_y, 10);
                        d.conqueror_id = parseInt(d.conqueror_id, 10) || null;
                        if(schemaverse.common.players[d.conqueror_id]){
                            d.conqueror_name = schemaverse.common.players[d.conqueror_id].conqueror_name;
                            d.conqueror_color = schemaverse.common.players[d.conqueror_id].rgb;
                            d.conqueror_symbol = schemaverse.common.players[d.conqueror_id].symbol;
                            schemaverse.common.players[d.conqueror_id].count++;
                        }

                        if(d.description !== null && d.tic !== null){
                            currentTic = parseInt(d.tic, 10);
                            if(currentTic > tic){
                                $growl.growl_add(d.description);
                            }
                        }
                    });

                    tic = currentTic;

                    if( x === undefined && y === undefined){

                        extentX = d3.extent(planetData, function(d){
                            return d.location_x;
                        });

                        extentY = d3.extent(planetData, function(d){
                            return d.location_y;
                        });

                        x = schemaverse.map.x = d3.scale.linear()
                            .range([0, width])
                            .domain(extentX)
                            .clamp(true)
                            .nice();

                        y = schemaverse.map.y = d3.scale.linear()
                            .range([height, 0])
                            .domain(extentY)
                            .clamp(true)
                            .nice();

                        xrule = vis.selectAll("g.x")
                            .data(x.ticks(10))
                            .enter().append("g")
                            .attr("class", "x");

                        xrule.append("line")
                            .attr("x1", x)
                            .attr("x2", x)
                            .attr("y1", 0)
                            .attr("y2", height);

                        yrule = vis.selectAll("g.y")
                            .data(y.ticks(10))
                            .enter().append("g")
                            .attr("class", "y");

                        yrule.append("line")
                            .attr("x1", 0)
                            .attr("x2", width)
                            .attr("y1", y)
                            .attr("y2", y);
                    }

                    if(planetData){
                        schemaverse.common.drawPlanets(planetData, vis, x, y);
                        schemaverse.common.movePlanets(vis, x, y);
                        schemaverse.closeup.getCloseup(planetData);
                    }

                    if(callback && typeof callback === 'function'){
                        callback();
                    }
                });
            }

            getPlanets(callback);
            var planetsInterval = setInterval(getPlanets, 30000);
        },
        drawRect: function(extentX, extentY){
            var vis = schemaverse.map.vis;
            var x = schemaverse.map.x;
            var y = schemaverse.map.y;

            var $rectClosup = vis.selectAll('#rect-closeup');
            if($rectClosup.empty()){
                $rectClosup = vis.append("rect").attr('id', 'rect-closeup');
            }


            if(extentX && extentY){

                var x0 = x(extentX[0]);
                var x1 = x(extentX[1]);

                var y0 = y(extentY[0]);
                var y1 = y(extentY[1]);

                console.log( 'x0: ' + x0 + ' x1: ' + x1 + ' y0: ' + y0 + ' y1: ' + y1 );
                console.log( 'x: ' + Math.abs( x1 - x0 ) + ' y: ' + Math.abs( y1 - y0 )  );

                // $rectClosup
                    // .style('display', 'block')
                    // .transition()
                    // .duration(2000)
                        // .attr('width', 75)
                        // .attr('height', 75)
                        // .attr('x', x0)
                        // .attr('y', y0);
                $rectClosup
                    .style('display', 'block')
                    .transition()
                    .duration(4000)
                        .attr('width', Math.abs( x1 - x0 ) )
                        .attr('height', Math.abs( y1 - y0 ) )
                        .attr('x', x1 )
                        .attr('y', parseFloat( y1 - Math.abs( y1 - y0 ) ));
            }
            else {

                $rectClosup.style('display', 'none');

            }
        }
    },

    closeup: {
        init: function(){
            var width = 300;
            var height = 300;
            var margin = 1;
            var extentX;
            var extentY;
            var x;
            var y;
            var xrule;
            var yrule;
            var tic = -1;
            var first = true;

            var vis = d3.select("#container .left")
                .append("svg")
                .attr("width", width + margin * 2)
                .attr("height", height + margin * 2)
                .attr("class", "closeup")
                .append("g")
                .attr("transform", "translate(" + margin + "," + margin + ")")
                .style('display', 'none');

            vis.append("rect")
                    .attr("width", width)
                    .attr("height", height);

            schemaverse.closeup.getCloseup = function(planetData){

                if(planetData && !first){
                    schemaverse.common.drawPlanets(planetData, vis);
                }

                d3.json("closeup.json", function(data) {
                    var closeup = data.closeup;
                    var currentTic = closeup.tic;


                    if(currentTic){
                        currentTic = parseInt(currentTic, 10);
                        if(currentTic < tic){
                            location.href = location.href;
                        }
                        else if( !isNaN(currentTic)){
                            tic = currentTic;
                        }
                    }
                    console.log(tic);

                    if(closeup.box) {

                        var box = closeup.box.replace(/[\(\)]/g,'').split(',');
                        console.log( box );
                        if( box.length === 4){
                            extentX = [box[0], box[2]];
                            extentY = [box[1], box[3]];

                            vis.style('display', 'block');

                            d3.selectAll('.logo img')
                                .style('height', '90px');

                            x = d3.scale.linear()
                                .range([width, 0])
                                .domain(extentX)
                                .clamp(false)
                                .nice();

                            y = d3.scale.linear()
                                .range([0, height])
                                .domain(extentY)
                                .clamp(false)
                                .nice();

                            xrule = vis.selectAll("g.x")
                                .data(x.ticks(10))
                                .enter().append("g")
                                .attr("class", "x");

                            xrule.append("line")
                                .attr("x1", x)
                                .attr("x2", x)
                                .attr("y1", 0)
                                .attr("y2", height);

                            yrule = vis.selectAll("g.y")
                                .data(y.ticks(10))
                                .enter().append("g")
                                .attr("class", "y");

                            yrule.append("line")
                                .attr("x1", 0)
                                .attr("x2", width)
                                .attr("y1", y)
                                .attr("y2", y);




                            schemaverse.map.drawRect(extentX, extentY);
                            if(first){
                                first = false;
                                schemaverse.common.drawPlanets(planetData, vis, x, y);
                            }
                            else {
                                schemaverse.common.movePlanets(vis, x, y);
                            }


                            return;
                        }
                    }

                    vis.style('display', 'none');
                    d3.selectAll('.logo img')
                        .style('height', null);
                    schemaverse.map.drawRect();
                });
            };

        },
        getCloseup: function(){}
    },

    leader_board: {
        init: function(){

            function getLeaderBoard(){
                var $table = d3.select("#container .left table tbody");
                var html = '';

                d3.json("leaderboard.json", function(data) {
                    var leaderboard = data.leader_board;
                    if(leaderboard){
                        for(var i = 0, length = leaderboard.length; i < length; i++){
                            var player = leaderboard[i];
                            var rgb = player.rgb || schemaverse.common.color(player.id);
                            if(rgb[0] !== '#'){
                                rgb = '#' + rgb;
                            }
                            html += '<tr class="player-row" data-player-id="' + player.id + '">';
                            html += '<td class="symbol" style="color:' + rgb + '">' + (player.symbol || schemaverse.common.symbol(player.id)) + '</td>';
                            html += '<td>' + player.username + '</td>';
                            html += '<td>' + player.networth + '</td>';
                            html += '<td>' + player.ships + '</td>';
                            html += '<td>' + player.planets + '</td>';
                            html += '</tr>';
                        }
                    }
                    $table.html(html);

                    $table.selectAll('tr.player-row')
                        .on("mouseover.event", function(d){
                            var id = d3.select(this).attr('data-player-id');
                            d3.select('.map').classed('hover', true);
                            d3.selectAll('.map text.player-' + id).classed('hovered', true);
                        })
                        .on("mouseout.event", function(d){
                            d3.select('.map').classed('hover', false);
                            d3.selectAll('.map text').classed('hovered', false);
                        });
                });
            }

            getLeaderBoard();
            var leaderboardInterval = setInterval(getLeaderBoard, 30000);


        }
    }
};
schemaverse.closeup.init();
schemaverse.common.getPlayers(function(){
    schemaverse.map.init(function(){

    });
    schemaverse.leader_board.init();
    var playerInterval = setInterval(schemaverse.common.getPlayers, 120000);

});