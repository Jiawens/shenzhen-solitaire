self.onmessage = function(e) {
    var state = e.data;
    state.remainings = function() {
        var sum=0;
        for(var i=0;i<this.spare.length;i++) {
            if (this.spare[i].type === 'number' || this.spare[i].type === 'special') {
                sum+=1;
            }
        }
        for(var i=0;i<this.tray.length;i++) {
            sum+=this.tray[i].length;
        }
        return sum;
    };
    state.clone = function () {
        var state = {
            spare: [],
            tray: [[], [], [], [], [], [], [], []],
            flower: this.flower,
            out: {
                bamboo: this.out.bamboo,
                char: this.out.char,
                coin: this.out.coin
            },
            remainings: this.remainings,
            clone: this.clone,
            cmp: this.cmp,
            simplify: this.simplify,
            neighbors: this.neighbors,
            solve: this.solve,
        }
        for (var i = 0; i < this.spare.length; i++) {
            state.spare[i] = Object.assign({}, this.spare[i]);
        }
        for (var i = 0; i < this.tray.length; i++) {
            for (var j = 0; j < this.tray[i].length; j++) {
                state.tray[i].push(Object.assign({}, this.tray[i][j]));
            }
        }
        return state;
    };
    state.cmp = function (b) {
        for (var i = 0; i < 3; i++) {
            if (this.spare[i].type !== b.spare[i].type) {
                return false;
            }
            if (this.spare[i].type === 'number') {
                if (this.spare[i].color !== b.spare[i].color || this.spare[i].value !== b.spare[i].value) {
                    return false;
                }
            } else if (this.spare[i].type === 'special') {
                if (this.spare[i].color !== b.spare[i].color) {
                    return false;
                }
            }
        }
        for (var i = 0; i < 8; i++) {
            if (this.tray[i].length !== b.tray[i].length) {
                return false;
            }
            for (var j = 0; j < this.tray[i].length; j++) {
                if (this.tray[i][j].type !== b.tray[i][j].type) {
                    return false;
                }
                if (this.tray[i][j].type === 'number') {
                    if (this.tray[i][j].color !== b.tray[i][j].color || this.tray[i][j].value !== b.tray[i][j].value) {
                        return false;
                    }
                } else if (this.tray[i][j].type === 'special') {
                    if (this.tray[i][j].color !== b.tray[i][j].color) {
                        return false;
                    }
                }
            }
        }
        if (this.flower !== b.flower) {
            return false;
        }
        if (this.out.bamboo !== b.out.bamboo || this.out.char !== b.out.char || this.out.coin !== b.out.coin) {
            return false;
        }
        return true;
    };
    state.simplify = function () {
        outer:
        while (true) {
            var movableTops = [];
            for (var i = 0; i < this.spare.length; i++) {
                var card = this.spare[i];
                if (card.type === 'special' && card.color === 'flower') {
                    this.flower = true;
                    this.spare[i] = {
                        type: 'empty',
                    };
                    continue outer;
                } else if (card.type === 'number') {
                    movableTops.push({
                        card: card,
                        slot: 'spare',
                        index: i
                    });
                }
            }
            for (var i = 0; i < this.tray.length; i++) {
                if (this.tray[i].length > 0) {
                    var card = this.tray[i][this.tray[i].length - 1];
                    if (card.type === 'number') {
                        movableTops.push({
                            card: card,
                            slot: 'tray',
                            index: i
                        });
                    } else if (card.type === 'special' && card.color === 'flower') {
                        this.flower = true;
                        this.tray[i].pop();
                        continue outer;
                    }
                }
            }
            var out = false;
            for (var i = 0; i < movableTops.length; i++) {
                var color_value = 16;
                if (movableTops[i].card.color === 'bamboo') {
                    color_value = this.out.bamboo;
                } else if (movableTops[i].card.color === 'characters') {
                    color_value = this.out.char;
                } else if (movableTops[i].card.color === 'coins') {
                    color_value = this.out.coin;
                }
                if (movableTops[i].card.value < 3) {
                    if (movableTops[i].card.value === (color_value + 1)) {
                        if (movableTops[i].card.color === 'bamboo') {
                            this.out.bamboo = movableTops[i].card.value;
                        } else if (movableTops[i].card.color === 'characters') {
                            this.out.char = movableTops[i].card.value;
                        } else if (movableTops[i].card.color === 'coins') {
                            this.out.coin = movableTops[i].card.value;
                        }
                        out = true;
                    }
                } else {
                    if (this.out.bamboo >= (movableTops[i].card.value - 1) && this.out.char >= (movableTops[i].card.value - 1) && this.out.coin >= (movableTops[i].card.value - 1)) {
                        if (movableTops[i].card.value === (color_value + 1)) {
                            if (movableTops[i].card.color === 'bamboo') {
                                this.out.bamboo = movableTops[i].card.value;
                            } else if (movableTops[i].card.color === 'characters') {
                                this.out.char = movableTops[i].card.value;
                            } else if (movableTops[i].card.color === 'coins') {
                                this.out.coin = movableTops[i].card.value;
                            }
                            out = true;
                        }
                    }
                }
                if (out === true) {
                    if (movableTops[i].slot === 'spare') {
                        this.spare[movableTops[i].index] = {
                            type: 'empty'
                        };
                    } else if (movableTops[i].slot === 'tray') {
                        this.tray[movableTops[i].index].pop();
                    }
                    break;
                }
            }
            if (out === false) {
                break outer;
            }
        }
        return this;
    };
    state.neighbors = function () {
        var ret = [];
        //dragon collect
        var dragon_green = 0;
        var dragon_white = 0;
        var dragon_red = 0;
        for (var i = 0; i < this.spare.length; i++) {
            if (this.spare[i].type === 'special') {
                if (this.spare[i].color === 'dragon_green') {
                    dragon_green += 1;
                } else if (this.spare[i].color === 'dragon_white') {
                    dragon_white += 1;
                } else if (this.spare[i].color === 'dragon_red') {
                    dragon_red += 1;
                }
            }
        }
        for (var i = 0; i < this.tray.length; i++) {
            var j = this.tray[i].length;
            if (j > 0) {
                if (this.tray[i][j - 1].type === 'special') {
                    if (this.tray[i][j - 1].color === 'dragon_green') {
                        dragon_green += 1;
                    } else if (this.tray[i][j - 1].color === 'dragon_white') {
                        dragon_white += 1;
                    } else if (this.tray[i][j - 1].color === 'dragon_red') {
                        dragon_red += 1;
                    }
                }
            }
        }
        var target = undefined;
        if (dragon_green === 4) {
            target = 'dragon_green';
        } else if (dragon_white === 4) {
            target = 'dragon_white';
        } else if (dragon_red === 4) {
            target = 'dragon_red';
        }
        if (target !== undefined) {
            canCollect = false;
            slot = undefined;
            for (var i = 0; i < 3; i++) {
                if (this.spare[i].type === 'empty') {
                    slot = i;
                    canCollect = true;
                    break;
                } else if (this.spare[i].type === 'special' && this.spare[i].color === target) {
                    slot = i;
                    canCollect = true;
                    break;
                }
            }
            if (canCollect === true) {
                var state = this.clone();
                state.spare[slot] = {
                    type: 'collected'
                };
                for (var i = 0; i < state.spare.length; i++) {
                    if (state.spare[i].type === 'special' && state.spare[i].color === target) {
                        state.spare[i] = {
                            type: 'empty'
                        };
                    }
                }
                for (var i = 0; i < state.tray.length; i++) {
                    for (var j = 0; j < state.tray[i].length; j++) {
                        if (state.tray[i][j].type === 'special' && state.tray[i][j].color === target) {
                            state.tray[i][j] = undefined;
                        }
                    }
                    state.tray[i] = state.tray[i].filter(function (el) {
                        return el != undefined;
                    });
                }
                ret.push({
                    state: state.simplify(),
                    action: 'collect_' + target,
                    cost: 1,
                });
            }
        }
        //tray to spare
        var emptySpare = undefined;
        for (var i = 0; i < 3; i++) {
            if (this.spare[i].type === 'empty') {
                emptySpare = i;
                break;
            }
        }
        if (emptySpare !== undefined) {
            for (var i = 0; i < this.tray.length; i++) {
                if (this.tray[i].length > 0) {
                    var state = this.clone();
                    state.spare[emptySpare] = state.tray[i].pop();
                    ret.push({
                        state: state.simplify(),
                        action: 'ts_' + i + '_' + emptySpare,
                        cost: 1,
                    });
                }
            }
        }
        //spare to tray
        for (var i = 0; i < this.spare.length; i++) {
            if (this.spare[i].type === 'special') {
                for (var j = 0; j < this.tray.length; j++) {
                    if (this.tray[j].length == 0) {
                        var state = this.clone();
                        state.tray[j].push(state.spare[i]);
                        state.spare[i] = {
                            type: 'empty'
                        };
                        ret.push({
                            state: state.simplify(),
                            action: 'st_' + i + '_' + j,
                            cost: 1,
                        });
                    }
                }
            } else if (this.spare[i].type === 'number') {
                for (var j = 0; j < this.tray.length; j++) {
                    if (this.tray[j].length == 0) {
                        var state = this.clone();
                        state.tray[j].push(state.spare[i]);
                        state.spare[i] = {
                            type: 'empty'
                        };
                        ret.push({
                            state: state.simplify(),
                            action: 'st_' + i + '_' + j,
                            cost: 1,
                        });
                    } else if (this.tray[j].length > 0) {
                        var card = this.tray[j][this.tray[j].length - 1];
                        if (card.value === this.spare[i].value + 1 && card.color !== this.spare[i].color) {
                            var state = this.clone();
                            state.tray[j].push(state.spare[i]);
                            state.spare[i] = {
                                type: 'empty'
                            };
                            ret.push({
                                state: state.simplify(),
                                action: 'st_' + i + '_' + j,
                                cost: 1,
                            });
                        }
                    }
                }
            }
        }
        //tray to tray
        for (var i = 0; i < this.tray.length; i++) {
            if (this.tray[i].length === 0) {
                continue;
            }
            for (var j = 0; j < this.tray[i].length; j++) {
                //TODO combine j==0 and j!=0
                if (j == 0) {
                    for (var k = 0; k < this.tray.length; k++) {
                        if (k != i) {
                            if (this.tray[k].length == 0) {
                                var state = this.clone();
                                state.tray[k].push(state.tray[i].pop());
                                ret.push({
                                    state: state.simplify(),
                                    action: 'tt_' + i + '_' + k + '_' + 1,
                                    cost: 1,
                                });
                            } else {
                                var card = this.tray[k][this.tray[k].length - 1];
                                if (card.value === this.tray[i][this.tray[i].length - 1].value + 1 && card.color !== this.tray[i][this.tray[i].length - 1].color) {
                                    var state = this.clone();
                                    state.tray[k].push(state.tray[i].pop());
                                    ret.push({
                                        state: state.simplify(),
                                        action: 'tt_' + i + '_' + k + '_' + 1,
                                        cost: 1,
                                    });
                                }
                            }
                        }
                    }
                } else {
                    var card = this.tray[i][this.tray[i].length - 1 - j];
                    if (card.value === this.tray[i][this.tray[i].length - j].value + 1 && card.color !== this.tray[i][this.tray[i].length - j].color) {
                        for (var k = 0; k < this.tray.length; k++) {
                            if (k != i) {
                                if (this.tray[k].length == 0) {
                                    var state = this.clone();
                                    state.tray[k]=state.tray[k].concat(state.tray[i].splice(this.tray[i].length - 1 - j));
                                    ret.push({
                                        state: state.simplify(),
                                        action: 'tt_' + i + '_' + k + '_' + (j + 1),
                                        cost: 1,
                                    });
                                } else {
                                    var t_card = this.tray[k][this.tray[k].length - 1];
                                    if (t_card.value === card.value + 1 && t_card.color !== card.color) {
                                        var state = this.clone();
                                        state.tray[k]=state.tray[k].concat(state.tray[i].splice(this.tray[i].length - 1 - j));
                                        ret.push({
                                            state: state.simplify(),
                                            action: 'tt_' + i + '_' + k + '_' + (j + 1),
                                            cost: 1,
                                        });
                                    }
                                }
                            }
                        }
                    } else {
                        break;
                    }
                }
            }
        }
        return ret;
    };
    state.solve = function (count) {
        var openList = [];
        var closeList = [];
        openList.push({
            node: {
                state: this,
                action: 'start'
            },
            cost: 0,
            parent: undefined
        });
        while(count--) {
            var lowest_index = openList.length-1;
            var lowest_cost = openList[lowest_index].cost + openList[lowest_index].node.state.remainings();
            for (var i = 0; i < openList.length; i++) {
                if (openList[i].cost + openList[i].node.state.remainings() < lowest_cost) {
                    lowest_index = i;
                    lowest_cost = openList[i].cost + openList[i].node.state.remainings();
                }
            }
            var current = openList.splice(lowest_index, 1)[0];
            //console.log(current.cost + "_" + current.node.state.remainings());
            if(current.node.state.remainings() === 0) {
                console.log("yea, solution found");
                var steps = [];
                steps.push(current.node.action);
                do {
                    current = current.parent;
                    steps.push(current.node.action);
                } while(current.parent != undefined);
                return steps;
            }
            var neighbors = current.node.state.neighbors();
            outer:
            for (var i = 0; i < neighbors.length; i++) {
                for(var j = 0; j < closeList.length; j++) {
                    if(neighbors[i].state.cmp(closeList[j].node.state)) {
                        continue outer;
                    }
                }
                for(var j = 0; j < openList.length; j++) {
                    if(neighbors[i].state.cmp(openList[j].node.state)) {
                        if((current.cost+1)>openList[j].cost) {
                            continue outer;
                        } else {
                            openList.splice(j,1);
                            break;
                        }
                    }
                }
                openList.push({
                    node: {
                        state: neighbors[i].state,
                        action: neighbors[i].action
                    },
                    cost: current.cost + neighbors[i].cost,
                    parent: current,
                });
            }
            closeList.push(current);
        }
        console.log("lol, no solution");
        return [];
    };
    console.log("solving");
    var next_step = state.solve(10000);
    self.postMessage(next_step);
};