var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;

var Server = require('./server.js');
var SnakeBrain = require('./brain.js');

const PORT = process.env.PORT || 8000;
const ENGINE = process.env.ENGINE || './engine';

var config = {
    GAME_INTERVAL: 100, // in ms
    GAMES_PER_BATCH: 25,

    BRAIN_FILE: "brain.json",
    BRAIN_DUMP_INTERVAL: 1, // in times
    GAME_URL: "http://localhost:3009/?engine=http://localhost:3005&game=",

    POP_SIZE: 500,
    MUTATION_RATE: 0.3,
    ELITISM: 10
};

var main = () => {
    let server = new Server(PORT);

    let brain = null;
    if(fs.existsSync(config.BRAIN_FILE)) {
        console.log("Loading brain file");
        brain = new SnakeBrain(config, fs.readFileSync(config.BRAIN_FILE));
    } else {
        brain = new SnakeBrain(config);
    }

    let games = {};
    let snakes = [];
    let dumpCounter = 0;

    server.on('serverStart', () => {
        console.log("Listening on", PORT);
        games = {};
        snakes = [];
        startGames();
    });

    server.on('gameStart', data => {
        let gameId = data.game.id;

        if(!games[gameId]) {
            games[gameId] = {
                running: true
            };
        }

        snakes.push({
            id: data.you.id,
            gameId: gameId
        });
    });

    server.on('gameEnd', data => {
        let gameId = data.game.id;
        if(!games[gameId] || !games[gameId].running) return
        games[gameId].running = false;

        if(Object.values(games).every(g => !g.running)) {
            // all games in batch ended
            if(snakes.length >= config.POP_SIZE) {
                // generation ended

                // award the winner
                let winner = data.board.snakes.find(s => s.health > 0);
                if(winner) {
                    let index = snakes.findIndex(s => s.id === winner.id);
                    brain.award(index, 1, true);
                }

                // train the big brain
                let best = brain.evolve();
                console.log("Best game", config.GAME_URL + snakes[best].gameId);

                // dump the big brain
                dumpCounter++;
                if(dumpCounter >= config.BRAIN_DUMP_INTERVAL) {
                    console.log("Dumping brain");
                    fs.writeFileSync(config.BRAIN_FILE, brain.dump());
                    dumoCounter = 0;
                }

                // reset game data
                games = {};
                snakes = [];
            }

            setTimeout(startGames, config.GAME_INTERVAL);
        }
    });

    server.on('move', (data, move) => {
        if(!games[data.game.id]) return;

        let index = snakes.findIndex(s => s.id === data.you.id && s.gameId === data.game.id);
        let dir = brain.think(index, data.you, data.board);
        brain.award(index, data.turn);

        if(dir)
            move(dir);
        else
            move("left");
    });

    server.start();
};

var startGames = () => {
    console.log("Starting", config.GAMES_PER_BATCH, "games");

    for(let i = 0; i < config.GAMES_PER_BATCH; i++) {
        exec(ENGINE + ' create', {stdio: 'ignore'}, (err, stdout, stderr) => {
            try {
                let id = JSON.parse(stdout).ID;
                exec(ENGINE + ' run -g ' + id, {stdio: 'ignore'});
            } catch(e) {
                console.log("Error starting games", stdout, stderr);
            }
        });
    }

    if(false) {
        setTimeout(() => {
            console.log("Retrying game start")
            startGames();
        }, 1000);
    }
};

main();
//require('repl').start({preview: false}).on('exit', process.exit);
