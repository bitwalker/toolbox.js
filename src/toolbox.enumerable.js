// Enumerable is wrapped up as a module, for compatibility across
// vanilla browser environments, AMD module loaders, and CommonJS
// module based environments (such as Node.js).
(function (root, initializer, undefined) {
    if (typeof exports === 'object') {
        // CommonJS Native
        initializer(exports);
    }
    if (typeof define === 'function') {
        // CommonJS AMD
        define(['exports'], initializer);
    } 
    else {
        // Vanilla environments (browser)
        initializer((root.$toolbox.enumerable = {}));
    }

})(this, function (exports, undefined) {

    function slice  (c, start, end) { return Array.prototype.slice.call(c, start, end); }
    function concat ()     { return Array.prototype.concat.apply([], slice(arguments)); }
    function push   (c)    { return concat(c, slice(arguments)); }
    /*************
    each(iterator:fn, context:object) 
        Call a function for each element in an enumerable object
        Use native forEach if available or implement ECMA262 5th Edition implementation

        Parameters:
            iterator: the function to call on each element
            context: bind 'this' for the iterator to this object
     ****/
    function ecma262ForEach(iterator, context) {
            if (!this)
                throw new TypeError("Array is null or undefined.");
            if (!isType(iterator, 'function'))
                throw new TypeError("Iterator is not callable.");

        var o     = Object(this);
        var len   = o.length >>> 0; // Force o.length to int
        var index = 0;
        context = context || null;
        while (index < len) {
            if (has(o, index)) {
                var val = o[index];
                iterator.call(context, val, index, o);
            }
            index++;
        }
    }
    var each = (function () {
        var _each = Array.prototype.forEach || ecma262ForEach;
        return function (collection, iterator, context) { return _each.call(collection, iterator, context); };
    })();


    /*********************
    reduce
        Reduce a collection to a single value, by applying elements left to right until only one is left
     ****/
    var reduce = (function() {
        var _reduce = Array.prototype.reduce || (function() {
            Array.prototype.reduce = function (accumulator, memo) {

                if (!this)
                    throw new TypeError("Array is null or undefined.");
                var args     = slice(arguments),
                    elements = this.length >>> 0;
                    
                memo = memo || first(this);

                if (!elements && !memo)
                    throw new TypeError("Array is empty and no start value was provided.");
                else
                    this.forEach(function(o, i, coll) {
                        memo = accumulator.call(null, memo, o, i, coll);
                    });

                return memo;
                    
            };
            
            return Array.prototype.reduce;
        })();

        return function (c, acc, memo) { return _reduce.call(c, acc, memo); };
    })();

    // Provide StopIteration if not available
    var StopIteration = StopIteration || function StopIteration() {};
    StopIteration.prototype = StopIteration.prototype || Error.prototype;
    exports.StopIteration = StopIteration;

    function Enumerator(enumerable) {
        this.enumerable = enumerable;
        this.current = 0;
    }
    Enumerator.prototype.next = function () {
        try {
            var item = this.enumerable.item(this.current);
            if (item === undefined || item === null) {
                throw new StopIteration();
            }
            else {
                this.current++;
                return item;
            }
        } catch (err) {
            throw new StopIteration();
        }
    };
    exports.Enumerator = Enumerator;

    function Enumerable(head, tail, length) {
        this.values = {};
        this.length = length || 0;

        if (typeof head !== undefined && typeof head !== null) {
            this.head = head;
            this.length++;
        }
        else {
            this.head = null;
        }

        if (tail === undefined || tail === null) {
            tail = [];
        }
        else if (typeof tail === 'function') {
            // If tail is a function, this is an infinite sequence, unless a length was passed in explicitly
            this.length = length !== -1 ? length : -1;
        }
        else if (tail.length !== undefined && tail.length !== null) {
            this.length += tail.length;
        }

        this.tail = tail;
    }

    Enumerable.prototype = {
        __iterator__: function () {
            return new Enumerator(this);
        },

        empty: function () {
            return this.head === undefined || this.head === null;
        },

        infinite: function () {
            return this.length === -1 || typeof this.tail === 'function';
        },

        /****
        consume
            Forces the enumerable to be consumed using the provided function.
            This operation is illegal for infinite enumerables.
         ****/
        consume: function (fn) {
            var operation = fn.name || 'anonymous operation';
            if (this.infinite())
                throw 'Attempted to realize infinite enumerable using: ' + operation + '. Operation terminated.';
            else {
                // Call the operation with this enumerable as the context and first argument
                return fn().call(this, this);
            }
        },

        item: function (n) {
            if (this.empty()) return null;

            var enumerable = this, remaining = n;
            while (remaining-- !== 0) {
                enumerable = enumerable.tail;
                if (enumerable === undefined || enumerable === null) { 
                    throw 'Index out of range.'; 
                }
            }

            if (enumerable.empty()) { 
                throw 'Item at index ' + n + ' does not exist.';
            }

            return enumerable.head;
        },

        count: function () {
            // If this is an infinite collection, skip further calculations
            if (this.length === -1) return -1;

            var self = this, enumerables = slice(arguments);
            if (enumerables.length) {
                enumerables = concat(self, enumerables);
                var len = reduce(enumerables, function (length, next) {
                    return (length === -1 || next.length === -1) ? -1 : length + next.length;
                });

                return len;
            }
            else {
                return this.length;
            }
        },

        zip: function(zipper, other) {
            if (this.empty()) return other;
            if (other.empty()) return this;

            var self = this;
            return new Enumerable(zipper(other.head, this.head), function () {
                return self.tail.zip(zipper, other.tail);
            }, this.count(other));
        },

        map: function(fn) {
            if (this.empty()) return this;

            var self = this;
            return new Enumerable(fn(this.head), function () {
                return self.tail.map(fn);
            }, this.length);
        },

        reduce: function (accumulator, memo) {
            return this.consume(function reduce (self) {
                if (self.empty()) return memo;
                return self.tail.reduce(accumulator, accumulator(memo, self.head));
            });
        },

        sum: function () {
            return this.consume(function sum (self) {
                return self.reduce(function (a, b) { return a + b; }, 0);
            });
        },

        walk: function(fn) {
            this.consume(function walk (self) {
                self.map(function(x) {
                    fn(x);
                    return x;
                });
            });
        },

        filter: function (predicate) {
            if (this.empty()) return this;

            if (predicate(this.head)) {
                return new Enumerable(this.head, function () {
                    return this.tail.filter(predicate);
                }, this.length);
            }

            return this.tail.filter(predicate);
        },

        take: function (num) {
            if (this.empty()) return this;
            if (!num) return new Enumerable();

            var self = this, 
                length = self.length;

            return new Enumerable(this.head, function () {
                    return self.tail().take(num - 1);
            }, (length > num) ? num : length);
        },

        drop: function (num){
            var self = this;
            while (num-- > 0) {
                if (self.empty()) {
                    return new Enumerable();
                }

                self = self.tail;
            }

            return new Enumerable(self.head, self.tail, self.length);
        },

        realize: function (num, target) {
            var source;
            if (typeof num !== 'undefined') {
                source = this.take(num);
            }
            else {
                if (this.infinite()) {
                    throw 'Cannot realize an infinite enumerable.';
                }

                source = this;
            }

            if (typeof target === 'undefined')
                target = new Array(source.length);
            if (this.empty())
                return target;
            else {
                target = push(target, source.head);
                this.realize(num - 1, target);
            }
        }
    };

    Enumerable.make = function(/* contents of enumerable: e.g. 1, 3, 5 */) {
        if (!arguments.length) {
            return new Enumerable();
        }
        var head = arguments[0], tail = slice(arguments, 1);
        return new Enumerable(head, function () {
            return Enumerable.make.apply(null, tail);
        }, arguments.length);
    };

    Enumerable.range = function (low, high) {
        if (typeof low === 'undefined') {
            low = 1;
        }
        if (low === high) {
            return Enumerable.make(low);
        }

        // If high is not provided, then this is an infinite enumerable
        return new Enumerable(low, function () {
            return Enumerable.range(low + 1, high);
        });
    };

    exports.Enumerable = Enumerable;

    return exports;
});