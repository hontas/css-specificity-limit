'use strict';

var chalk = require('chalk');
var path = require('path');

module.exports = function(results) {
    results.forEach(function(file) {
        var result = file.result;

        if (result.length) {
            console.log('\n' + chalk.red('%s errors in %s'), result.length, path.basename(file.file));
            result.forEach(function(error) {
                console.log(chalk.gray('%s: ') + chalk.magenta('%s ') + chalk.red('score: %s'), error.lineNumber, error.selector, error.score);
            });
        }
    });
};
