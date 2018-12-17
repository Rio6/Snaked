var exports = exports.exports = module.exports;

var dirs = exports.dirs = {
    up: {x: 0, y: -1},
    right: {x: 1, y: 0},
    down: {x: 0, y: 1},
    left: {x: -1, y: 0}
};

var distance = exports.distance = (a, b) => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

var add = exports.add = (a, b) => {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
};

var new2dArray = exports.new2dArray = (s1, s2) => {
    var a = new Array(s1);
    for(let i = 0; i < s1; i++)
        a[i] = new Array(s2);
    return a;
};

var copy2dArray = exports.copy2dArray = a => {
    return a.map(arr => arr.slice());
};

var lastInArray = exports.lastInArray = a => {
    return a[a.length-1];
};

var parseArguments = exports.parseArguments = () => {
    var args = {};
    var key = null;

    let argv = process.argv;
    for (let arg of argv) {
        if (arg.slice(0, 1) === "-") {
            key = e.slice(1);
            args[key] = true;
        } else if(key) {
            args[key] = arg;
        }
    }
    return args;
};

var inside = exports.inside = (pos, board) => {
    return (
        pos.x >= 0 &&
        pos.x < board.width &&
        pos.y >= 0 &&
        pos.y < board.height
    );
};

var getSnake = exports.getSnake = (pos, board) => {
    for(let snake of board.snakes) {
        if(snake.health === 0) continue;
        for(let i in snake.body) {
            if(distance(snake.body[i], pos) === 0) {
                return snake;
            }
        }
    }
    return null;
};

var blocked = exports.blocked = (pos, board) => {
    if(!inside(pos, board))
        return true;
    if(getSnake(pos, board) != null)
        return true;
    return false;
};

var nearbyEnemyHeads = exports.nearbyEnemyHeads = (pos, board, me) => {
    let snakes = [];
    for(let snake of board.snakes) {
        if(snake.id === me.id) continue;
        if(snake.health === 0) continue;
        if(distance(snake.body[0], pos) === 1)
            snakes.push(snake);
    }
    return snakes;
};

var spaces = exports.spaces = (pos, board, me, predict = false, checked = new2dArray(board.width, board.height)) => {
    if(predict) {
        let snakeHere = getSnake(pos, board);
        // Ignore tail
        if(!snakeHere || distance(lastInArray(snakeHere.body), pos) !== 0) {
            // But look at heads
            if(nearbyEnemyHeads(pos, board, me).length > 0) return 0;
            if(blocked(pos, board)) return 0;
        }
    } else if(blocked(pos, board)) return 0;

    checked[pos.x][pos.y] = true;

    let count = 1;
    for(let i in dirs) {
        let dir = dirs[i];
        let nextPos = add(pos, dir);
        if(inside(nextPos, board) && !checked[nextPos.x][nextPos.y]) {
            count += spaces(nextPos, board, me, predict, checked);
        }
    }
    return count;
};

var seesTarget = exports.seesTarget = (pos, target, board, checked = new2dArray(board.width, board.height)) => {
    if(blocked(pos, board)) return false;
    if(distance(target, pos) === 1) return true;

    checked[pos.x][pos.y] = true;

    for(let i in dirs) {
        let dir = dirs[i];
        let nextPos = add(pos, dir);
        if(inside(nextPos, board) && !checked[nextPos.x][nextPos.y]) {
            if(seesTarget(nextPos, target, board, checked))
                return true;
        }
    }
    return false;
};

