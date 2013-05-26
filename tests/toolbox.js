var vows   = require('vows'),
    assert = require('assert');

var toolbox = require('../src/toolbox');

vows.describe('Toolbox').addBatch({
    'getType': {
        'returns the proper type name when provided': {
            "returns 'string' for strings": function () {
                assert.equal(toolbox.object.getType('test'), 'string');
            },
            "returns 'number' for numbers": function () {
                assert.equal(toolbox.object.getType(3), 'number');
            },
            "returns 'object' for an object": function () {
                assert.equal(toolbox.object.getType({ test: 'test' }), 'object');
            },
            "returns 'boolean' for a true/false value": function () {
                assert.equal(toolbox.object.getType(false), 'boolean');
            },
            "returns 'regexp' for a regular expression": function () {
                assert.equal(toolbox.object.getType(/[\w]+/g), 'regexp');
            },
            "returns 'array' for an array": function () {
                assert.equal(toolbox.object.getType([1, 2, 3]), 'array');
            },
            "returns 'function' for a function": function () {
                assert.equal(toolbox.object.getType(toolbox.object.getType), 'function');
            },
            "returns 'date' for a Date object": function () {
                assert.equal(toolbox.object.getType(new Date()), 'date');
            },
            "returns 'testclass' for a TestClass object": function () {
                function TestClass() {}
                assert.equal(toolbox.object.getType(new TestClass()), 'testclass');
            },
            "returns 'null' for a null object": function () {
                assert.equal(toolbox.object.getType(null), 'null');
            },
            "returns 'undefined' for an undefined object": function () {
                assert.equal(toolbox.object.getType(), 'undefined');
            }
        }
    },
    "forEach": {
        'iterates over a collection with the element, its index, and the contents of the whole collection at forEach step': function() {
            var results = [];
            toolbox.array.forEach([1, 2, 3], function(n, idx, all) {
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
        'iterates over a collection with the element, its index, and the contents of the whole collection at forEach step': function() {
            var results = [];
            toolbox.array.map([1, 2, 3], function(n, idx, all) {
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
            var mapped = toolbox.array.map(test, function(n) {
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
            var reduced = toolbox.array.reduce(test, function(memo, n) { return memo + n; }, 0);
            assert.equal(reduced, 6);
        },
        'iterates over the collection with the accumulator, the element, its index, and the whole collection at forEach step': function() {
            var results = [];
            toolbox.array.reduce([1, 2, 3], function(memo, n, idx, all) {
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
            var odds = toolbox.array.filter(test, function(n) { return n % 2 !== 0; });
            assert.isArray(odds);
            assert.deepEqual(odds, [1, 3]);
            assert.deepEqual(test, [1, 2, 3]);
        },
        'iterates over the collection with the element, its index, and the whole collection at forEach step': function() {
            var results = [];
            toolbox.array.filter([1, 2, 3], function(n, idx, all) {
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
    "ApplicationException": {
        'when thrown, can be caught as ApplicationException': function() {
            assert.throws(function() {
                throw new toolbox.ApplicationException('Test', { test: 'things' });
            }, toolbox.ApplicationException);
        },
        'when thrown, contains a friendly message, and context if provided': function() {
            try {
                throw new toolbox.ApplicationException('Testing the error.', { test: 5 });
            } catch (ex) {
                assert.equal(ex.toString(), 'ApplicationException: Testing the error.');
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
                assert.equal(ex.toString(), 'StopIterationException: Iteration of the underlying collection has been completed.');
                assert.equal(ex.message, 'Iteration of the underlying collection has been completed.');
            }
        }
    },
    "areEqual": {
        'when given primitives, returns proper truth value': function() {
            assert.isTrue(toolbox.object.areEqual(null, null));
            assert.isFalse(toolbox.object.areEqual(null, undefined));
            assert.isTrue(toolbox.object.areEqual(undefined, undefined));
            assert.isFalse(toolbox.object.areEqual(undefined, null));
            assert.isTrue(toolbox.object.areEqual(1, 1));
            assert.isFalse(toolbox.object.areEqual(1, 2));
            assert.isTrue(toolbox.object.areEqual('test', 'test'));
            assert.isFalse(toolbox.object.areEqual('test', 'pies'));
            assert.isTrue(toolbox.object.areEqual(/[\w]+/g, /[\w]+/g));
            assert.isFalse(toolbox.object.areEqual(/[\w]+/g, /[\w]+/));
            assert.isTrue(toolbox.object.areEqual(new Date(), new Date()));
            assert.isFalse(toolbox.object.areEqual(new Date(), new Date(2012, 4, 12)));
            assert.isTrue(toolbox.object.areEqual(true, true));
            assert.isFalse(toolbox.object.areEqual(false, true));
        },
        'when given an array, returns true if elements are the same': function() {
            assert.isTrue(toolbox.object.areEqual([1, 2, 3], [1, 2, 3]));
        },
        'when given an object, returns true if its properties and values are the same': function() {
            assert.isTrue(toolbox.object.areEqual({ test: 1 }, { test: 1 }));
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
            assert.isTrue(toolbox.object.areEqual(first, second));
            assert.isFalse(toolbox.object.areEqual(second, third));
        },
        'deep comparisons on array values are possible': function() {
            var first = [{ id: 1, data: { test: 'stuff' } }, { id: 1, data: { test: 'stuff' } }];
            var second = [{ id: 1, data: { test: 'stuff' } }, { id: 1, data: { test: 'stuff' } }];
            var third = [{ id: 1, data: { test: 'things' } }, { id: 1, data: { test: 'stuff' } }];
            assert.isTrue(toolbox.object.areEqual(first, second));
            assert.isFalse(toolbox.object.areEqual(second, third));
        }
    },
    "isType": {
        'returns expected truth values for native types as well as custom classes': function() {
            var test = function() { return 42; };
            function TestClass() {}

            assert.isTrue(toolbox.object.isType(test, 'function'));
            assert.isTrue(toolbox.object.isType({ test: 1 }, 'object'));
            assert.isTrue(toolbox.object.isType([1, 2, 3], 'array'));
            assert.isTrue(toolbox.object.isType('test', 'string'));
            assert.isTrue(toolbox.object.isType(false, 'boolean'));
            assert.isTrue(toolbox.object.isType(/[\w]+/g, 'regexp'));
            assert.isTrue(toolbox.object.isType(new Date(), 'date'));
            assert.isTrue(toolbox.object.isType(null, 'null'));
            assert.isTrue(toolbox.object.isType(undefined, 'undefined'));
            assert.isTrue(toolbox.object.isType(new TestClass(), 'testclass'));
        },
        'if given more than one type to check against, returns true if any of them are the correct type': function() {
            assert.isTrue(toolbox.object.isType(5, 'function', 'object', 'number'));
        }
    },
    "exists": {
        'if an element is null or undefined, it doesnt exist': function() {
            assert.isFalse(toolbox.object.exists(null));
            assert.isFalse(toolbox.object.exists(undefined));
        },
        'if an element is not null or undefined, it exists': function() {
            assert.isTrue(toolbox.object.exists(5));
            assert.isTrue(toolbox.object.exists('test'));
            assert.isTrue(toolbox.object.exists({ test: 5 }));
        }
    },
    "has": {
        topic: function() {
            return { test: 'stuff' };
        },
        'if an object has its own property with the given name, return true': function(obj) {
            assert.isTrue(toolbox.object.has(obj, 'test'));
        },
        'if an object has a property by that name, but it is inherited, return false': function(obj) {
            assert.isFalse(toolbox.object.has(obj, 'keys'));
        },
        'if an object does not have a property by that name, return false': function(obj) {
            assert.isFalse(toolbox.object.has(obj, 'things'));
        }
    }
}).export(module);