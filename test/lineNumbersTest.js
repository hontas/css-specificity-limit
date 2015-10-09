'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var lineNumbers = require('../lib/lineNumbers');

describe('lineNumbers', () => {
    describe('#prepend', () => {
        it('should prepend linenumbers to each row', () => {
            var file = ['', '', ''].join('\n');
            var result = lineNumbers.prepend(file).split(/\n/);
            expect(result).to.eql(['1|', '2|', '3|']);
        });
    });

    describe('#remove', function() {
        it('should remove line numbers from multiline file', function() {
            var file = '1|a\n2|b\n3|c';
            var result = lineNumbers.remove(file).split(/\n/);
            expect(result).to.eql(['a', 'b', 'c']);
        });

        it('should remove line numbers from single line', function() {
            var file = '1|hej din kossa ';
            var result = lineNumbers.remove(file);

            expect(result).to.equal('hej din kossa');
            expect(lineNumbers.remove('asd')).to.equal('asd');
        });
    });

    describe('#get', function() {
        it('should return lineNumber', function() {
            expect(lineNumbers.get('57|Hej och hå')).to.equal(57);
        });
    });
});
