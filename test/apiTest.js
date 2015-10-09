'use strict';

var _ = require('lodash');
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var path = require('path');
var assign = require('object-assign');
var cssSpecificityLimit = require('../index');

chai.use(require('sinon-chai'));

function invoke(options = {}, callback) {
    return cssSpecificityLimit(assign({}, {
        limit: 1000,
        files: 'styles/test.css',
        basePath: __dirname,
        silent: true
    }, options), callback);
}

function expectArrayOfLength(length) {
    return function(result) {
        expect(result).to.be.an('array');
        expect(result).to.have.length(length);
    };
}

function expectEmptyArray(result) {
    expect(result).to.be.an('array');
    expect(result).to.be.empty;
}

function rethrow(error) {
    throw error;
}

function expectCallbackError(value, done) {
    return function(error, result) {
        expect(result).to.be.undefined;

        if (_.isString(value)) {
            expect(error).to.have.property('cause', value);
        }

        if (_.isRegExp(value)) {
            expect(error.cause).to.match(value);
        }

        done();
    };
}

// wrap expectations in try-catch block
// so that done can be called with the error
// wich gives us the real error message and not
// Error: timeout of 2000ms exceeded. Ensure the done() blah blah blah...
function asyncTestHelper(done, callback) {
    return function(error, result) {
        try {
            callback(error, result);
        } catch(e) {
            done(e);
        }
    };
}

describe('JavaScript API', () => {
    describe('simple invokation with high limit', () => {
        it('should return empty array', () => {
            return invoke()
                .then(expectEmptyArray)
                .catch(rethrow);
        });

        it('should return empty array in callback', (done) => {
            invoke({}, function(error, result) {
                expect(error).to.be.null;
                expectEmptyArray(result);
                done();
            });
        });
    });

    describe('file globbing pattern', () => {
        it('should handle glob pattern', () => {
            return invoke({ files: 'styles/*t.css' })
                .then(expectEmptyArray)
                .catch(rethrow);
        });
    });

    describe('no file match', () => {
        it('should reject with error', () => {
            return invoke({ files: 'file-that-dont-exist.css' })
                .then(rethrow)
                .catch((error) => {
                    expect(error).to.have.property('cause', 'No files matched');
                });
        });

        it('should call callback with error', (done) => {
            invoke({
                files: 'file-that-dont-exist.css'
            }, expectCallbackError('No files matched', done));
        });
    });

    describe('unknown file format', () => {
        it('should reject with error', () => {
            return invoke({ files: 'styles/test.txt' })
                .then(rethrow)
                .catch((error) => {
                    expect(error.cause).to.match(/File\ format\ not\ supported\:\ \.txt\ \([\/\w\-]+test\.txt\)/i);
                });
        });

        it('should call callback with error', (done) => {
            invoke({
                files: 'styles/test.txt'
            }, expectCallbackError(/File\ format\ not\ supported\:\ \.txt\ \([\/\w\-]+test\.txt\)/i, done));
        });
    });

    describe('options', () => {
        describe('limit', () => {
            it('should set the treshold value', () => {
                return invoke({ limit: 10 })
                    .then(expectArrayOfLength(1))
                    .catch(rethrow);
            });
        });

        describe('basePath', function() {
            it('should set relative base path', function() {
                return invoke({
                    basePath: path.resolve(__dirname, '../'),
                    files: 'test/styles/test.css'
                })
                    .then(expectEmptyArray)
                    .catch(rethrow);
            });
        });

        describe('silent', () => {
            beforeEach(() => {
                sinon.spy(console, 'log');
            });

            afterEach(() => {
                console.log.restore();
            });

            it('should not print result in silent mode', () => {
                return invoke()
                    .then(() => {
                        expect(console.log).to.not.have.been.called;
                    })
                    .catch(rethrow);
            });

            it('should print result', () => {
                return invoke({
                    limit: 100,
                    silent: false
                })
                    .then(() => {
                        expect(console.log).to.have.been.called;
                    }).catch(rethrow);
            });
        });

        describe('matchers', function() {
            function sumUp(errors) {
                return errors.reduce(function(sum, current) {
                    return sum + current.result.reduce(function(s, c) {
                        return s + c.score;
                    }, 0);
                }, 0);
            }

            it('should add matchers to sum', function() {
                var sumNoMatchers;
                var limit = 500;
                var matchers = [
                    {
                        match: /[>+]/g,
                        factor: 50
                    }
                ];

                return invoke({ limit: limit })
                    .then(sumUp)
                    .then((sum) => {
                        sumNoMatchers = sum;
                        return invoke({ limit: limit, matchers: matchers });
                    })
                    .then(sumUp)
                    .then((sumWithMatchers) => {
                        expect(sumWithMatchers).to.be.above(sumNoMatchers);
                    })
                    .catch(rethrow);
            });
        });

        describe('transforms', function() {
            function expectOriginalLineNumber(lineNums) {
                var scores = [20, 31, 30];

                return function(results) {
                    results[0].result.forEach((res, idx) => {
                        expect(res.score).to.equal(scores[idx]);
                        expect(res.lineNumber).to.equal(lineNums[idx]);
                    });
                };
            }

            it('should handle less', function() {
                return invoke({
                    limit: 1,
                    files: 'styles/*.less'
                })
                    .then(expectOriginalLineNumber([2, 5, 9]))
                    .catch(rethrow);
            });

            it('should handle stylus', function() {
                return invoke({
                    limit: 1,
                    files: 'styles/*.styl'
                })
                    .then(expectOriginalLineNumber([2, 4, 6]))
                    .catch(rethrow);
            });

            it('should handle SCSS', function() {
                return invoke({
                    limit: 1,
                    files: 'styles/*.scss'
                })
                    .then(expectOriginalLineNumber([5, 8, 12]))
                    .catch(rethrow);
            });

            it('should handle sass', function() {
                return invoke({
                    limit: 1,
                    files: 'styles/*.sass'
                })
                    .then(expectOriginalLineNumber([5, 7, 9]))
                    .catch(rethrow);
            });
        });
    });

    describe('minified vs not minified css', function() {
        it('should get the same results', function() {
            return Promise.all([
                invoke({ limit: 50, files: 'styles/bootstrap.css' }),
                invoke({ limit: 50, files: 'styles/bootstrap.min.css' })
            ])
                .then(function(results) {
                    var [regular, minified] = results;
                    regular.forEach((result, index) => {
                        expect(result.score).to.equal(minified[index].score);
                    });
                })
                .catch(rethrow);
        });
    });

    describe('node style callback', function() {
        it('should get empty array when successful', function(done) {
            invoke({}, asyncTestHelper(done, function(error, results) {
                expect(error).to.be.null;
                expect(results).to.be.an('array');
                expect(results).to.be.empty;
                done();
            }));
        });

        it('should get result in callback', function(done) {
            invoke({
                limit: 100
            }, asyncTestHelper(done, function(error, results) {
                var res = results[0];

                expect(error).to.be.null;
                expect(results).to.be.an('array');
                expect(results).to.have.length(1);
                expect(res).to.be.an('object');
                console.log(res);
                expect(res.file).to.match(/test\/styles\/test\.css/);
                expect(res.result).to.be.an('array');
                expect(res.result).to.have.length(4);
                expect(res.result[0]).to.have.keys(['lineNumber', 'selector', 'score']);
                done();
            }));
        });

        it('should return error', function(done) {
            invoke({ basePath: '' }, asyncTestHelper(done, function(error, result) {
                expect(result).to.be.undefined;
                expect(error).to.be.an('object');
                expect(error).to.have.property('cause', 'No files matched');
                done();
            }));
        });
    });
});
