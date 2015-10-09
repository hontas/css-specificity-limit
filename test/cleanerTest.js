'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var fs = require('fs');
var path = require('path');

var cleaner = require('../lib/cleaner');

describe('Cleaner', function() {
    describe('font-face declarations', function() {
        var fontFace = `@font-face {
              font-family: 'Glyphicons Halflings';

              src: url('../fonts/glyphicons-halflings-regular.eot');
              src: url('../fonts/glyphicons-halflings-regular.eot?#iefix') format('embedded-opentype'), url('../fonts/glyphicons-halflings-regular.woff2') format('woff2'), url('../fonts/glyphicons-halflings-regular.woff') format('woff'), url('../fonts/glyphicons-halflings-regular.ttf') format('truetype'), url('../fonts/glyphicons-halflings-regular.svg#glyphicons_halflingsregular') format('svg');
            }`;

        it('should remove them', function() {
            var res = cleaner(fontFace);
            expect(res).to.equal('');
        });
    });

    describe('#stripMediaQueries', function() {
        it('should remove the surrounding media query and keep inner block', function() {
            var selector = '.lead {font-size: 21px;}';
            var mediaQuery = `@media (min-width: 768px) {${selector}}`;

            expect(cleaner.stripMediaQueries(mediaQuery)).to.equal(selector);
        });

        it('should remove empty media query', function() {
            expect(cleaner.stripMediaQueries('@media screen {}')).to.equal('');
        });

        it('should handle complex media query', function() {
            var complexSelector = '*, *:before, *:after {color: #000 !important; text-shadow: none !important; background: transparent !important; -webkit-box-shadow: none !important; box-shadow: none !important; } a, a:visited {text-decoration: underline; } a[href]:after {content: " (" attr(href) ")"; } abbr[title]:after {content: " (" attr(title) ")"; } a[href^="#"]:after, a[href^="javascript:"]:after {content: ""; } pre, blockquote {border: 1px solid #999; page-break-inside: avoid; } thead {display: table-header-group; } tr, img {page-break-inside: avoid; } img {max-width: 100% !important; } p, h2, h3 {orphans: 3; widows: 3; } h2, h3 {page-break-after: avoid; } .navbar {display: none; } .btn > .caret, .dropup > .btn > .caret {border-top-color: #000 !important; } .label {border: 1px solid #000; } .table {border-collapse: collapse !important; } .table td, .table th {background-color: #fff !important; } .table-bordered th, .table-bordered td {border: 1px solid #ddd !important; }';
            var complexQuery = `@media print {${complexSelector}}`;

            expect(cleaner.stripMediaQueries(complexQuery)).to.equal(complexSelector);
        });

        it('should handle multiple media queries', function() {
            var text = '@media print1 {\n' +
                        '  .visible-print {\n' +
                        '    display: block !important;\n' +
                        '  }\n' +
                        '  table.visible-print {\n' +
                        '    display: table !important;\n' +
                        '  }\n' +
                        '  tr.visible-print {\n' +
                        '    display: table-row !important;\n' +
                        '  }\n' +
                        '  th.visible-print,\n' +
                        '  td.visible-print {\n' +
                        '    display: table-cell !important;\n' +
                        '  }\n' +
                        '}\n' +
                        '.visible-print-block {\n' +
                        '  display: none !important;\n' +
                        '}\n' +
                        '@media print2 {\n' +
                        '  .visible-print-block {\n' +
                        '    display: block !important;\n' +
                        '  }\n' +
                        '}\n' +
                        '.visible-print-inline {\n' +
                        '  display: none !important;\n' +
                        '}\n' +
                        '@media print3 {\n' +
                        '  .visible-print-inline {\n' +
                        '    display: inline !important;\n' +
                        '  }\n' +
                        '}\n' +
                        '.visible-print-inline-block {\n' +
                        '  display: none !important;\n' +
                        '}\n' +
                        '@media print4 {\n' +
                        '  .visible-print-inline-block {\n' +
                        '    display: inline-block !important;\n' +
                        '  }\n' +
                        '}\n' +
                        '@media print5 {\n' +
                        '  .hidden-print {\n' +
                        '    display: none !important;\n' +
                        '  }\n' +
                        '}';
            var res = cleaner.stripMediaQueries(text);

            expect(res.indexOf('@media')).to.equal(-1);
            expect(res.split(/\n/)).to.have.length(34);
        });
    });

    describe('keyframe declarations', function() {
        var keyframes = `@-webkit-keyframes progress-bar-stripes {
                          from {
                            background-position: 40px 0;
                          }
                          to {
                            background-position: 0 0;
                          }
                        }
                        @-o-keyframes progress-bar-stripes {
                          from {
                            background-position: 40px 0;
                          }
                          to {
                            background-position: 0 0;
                          }
                        }
                        @keyframes progress-bar-stripes {
                          from {
                            background-position: 40px 0;
                          }
                          to {
                            background-position: 0 0;
                          }
                        }`;
        it('should remove them', function() {
            expect(cleaner(keyframes)).to.equal('');
        });
    });

    describe('blocks', function() {
        it('should remove them', function() {
            var selector = '.somthing > else';
            expect(cleaner(selector + '{ color: green; }')).to.equal(selector);
        });
    });

    describe('comments', function() {
        it('should remove them', function() {
            expect(cleaner('/* * * * * * */')).to.equal('');
        });

        it('should remove multiple comment', function() {
            var comment = `/**//*!
                             * Bootstrap v3.3.5 (http://getbootstrap.com)
                             * Copyright 2011-2015 Twitter, Inc.
                             * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
                             */ /*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */`;
            expect(cleaner(comment)).to.equal('');
        });
    });

    describe('whole file', function() {
        it('should handle small file', function() {
            var res = cleaner(fs.readFileSync(path.join(__dirname, 'styles/test.css'), 'utf8'));
            var lines = res.split(/,/g);
            expect(lines).to.have.length(10);
        });

        it('should remove everything but selectors from bootstrap', function() {
            var res = cleaner(fs.readFileSync(path.join(__dirname, 'styles/bootstrap.css'), 'utf8'));
            expect(res.indexOf('@')).to.equal(-1);
        });

        it('should remove everything but selectors from minified bootstrap', function() {
            var res = cleaner(fs.readFileSync(path.join(__dirname, 'styles/bootstrap.min.css'), 'utf8'));
            expect(res.indexOf('@')).to.equal(-1);
        });
    });
});
