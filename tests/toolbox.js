var vows   = require('vows'),
    assert = require('assert');

var toolbox = require('../src/toolbox');

vows.describe('Toolbox').addBatch({
    'getType': {
        'returns the proper type name when provided': {
            "returns 'string' for strings": function () {
                assert.equal(toolbox.getType('test'), 'string');
            },
            "returns 'number' for numbers": function () {
                assert.equal(toolbox.getType(3), 'number');
            },
            "returns 'object' for an object": function () {
                assert.equal(toolbox.getType({ test: 'test' }), 'object');
            },
            "returns 'boolean' for a true/false value": function () {
                assert.equal(toolbox.getType(false), 'boolean');
            },
            "returns 'regexp' for a regular expression": function () {
                assert.equal(toolbox.getType(/[\w]+/g), 'regexp');
            },
            "returns 'array' for an array": function () {
                assert.equal(toolbox.getType([1, 2, 3]), 'array');
            },
            "returns 'function' for a function": function () {
                assert.equal(toolbox.getType(toolbox.getType), 'function');
            },
            "returns 'date' for a Date object": function () {
                assert.equal(toolbox.getType(new Date()), 'date');
            },
            "returns 'testclass' for a TestClass object": function () {
                function TestClass() {}
                assert.equal(toolbox.getType(new TestClass()), 'testclass');
            },
            "returns 'null' for a null object": function () {
                assert.equal(toolbox.getType(null), 'null');
            },
            "returns 'undefined' for an undefined object": function () {
                assert.equal(toolbox.getType(), 'undefined');
            }
        }
    },
    "each": {
        'iterates over a collection with the element, its index, and the contents of the whole collection at each step': function() {
            var results = [];
            toolbox.each([1, 2, 3], function(n, idx, all) {
                results.push({
                    number: n,
                    index: idx,
                    all: all
                });
            });
            assert.equal(results.length, 3);
            assert.equal(results[1].number, 2);
            assert.equal(results[1].index, 1);
            assert.deepEqual(results[1].all, [1, 2, 3]);
        }
    },
    "map": {
        'iterates over a collection with the element, its index, and the contents of the whole collection at each step': function() {
            var results = [];
            toolbox.map([1, 2, 3], function(n, idx, all) {
                results.push({
                    number: n,
                    index: idx,
                    all: all
                });
            });
            assert.equal(results.length, 3);
            assert.equal(results[1].number, 2);
            assert.equal(results[1].index, 1);
            assert.deepEqual(results[1].all, [1, 2, 3]);
        },
        'returns a new list of the mapped values when completed, leaving the original untouched': function() {
            var test = [1, 2, 3];
            var mapped = toolbox.map(test, function(n) {
                return n * 2;
            });
            assert.isArray(mapped);
            assert.equal(mapped.length, 3);
            assert.deepEqual(mapped, [2, 4, 6]);
            assert.deepEqual(test, [1, 2, 3]);
        }
    },
    "reduce": {
        'reduces a collection to a single value': function() {
            var test = [1, 2, 3];
            var reduced = toolbox.reduce(test, function(memo, n) { return memo + n; }, 0);
            assert.equal(reduced, 6);
        },
        'iterates over the collection with the accumulator, the element, its index, and the whole collection at each step': function() {
            var results = [];
            toolbox.reduce([1, 2, 3], function(memo, n, idx, all) {
                results.push({
                    memo: memo,
                    number: n,
                    index: idx,
                    all: all
                });
                return memo + n;
            }, 0);
            assert.equal(results.length, 3);
            assert.equal(results[2].memo, 3);
            assert.equal(results[2].number, 3);
            assert.equal(results[2].index, 2);
            assert.deepEqual(results[1].all, [1, 2, 3]);
        }
    }
}).export(module);