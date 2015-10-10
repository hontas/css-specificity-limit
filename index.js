'use strict';

var Promise = require('bluebird');
var specificity = require('specificity');
var glob = Promise.promisify(require('glob'));
var assign = require('object-assign');
var path = require('path');
var _ = require('lodash');
var sourceMap = require('source-map');

var cleaner = require('./lib/cleaner');
var lineNumbers = require('./lib/lineNumbers');
var utils = require('./lib/utils');
var logger = require('./lib/logger');
var fileReaderFactory = require('./lib/fileReader');
var log = utils.log;

module.exports = function(opts, callback) {
    var defaults = {
        limit: 100,
        basePath: process.cwd(),
        multiplier: [1000, 100, 10, 1],
        matchers: [],
        reporter: './lib/reporter',
        silent: false,
        watch: false,
        debug: false,
        less: {},
        sass: {},
        stylus: {},
        logLevel: 'none'
    };

    var options = assign({}, defaults, opts);
    var fileReader;

    function getFullFilePaths() {
        logger.trace('#getFullFilepaths');

        var files = options.files,
            basePath = options.basePath;

        function getPath(file) {
            return glob(path.join(basePath, file));
        }

        if (_.isArray(files)) {
            return Promise.all(files.map(getPath))
                .then(utils.flatten);
        }

        return getPath(files);
    }

    function calculateSpecificity(line) {
        var text = line.line;
        var score = specificity.calculate(text)[0];

        var start = options.matchers.reduce(function(sum, matcher) {
            var matches = text.match(matcher.match) || [];
            return sum + (matches.length * matcher.factor);
        }, 0);

        return {
            lineNumber: line.lineNum,
            selector: score.selector,
            score: score.specificity.split(',').reduce(function(sum, curr, idx) {
                return sum + (options.multiplier[idx] * curr);
            }, start)
        };
    }

    function extractLineStatements(res, line) {
        var lineNumber = lineNumbers.get(line);
        var parts = lineNumbers.remove(line).split(/[,]/g)
            .filter(_.identity)
            .map(function(part) {
                return {
                    lineNum: lineNumber,
                    line: part
                };
            });

        return res.concat(parts);
    }

    function cleanFile(file) {
        return cleaner(lineNumbers.prepend(file));
    }

    function applySourceMap(smc, spec) {
        if (smc) {
            spec.lineNumber = smc.originalPositionFor({
                line: spec.lineNumber,
                column: spec.selector.length
            }).line;

            return spec;
        }
        return spec;
    }

    function calculate(file) {
        var smc = file.sourceMap ? new sourceMap.SourceMapConsumer(file.sourceMap) : null;

        var result = cleanFile(file.content)
            .split(/\n/)
            .filter(_.identity) // filter out falsy
            .reduce(extractLineStatements, [])
            .map(calculateSpecificity)
            .filter(function(spec) {
                return spec.score > options.limit;
            })
            .map(applySourceMap.bind(null, smc));

        return {
            file: file.fileName,
            result: result
        };
    }

    function calculateCssScore(files) {
        logger.trace('#calculateCssScore');

        return files.map(calculate);
    }

    function reportErrors(results) {
        logger.trace('#reportErrors');

        if (options.silent) {
            return results;
        }

        if (_.isFunction(options.reporter)) {
            options.reporter(results);
        } else {
            require(options.reporter)(results);
        }

        return results;
    }

    function readFiles(files) {
        logger.trace('#readFiles');

        if (!_.isArray(files)) {
            utils.throwError('Argument to readFiles must be of type: Array');
        }

        if (files.length === 0) {
            utils.throwError('No files matched');
        }

        return Promise.all(files.map(fileReader));
    }

    function errorHandler(error) {
        logger.trace('#errorHandler');

        var msg = error.cause || error.toString();
        logger.error(msg);

        if (options.watch) {
            log(msg);
        } else if (_.isFunction(callback)) {
            callback(error);
        } else {
            return Promise.reject(error);
        }
    }

    function successHandler(result) {
        logger.trace('Completed run');

        if (_.isFunction(callback)) {
            callback(null, result);
        } else {
            return result;
        }
    }

    function run(filePathsPromise) {
        logger.trace('#run');

        return Promise.resolve(filePathsPromise)
            .then(readFiles)
            .then(calculateCssScore)
            .then(reportErrors)
            .then(successHandler)
            .catch(errorHandler);
    }

    function onChangeCreate(filePath, event, filename) {
        if (!options.silent) {
            log('%s %sd', filename, event);
        }

        run([filePath]);
    }

    function initiateWatch(filePaths) {
        logger.trace('#initiateWatch');

        if (options.watch) {
            var dir = filePaths.reduce(function(lastDir, curr) {
                var currDir = path.dirname(curr);
                if (lastDir) {
                    return currDir.length < lastDir.length ? currDir : lastDir;
                }

                return currDir;
            }, '');

            // watch dir and rerun for file on change or create
            utils.watch(dir, onChangeCreate);
        }

        return filePaths;
    }

    function init() {
        logger.setLevel(options.debug ? 'trace' : options.logLevel);
        logger.trace('#init');

        if (!options.files || options.files.length === 0) {
            return errorHandler(utils.createError('Required option \'files\' not set'));
        }

        fileReader = fileReaderFactory(options);

        return getFullFilePaths()
            .catch(errorHandler)
            .then(initiateWatch)
            .then(run);
    }

    return init();
};
