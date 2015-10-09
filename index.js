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
        less: {},
        stylus: {},
        sass: {}
    };

    var options = assign({}, defaults, opts);
    var fileReader = fileReaderFactory(options);

    function getFullFilePaths() {
        var files = options.files,
            basePath = options.basePath;

        function getPath(file) {
            return path.join(basePath, file);
        }

        if (_.isArray(files)) {
            return files.map(getPath);
        }

        return glob(getPath(files));
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
        return files
            .map(calculate)
            .filter(function(item) {
                return item.result.length;
            });
    }

    function reportErrors(results) {
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
        if (files.length === 0) {
            utils.createError('No files matched');
        }

        return Promise.all(files.map(fileReader));
    }

    function run(filePathsArray) {
        return new Promise(function(resolve, reject) {
            Promise.resolve(filePathsArray)
                .then(readFiles)
                .then(calculateCssScore)
                .then(reportErrors)
                .then(function(result) {
                    if (options.watch) {
                        return;
                    }

                    if (_.isFunction(callback)) {
                        callback(null, result);
                    } else {
                        resolve(result);
                    }
                })
                .catch(function(error) {
                    if (_.isFunction(callback)) {
                        callback(error);
                    } else {
                        reject(error);
                    }
                });
        });
    }

    function onChangeCreate(filePath, event, filename) {
        if (!options.silent) {
            log('%s %sd', filename, event);
        }

        run(filePath);
    }

    function init() {
        var filePaths = getFullFilePaths();

        if (options.watch) {
            // watch dir and rerun for file on change or create
            utils.watch(path.dirname(filePaths[0]), onChangeCreate);
        }

        return run(filePaths);
    }

    return init();
};
