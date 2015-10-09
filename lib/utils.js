'use strict';

var fs = require('fs');
var path = require('path');
var chalk = require('chalk');

function exists(filePath) {
    try {
        fs.statSync(filePath);
    } catch(e) {
        return false;
    }
    return true;
}

function log(msg) {
    var args = [chalk.gray(msg)].concat([].slice.call(arguments, 1));
    console.log.apply(console, args);
}

function watch(dir, callback) {
    return fs.watch(dir, function(event, filename) {
        var filePath = path.resolve(dir, filename);

        if (path.extname(filename) !== '.css') {
            return;
        }

        if (event === 'rename') {
            if (exists(filePath)) {
                callback(filePath, 'create', filename);
            }
        } else {
            callback(filePath, event, filename);
        }
    });
}

function createError(cause, originalError) {
    throw { cause: cause, originalError: originalError };
}

module.exports = {
    watch: watch,
    log: log,
    createError: createError
};
