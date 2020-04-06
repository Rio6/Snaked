var express = require('express');
var bodyParser = require('body-parser');
var util = require('util');
var EventEmitter = require('events');

var Server = function(port) {
    let app = express();

    app.use(bodyParser.json())

    app.post('/start', (req, res) => {
        this.emit('gameStart', req.body);
        res.json({
            color: '#ffdd00',
            headType: 'sand-worm',
            tailType: 'round-bum'
        });
    });

    app.post('/move', (req, res) => {
        let called = false;

        this.emit('move', req.body, dir => {
            called = true;
            res.json({
                move: dir,
                shout: "I'm smart, am I not?"
            });
        });

        setTimeout(() => {
            if(!called) {
                res.json({
                    move: 'up',
                    shout: "404 Brain not found"
                });
            }
        }, 150);
    });

    app.post('/end', (req, res) => {
        this.emit('gameEnd', req.body);
        res.send('yay');
    });

    app.post('/ping', (req, res) => {
        res.send('pong');
    });

    app.all('/', (req, res) => {
        res.status(418);
        res.send("Have your coffee");
    });

    this.start = () => {
        app.listen(port, () => this.emit('serverStart'));
    };
};

util.inherits(Server, EventEmitter);
module.exports = Server;
