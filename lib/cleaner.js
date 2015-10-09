var block = '\\{([^}]*)\\}';
var selectorAndBlock = '[^{]+' + block;
var mediaQuery = '@media[^{]+\\{\\s*' +
                    '(' +
                        '((' + selectorAndBlock + ')(?!\\s*\\}))*' +
                        selectorAndBlock +
                    ')?' +
                 '\\s*\\}';


var mediaQueries = new RegExp(mediaQuery, 'g');
var fontFaceDeclarations = /@font-face\s*\{([^}]+)\}/g;
var keyframeDeclarations = /@(-\w+-)?keyframes[^{]+\{([^{]+\{[^}]+\})+[^}]+\}/g;
var blockRegExp = new RegExp('\\s*' + block, 'g');
var comments = /\/\*[\s\S]*?\*\//g;
var emptyLines = /^\s*/gm;
var lastComma = /[,]\s*$/;

function firstMatch(match, p1) {
    'use strict';
    return p1 || '';
}

module.exports = function cleaner(str) {
    'use strict';

    return str
        .replace(fontFaceDeclarations, '')
        .replace(keyframeDeclarations, '')
        .replace(mediaQueries, firstMatch)
        .replace(blockRegExp, ',')
        .replace(comments, '')
        .replace(emptyLines, '')
        .replace(lastComma, '');
};

module.exports.stripMediaQueries = function(str) {
    'use strict';
    return str.replace(mediaQueries, firstMatch);
};
