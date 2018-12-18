var fs = require('fs');
var util = require('./util.js');

var MIN_TOTAL = 10;

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
    });
};

var Record = function (pos, me, board, win = false) {
    Record.tolerances = {
        spaces: 0,
        spacesPred: 0,
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
        rates[name] = rates[name] || {};
        if(Math.abs(rec[name] - d.value) <= Record.tolerances[name]) {
            rates[name][d.value] = rates[name][d.value] || {wins:0, total: 0};
            if(d.win) rates[name][d.value].wins += d.count;
            rates[name][d.value].total += d.count;
        }
    }
    let totalRate = 1;
    for(let i in rates) {
        for(let j in rates[i]) {
            let r = rates[i][j];
            if(r.total >= MIN_TOTAL) {
                totalRate *= (r.wins / r.total);// ** Record.weights[i];
            } else if(!i.includes('spaces')) {
                // Encourage to try unknown things, but not spaces
                // Too many spaces
                console.log("Trying", i, rec[i]);
                return 2;
            }
        }
    }
    return totalRate;
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
