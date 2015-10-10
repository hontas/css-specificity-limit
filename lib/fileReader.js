'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var assign = require('object-assign');
var utils = require('./utils');
var logger = require('./logger');

var less, sass, stylus;

module.exports = function(options) {
    var lessOptions = assign({}, options.less, { sourceMap: {} });
    var stylusOptions = assign({}, options.stylus, { sourcemap: { comment: false } });
    var sassOptions = assign({}, options.sass, {
        outputStyle: 'compact',
        sourceMap: './randomFileNameToGetSourceMaps',
        omitSourceMapUrl: true
    });

    function createReturnObject(file, css, map) {
        return {
            fileName: file,
            content: css,
            sourceMap: map
        };
    }

    function handleSass(opts, file) {
        return new Promise(function(resolve, reject) {
            sass.render(assign({}, sassOptions, opts), function(error, output) {
                if (error) {
                    reject(error);
                }

                resolve(createReturnObject(file, output.css.toString(), JSON.parse(output.map)))
            });
        });
    }

    function handleStylus(content, file) {
        return new Promise(function(resolve, reject) {
            var styl = stylus(content, stylusOptions);
            styl.render(function(error, output) {
                if (error) {
                    reject(error);
                }

                resolve(createReturnObject(file, output, styl.sourcemap));
            });
        });
    }

    var parsers = {
        css: function(content, file) {
            logger.trace('parsing CSS %s', file);
            return {
                fileName: file,
                content: content
            };
        },

        less: function(content, file) {
            less = less || Promise.promisifyAll(require('less'));
            logger.trace('parsing LESS %s', file);
            return less.renderAsync(content, lessOptions)
                .then(function(output) {
                    return createReturnObject(file, output.css, output.map);
                });
        },

        scss: function(content, file) {
            sass = sass || require('node-sass');
            logger.trace('parsing SCSS %s', file);
            return handleSass({ data: content }, file);
        },

        sass: function(content, file) {
            sass = sass || require('node-sass');
            logger.trace('parsing SASS %s', file);
            return handleSass({ data: content, indentedSyntax: true }, file);
        },

        styl: function(content, file) {
            stylus = stylus || require('stylus');
            logger.trace('parsing STYLUS %s', file);
            return handleStylus(content, file);
        }
    };

    function parse(fileObject) {
        logger.trace('#fileReader:parse');

        var file = fileObject.file;
        var extension = path.extname(file).replace('.', '');
        var parser = parsers[extension];

        if (!parser) {
            utils.throwError('File format not supported: ' + extension + ' (' + file + ')');
        }

        return parser(fileObject.content, file);
    }

    return function fileReader(file) {
        logger.trace('#fileReader');

        return fs.readFileAsync(file, 'utf8')
            .catch(function(err) {
                utils.throwError('Failed to read file ' + file, err);
            })
            .then(function(content) {
                return {
                    file: file,
                    content: content
                };
            })
            .then(parse);
    };
};
