var fs = require('fs');
var util = require('./util.js');

var MIN_RATE = .5;
var MIN_TOTAL = 5;

var exports = module.exports;

var data = [];

exports.load = (file) => {
    console.log("Loading data");
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
        console.error(e.message);
    }
};

exports.save = (file) => {
    if(data.length <= 0) return;
    console.log("Saving data");
    try {
        let fd = fs.openSync(file, 'w');
        fs.writeSync(fd, JSON.stringify(data, null, 4));
    } catch(e) {
        console.error(e.message);
    }
};

exports.getChoices = (pos, me, board, target) => {
    var choices = [];
    for(let i in util.dirs) {
        let dir = util.dirs[i];
        let p = util.add(pos, dir);
        let rec = new Record(p, me, board);
        let rate = findWinRate(rec);
        //console.log(rec.serialize(), rate, i);
        if(rate > MIN_RATE)
            choices.push({
                dir: i,
                rate: rate,
                pos: p
            });
    }
    return choices.sort((a, b) => {
        let rateDiff = b.rate - a.rate;
        if(rateDiff != 0 || !target)
            return rateDiff;
        else
            return util.distance(a.pos, target) - util.distance(b.pos, target);
    }).map(c => c.dir);
};

var Record = function (pos, me, board, win = false) {
    Record.tolerances = {
        spaces: 5,
        spacesPred: 5,
        seesTail: 0,
        lengthDiffNear: 0,
    };
    Record.weights = {
        spaces: 4,
        spacesPred: 4,
        seesTail: 6,
        lengthDiffNear: 3,
    };

    this.win = win;

    this.serialize = () => {
        let s = {};
        for(let i in Record.tolerances)
            s[i] = this[i];
        s.win = this.win;
        return s
    };

    this.spaces = util.spaces(pos, board);
    this.spacesPred = util.spaces(pos, board, me, true);
    this.seesTail = util.seesTarget(pos, util.lastInArray(me.body), board);
    let nearby = util.nearbyEnemyHeads(pos, board, me);
    this.lengthDiffNear = nearby.length ? me.body.length - Math.max(...nearby.map(s => s.body.length)) : 1;
};

var findWinRate = (rec) => {
    let rates = {};
    for(let i in data) {
        let d = data[i];
        let name = d.name;
        rates[name] = rates[name] || {wins: 0, total: 0};
        if(Math.abs(rec[name] - d.value) <= Record.tolerances[name]) {
            if(d.win) rates[name].wins += d.count;
            rates[name].total += d.count;
        }
    }
    let totalWinRate = 1;
    for(let i in rates) {
        let r = rates[i];
        if(r.total >= MIN_TOTAL) {
            totalWinRate *= (r.wins / r.total) ** Record.weights[i];
        } else {
            console.log("Trying", i, rec[i]);
            return 2; // Encourage to try unknown things
        }
    }
    return totalWinRate;
};

exports.addData = (pos, me, board, win) => {
    let record = new Record(pos, me, board, win).serialize();
    for(let i in record) {
        if(i === 'win') continue;
        let same = false;
        for(let j in data) {
            let d = data[j];
            if(d.name !== i) continue;
            if(d.value === record[i] && d.win === record.win) {
                data[j].count++;
                same = true;
            }
        }
        if(!same) {
            data.push({
                name: i,
                value: record[i],
                win: record.win,
                count: 1
            });
        }
    }
    return record;
};
