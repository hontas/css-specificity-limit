var optionator = require('optionator');
var pkg = require('../package.json');

// exports methods parse, generateHelp & generateHelpForOption
module.exports = optionator({
    prepend: 'Usage: css-spiecificity-limit [options] [files]',
    concatRepeatedArrays: true,
    mergeRepeatedObjects: true,
    options: [{
        heading: 'Options'
    }, {
        option: 'help',
        alias: 'h',
        type: 'Boolean',
        description: 'Show help'
    }, {
        option: 'version',
        alias: 'v',
        type: 'Boolean',
        description: 'Display version'
    }, {
        option: 'limit',
        alias: 'l',
        type: 'Number',
        default: '100',
        description: 'CSS selector specificity limit'
    }, {
        option: 'reporter',
        alias: 'r',
        type: 'String',
        description: 'Custom results reporter'
    }, {
        option: 'silent',
        alias: 's',
        type: 'Boolean',
        description: 'Silent mode'
    }, {
        option: 'watch',
        alias: 'w',
        type: 'Boolean',
        description: 'Watch dir for changes, rerun on change or create'
    }, {
        option: 'debug',
        alias: 'd',
        type: 'Boolean',
        description: 'Increased logging'
    }],
    append: 'Version ' + pkg.version
});
