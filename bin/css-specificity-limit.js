#! /usr/bin/env node
'use strict';

var cssSpecificityLimit = require('../index');
var assign = require('object-assign');
var chalk = require('chalk');
var pkg = require('../package.json');
var options = require('../lib/options');
var userArgs, args;

try {
    userArgs = options.parse(process.argv);
} catch(e) {
    return console.error(e.toString());
}

args = assign(userArgs, {
    files: userArgs._
});
delete args._;

if (userArgs.help || userArgs.files.length === 0) {
    return console.log(options.generateHelp());
}

if (userArgs.version) {
    return console.log('v%s', pkg.version);
}

cssSpecificityLimit(args)
    .then(function(errors) {
        console.log(chalk.red('\nTotally %s errors in %s files'), errors.length, args.files.length);
    })
    .catch(function(error) {
        console.log(error);
    });
