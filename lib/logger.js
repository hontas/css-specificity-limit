'use strict';

var chalk = require('chalk');

// black red green yellow blue magenta cyan white gray
var colors = {
    log: 'magenta',
    trace: 'gray',
    debug: 'blue',
    warn: 'yellow',
    info: 'cyan',
    error: 'red'
};
var levels = {
    trace: 0,
    debug: 1,
    warn: 2,
    info: 3,
    error: 4
};

var _level = levels.error;
var _levelHuman = 'error';

function slice(array, at) {
    return [].slice.call(array, at || 0);
}

function tmpl(msg, args) {
    return msg.replace(/\%s/gi, function() {
        return args.shift();
    });
}

function getTime() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    return tmpl('[%s-%s-%s %s:%s:%s] ', [
        date.getFullYear(),
        month < 10 ? '0' + month : month,
        day < 10 ? '0' + day : day,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
    ]);
}

function log(level, msg) {
    var color = chalk[colors[level]];

    var args = chalk.gray(getTime()) + color('[' + level + ']', msg);
    console.log.apply(console, [args].concat(slice(arguments, 2)));
}

function callLog(level, args) {
    log.apply(null, [level].concat(slice(args)));
}

module.exports = function() {
    if (_level <= levels.info) {
        callLog('log', arguments);
    }
};

module.exports.setLevel = function(newLevel) {
    var numLevel = levels[newLevel];
    if (!numLevel && numLevel !== 0) {
        throw 'Incorrect level: ' + newLevel;
    }
    _level = levels[newLevel];
};

module.exports.getLevel = function() {
    return _level + ' (' + _levelHuman + ')';
};

module.exports.trace = function() {
    if (_level <= levels.trace) {
        callLog('trace', arguments);
    }
};
module.exports.debug = function() {
    if (_level <= levels.debug) {
        callLog('debug', arguments);
    }
};

module.exports.warn = function() {
    if (_level <= levels.warn) {
        callLog('warn', arguments);
    }
};

module.exports.info = function() {
    if (_level <= levels.info) {
        callLog('info', arguments);
    }
};

module.exports.error = function() {
    if (_level <= levels.error) {
        callLog('error', arguments);
    }
};
