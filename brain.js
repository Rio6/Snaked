var neataptic = require('neataptic');

/*
 * Input:              1 / distance
 * health, {head, body, tail, food, wall} * 8 directions
 */

var SnakeBrain = function(config, dumped=null) {
    this.harmsHuman = false; // is this necessary?

    this.neat = new neataptic.Neat(1 + 5*8, 4, null, {
        popsize: config.POP_SIZE,
        mutation: neataptic.methods.mutation.FFW,
        mutationRate: config.MUTATION_RATE,
        elitism: config.ELITISM,
    });

    if(dumped) {
        let data = JSON.parse(dumped);
        this.neat.generation = data.generation;
        this.neat.population = data.brains.map(d => neataptic.Network.fromJSON(d));
    }

    this.dump = () => JSON.stringify({
        generation: this.neat.generation,
        brains: this.neat.population.map(p => p.toJSON())
    });

    this.evolve = () => {
        let bestIndex = 0;
        for(let i = 1; i < this.neat.popsize; i++) {
            if(this.neat.population[i].score > this.neat.population[bestIndex].score) {
                bestIndex = i;
            }
        }

        console.log("Generation", this.neat.generation, "Best score", this.neat.population[bestIndex].score, "Average", this.neat.getAverage());

        this.neat.sort();

        // Elitists get to live their lives normally
        let newPop = [];
        for(let i = 0; i < this.neat.elitism; i++){
            newPop.push(this.neat.population[i]);
        }

        // Everyone else mutates, the ones who did bad don't get to keep their offsprings
        this.neat.mutate();
        for(let i = newPop.length; i < this.neat.popsize; i++) {
            newPop.push(this.neat.getOffspring());
        }

        this.neat.population = newPop;
        this.neat.generation++;

        return bestIndex;
    }

    this.award = (index, score, extra=false) => {
        if(!this.neat.population[index]) return;
        if(extra)
            this.neat.population[index].score += score;
        else
            this.neat.population[index].score = score;
    };

    this.think = (index, you, board) => {
        if(!this.neat.population[index]) return 'up';

        // figure out next move

        let look = dir => {
            let add = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
            let eq = (a, b) => a.x === b.x && a.y === b.y;

            let pos = {x: you.body[0].x, y: you.body[1].x};
            let dist = 0;
            let head = 0, body = 0, tail = 0, food = 0, wall = 0;

            while(wall === 0 && (head === 0 || body === 0 || tail === 0 || food === 0)) {
                pos = add(pos, dir);
                dist += 1;

                if(pos.x < 0 || pos.y < 0 || pos.x >= board.width || pos.y >= board.height) {
                    wall = 1 / dist;
                    break;
                }

                for(let snake of board.snakes) {
                    for(let i in snake.body) {
                        if(eq(pos, snake.body[i])) {
                            if(i === 0)
                                head = 1 / dist;
                             else if(i === snake.body.length-1)
                                tail = 1 / dist;
                             else
                                body = 1 / dist;
                        }
                    }
                }

                for(let f of board.food) {
                    if(eq(pos, f)) {
                        food = 1 / dist;
                        break;
                    }
                }
            }

            return [head, body, tail, food, wall];
        };

        let inputs = [you.health / 100];
        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                if(x == 0 && y == 0) continue;
                inputs.push(...look({x: x, y: y}));
            }
        }

        let dirs = this.neat.population[index].activate(inputs);
        let max = 0;
        for(let i = 1; i < dirs.length; i++) {
            if(dirs[i] > dirs[max])
                max = i;
        }

        switch(max) {
            case 0: return 'up';
            case 1: return 'right';
            case 2: return 'down';
            case 3: return 'left';
            default: return 'up';
        }
    };
}

module.exports = SnakeBrain;
