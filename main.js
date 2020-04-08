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
    GAME_TIMEOUT: 60 * 1000, // in ms
    MAX_GAMES: 100,

    BRAIN_FILE: "memory.json",
    BRAIN_DUMP_INTERVAL: 1, // in times
    GAME_URL: "http://localhost:3009/?engine=http://localhost:3005&game=",

    POP_SIZE: 500,
    MUTATION_RATE: 1,
    ELITISM: 10
};

var brain = null;
var snakes = [];
var games = {};

var dumpCounter = 0;
var gameTimeout = null;

var main = () => {
    let server = new Server(PORT);

    if(fs.existsSync(config.BRAIN_FILE)) {
        console.log("Loading brain file");
        brain = new SnakeBrain(config, fs.readFileSync(config.BRAIN_FILE));
    } else {
        brain = new SnakeBrain(config);
    }

    server.on('serverStart', () => {
        console.log("Listening on", PORT);
        snakes = [];
        startGames();
    });

    server.on('gameStart', data => {
        games[data.game.id] = true;

        snakes.push({
            id: data.you.id,
            gameId: data.game.id,
            score: 0,
            running: true,
            startTime: Date.now()
        });
    });

    server.on('gameEnd', data => {
        delete games[data.game.id];

        let snake = snakes.find(s => s.id === data.you.id);
        if(!snake) return;

        snake.running = false;

        // final score
        if(data.board.snakes.find(s => s.id === data.you.id && s.health > 0))
            snake.score = data.turn + 10; // winner
        else
            snake.score = data.turn;

        tryLearn();
    });

    server.on('move', (data, move) => {
        let index = snakes.findIndex(s => s.id === data.you.id && s.gameId === data.game.id);
        move(brain.think(index, data.you, data.board));
    });

    server.start();
};

var startGames = () => {
    if(gameTimeout) clearTimeout(gameTimeout);

    // set game status for inactive games
    let now = Date.now();
    let dead = snakes.filter(s => s.running && now - s.startTime > config.GAME_TIMEOUT)
        .map(s => s.running = false).length;

    if(dead > 0) {
        console.warn(dead, "snakes timed out");
        tryLearn();
    }

    // start more games when there's no enough snakes
    if(Object.keys(games).length < config.MAX_GAMES && snakes.length < config.POP_SIZE) {
        exec(ENGINE + ' create', {stdio: 'ignore'}, (err, stdout, stderr) => {
            try {
                let id = JSON.parse(stdout).ID;
                exec(ENGINE + ' run -g ' + id, {stdio: 'ignore'});
            } catch(e) {
                console.log("Error starting games", stdout, stderr);
            }
        });
    }

    gameTimeout = setTimeout(startGames, config.GAME_INTERVAL);
};

var stopGames = () => clearTimeout(gameTimeout);

var tryLearn = () => {
    if(snakes.length < config.POP_SIZE) return;

    let canLearn = true;
    for(let i = 0; i < config.POP_SIZE; i++) {
        if(snakes[i].running) {
            canLearn = false;
            break;
        }
    }

    if(canLearn) {
        // train the big brain
        brain.setScores(snakes.map(s => s.score));
        let best = brain.evolve();
        console.log("Best game", config.GAME_URL + snakes[best].gameId);

        // dump the big brain
        dumpCounter++;
        if(dumpCounter >= config.BRAIN_DUMP_INTERVAL) {
            console.log("Dumping brain");
            fs.writeFileSync(config.BRAIN_FILE, brain.dump());
            dumpCounter = 0;
        }

        snakes = [];
    }
};

main();
//require('repl').start({preview: false}).on('exit', process.exit);
