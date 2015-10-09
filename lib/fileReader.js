'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var assign = require('object-assign');
var utils = require('./utils');

var less, sass, stylus;

module.exports = function(options) {
    var lessOptions = assign({}, options.less, { sourceMap: {} });
    var stylusOptions = assign({}, options.stylus, { sourcemap: { comment: false } });
    var sassOptions = assign({}, options.sass, {
        outputStyle: 'compact',
        sourceMap: './randomFileNameToGetSourceMaps',
        omitSourceMapUrl: true
    });

    return function fileReader(file) {
        return new Promise(function(resolve, reject) {
            var content = fs.readFileSync(file, 'utf8');
            var extension = path.extname(file);

            function resolver(ext, style) {
                return function compilationCallbackHandler(error, output) {
                    if (error) { return reject(utils.createError(ext + ' error', error)); }

                    resolve({
                        fileName: file,
                        content: output.css ? output.css.toString() : output,
                        sourceMap: style ? style.sourcemap : JSON.parse(output.map)
                    });
                };
            }

            function handleStylus() {
                var styl = stylus(content, stylusOptions);
                styl.render(resolver('stylus', styl));
            }

            function handleSass() {
                sass.render(assign({}, sassOptions, {
                    data: content,
                    indentedSyntax: (extension === '.sass')
                }), resolver('sass'));
            }

            if (extension === '.css') {
                return resolve({
                    fileName: file,
                    content: content
                });
            }

            if (extension === '.less') {
                less = less || require('less');
                return less.render(content, lessOptions, resolver('less'));
            }

            if (extension === '.styl') {
                stylus = stylus || require('stylus');
                return handleStylus();
            }

            if (extension === '.sass' || extension === '.scss') {
                sass = sass || require('node-sass');
                return handleSass();
            }

            reject(utils.createError('File format not supported: ' + extension + ' (' + file + ')'));
        });
    };
};
