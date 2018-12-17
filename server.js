var express = require('express');
var bodyParser = require('body-parser');
var data = require('./data.js');
var util = require('./util.js');

var args = util.parseArguments();

const PORT = process.env.PORT || 8000;
const DATA_FILE = args.d || 'data.json';

data.load(DATA_FILE);

var frames = {};
var gameCount = 0;

var app = express();

app.use(bodyParser.json())

app.post('/start', (req, res) => {
    console.log("Starting game", req.body.game.id);
    frames[req.body.game.id] = [];
    res.json({
        color: "#ffdd00"
    });
});

app.post('/move', (req, res) => {
    var dir = 'down';

    let me = req.body.you
    let head = me.body[0];
    let board = req.body.board;

    var food = board.food.slice().sort((a, b) => util.distance(a, head) - util.distance(b, head))[0];

    choices = data.getChoices(head, me, board, food);
    console.log(req.body.turn, choices);
    if(choices.length > 0)
        dir = choices[0];

    let frame = req.body;
    frame.dir = dir;
    frame.choices = choices;
    frames[frame.game.id][frame.turn] = frame;
    res.json({
        move: dir
    });
});

app.post('/end', (req, res) => {

    if(req.body.turn <= 1) {
        console.log("Ignoring dummy game");
        res.send("bleh");
        return;
    }

    console.log("Ended game", "http://play.battlesnake.io/games/" + req.body.game.id);

    let win = false;
    if(req.body.board.snakes.filter(snake => snake.health > 0 && snake.name === req.body.you.name).length > 0) {
        console.log("Won");
        // Won it
        win = true;
    } else console.log("Lost");

    for(let i = frames[req.body.game.id].length-1; i >= 0; i--) {
        let frame = frames[req.body.game.id][i];
        let me = frame.you;
        let head = me.body[0];
        let board = frame.board;
        if(!win && frame.choices.length <= 1)
            continue;
        let rec = data.addData(util.add(head, util.dirs[frame.dir]), me, board, win);
        if(!win) console.log(rec);
        win = true;
    }
    frames[req.body.game.id] = [];

    gameCount++;
    if(gameCount % 5 === 0)
        data.save(DATA_FILE);

    res.send("blah");
});

app.post('/ping', (req, res) => {
    res.send("pong");
});

app.all('/', (req, res) => {
    res.status(418);
    res.send("Code 418");
});

var server = app.listen(PORT, function () {
    console.log("Listening on port", server.address().port);
});

var onexit = () => {
    data.save(DATA_FILE);
    process.exit();
};

process.on('SIGTERM', onexit);
process.on('SIGINT', onexit);
