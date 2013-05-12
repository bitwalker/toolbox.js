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
    },
    "filter": {
        'filters results in a new collection of elements that passed the provided predicate': function() {
            var test = [1, 2, 3];
            var odds = toolbox.filter(test, function(n) { return n % 2 !== 0; });
            assert.isArray(odds);
            assert.deepEqual(odds, [1, 3]);
            assert.deepEqual(test, [1, 2, 3]);
        },
        'iterates over the collection with the element, its index, and the whole collection at each step': function() {
            var results = [];
            toolbox.filter([1, 2, 3], function(n, idx, all) {
                results.push({
                    number: n,
                    index: idx,
                    all: all
                });
                return true;
            });
            assert.equal(results.length, 3);
            assert.equal(results[1].number, 2);
            assert.equal(results[1].index, 1);
            assert.deepEqual(results[1].all, [1, 2, 3]);
        }
    },
    "Exception": {
        'when thrown, can be caught as Exception': function() {
            assert.throws(function() {
                throw new toolbox.Exception('Test', { test: 'things' });
            }, toolbox.Exception);
        },
        'when thrown, contains a friendly message, and context if provided': function() {
            try {
                throw new toolbox.Exception('Testing the error.', { test: 5 });
            } catch (ex) {
                assert.equal(ex.toString(), 'Exception: Testing the error.');
                assert.equal(ex.message, 'Testing the error.');
                assert.isObject(ex.context);
                assert.equal(ex.context.test, 5);
            }
        }
    },
    "StopIterationException": {
        'when thrown, can be caught as StopIterationException': function() {
            assert.throws(function() {
                throw new toolbox.StopIterationException();
            }, toolbox.StopIterationException);
        },
        'when thrown, contains a friendly message': function() {
            try {
                throw new toolbox.StopIterationException();
            } catch (ex) {
                assert.equal(ex.toString(), 'Exception: Iteration of the underlying collection has been completed.');
                assert.equal(ex.message, 'Iteration of the underlying collection has been completed.');
            }
        }
    },
    "areEqual": {
        'when given primitives, returns proper truth value': function() {
            assert.isTrue(toolbox.areEqual(null, null));
            assert.isFalse(toolbox.areEqual(null, undefined));
            assert.isTrue(toolbox.areEqual(undefined, undefined));
            assert.isFalse(toolbox.areEqual(undefined, null));
            assert.isTrue(toolbox.areEqual(1, 1));
            assert.isFalse(toolbox.areEqual(1, 2));
            assert.isTrue(toolbox.areEqual('test', 'test'));
            assert.isFalse(toolbox.areEqual('test', 'pies'));
            assert.isTrue(toolbox.areEqual(/[\w]+/g, /[\w]+/g));
            assert.isFalse(toolbox.areEqual(/[\w]+/g, /[\w]+/));
            assert.isTrue(toolbox.areEqual(new Date(), new Date()));
            assert.isFalse(toolbox.areEqual(new Date(), new Date(2012, 4, 12)));
            assert.isTrue(toolbox.areEqual(true, true));
            assert.isFalse(toolbox.areEqual(false, true));
        },
        'when given an array, returns true if elements are the same': function() {
            assert.isTrue(toolbox.areEqual([1, 2, 3], [1, 2, 3]));
        },
        'when given an object, returns true if its properties and values are the same': function() {
            assert.isTrue(toolbox.areEqual({ test: 1 }, { test: 1 }));
        },
        'deep comparisons on object properties are possible': function() {
            var first = {
                id: 1,
                address: {
                    street: '123 Test',
                    city: 'Test City',
                    zip: 12345
                },
                friendIds: [2, 3, 4]
            };
            var second = {
                id: 1,
                address: {
                    street: '123 Test',
                    city: 'Test City',
                    zip: 12345
                },
                friendIds: [2, 3, 4]
            };
            var third = {
                id: 1,
                address: {
                    street: '123 Test',
                    city: 'Another City',
                    zip: 23456
                }
            };
            assert.isTrue(toolbox.areEqual(first, second));
            assert.isFalse(toolbox.areEqual(second, third));
        },
        'deep comparisons on array values are possible': function() {
            var first = [{ id: 1, data: { test: 'stuff' } }, { id: 1, data: { test: 'stuff' } }];
            var second = [{ id: 1, data: { test: 'stuff' } }, { id: 1, data: { test: 'stuff' } }];
            var third = [{ id: 1, data: { test: 'things' } }, { id: 1, data: { test: 'stuff' } }];
            assert.isTrue(toolbox.areEqual(first, second));
            assert.isFalse(toolbox.areEqual(second, third));
        }
    },
    "isType": {
        'returns expected truth values for native types as well as custom classes': function() {
            var test = function() { return 42; };
            function TestClass() {}

            assert.isTrue(toolbox.isType(test, 'function'));
            assert.isTrue(toolbox.isType({ test: 1 }, 'object'));
            assert.isTrue(toolbox.isType([1, 2, 3], 'array'));
            assert.isTrue(toolbox.isType('test', 'string'));
            assert.isTrue(toolbox.isType(false, 'boolean'));
            assert.isTrue(toolbox.isType(/[\w]+/g, 'regexp'));
            assert.isTrue(toolbox.isType(new Date(), 'date'));
            assert.isTrue(toolbox.isType(null, 'null'));
            assert.isTrue(toolbox.isType(undefined, 'undefined'));
            assert.isTrue(toolbox.isType(new TestClass(), 'testclass'));
        },
        'if given more than one type to check against, returns true if any of them are the correct type': function() {
            assert.isTrue(toolbox.isType(5, 'function', 'object', 'number'));
        }
    },
    "exists": {
        'if an element is null or undefined, it doesnt exist': function() {
            assert.isFalse(toolbox.exists(null));
            assert.isFalse(toolbox.exists(undefined));
        },
        'if an element is not null or undefined, it exists': function() {
            assert.isTrue(toolbox.exists(5));
            assert.isTrue(toolbox.exists('test'));
            assert.isTrue(toolbox.exists({ test: 5 }));
        }
    }
}).export(module);