'use strict';

var DELIMITER = '|';
var LineNumber = new RegExp('^\\d+\\' + DELIMITER, 'gm');

module.exports = {
    prepend: function prepend(str) {
        return str
            .split(/\n/g)
            .map(function(line, idx) {
                return idx + 1 + DELIMITER + line;
            })
            .join('\n');
    },

    remove: function remove(str) {
        return str
            .replace(LineNumber, '').trim();
    },

    get: function get(str) {
        return Number(str.split(DELIMITER)[0]);
    }
};
