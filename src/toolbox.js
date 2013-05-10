/**
 * @module toolbox
 * @author Paul Schoenfelder
 */
(function (root, builder, undefined) {
    if (typeof exports === 'object') {
        // CommonJS Native
        exports = builder(root, exports, false, builder);
    }
    if (typeof define === 'function') {
        // CommonJS AMD
        define(builder(root, {}, false, builder));
    }
    else {
        // Vanilla environments (browser)
        root.$toolbox = builder(root, {}, false, builder);
    }

})(this, function (root, exports, config, builder, undefined) {


    // Shortcut to the console
    var console = root.console || {};

    // Hash of all the types and their typeof results
    var type = {
          function:  'function'
        , object:    'object'
        , array:     'array'
        , arguments: 'arguments'
        , string:    'string'
        , bool:      'boolean'
        , regex:     'regexp'
        , date:      'date'
        , error:     'error'
        , null:      'null'
        , undefined: 'undefined'
    };

    // Convenience string utilities
    var string = {
          empty: ''
        , newline: '\r\n'
        , trim: function (str) {
            return String.prototype.trim.call(str);
        }
    };


    // Create shorthand refrences to exported functions
    // for usage inside this builder function
    var getType
        , each
        , map
        , reduce
        , filter = null;

    /** 
     *  Get the type string for the provided object. Calls to this function are memoized.
     *  @param {object} obj - The object whose type we want to inspect
     */
    exports.getType = getType = memoize(_getType);
    function _getType(obj) {
        if (typeof obj === 'undefined')
            return type.undefined;
        else if (obj === null)
            return type.null;
        else if (obj.constructor && obj.constructor.name)
            return obj.constructor.name.toLowerCase();
        else
            return Object.prototype.toString.call(obj).toLowerCase();
    }


    /**
     *  Call a function for each element in an enumerable object. Use native forEach if available or fallback on ECMA262 5th Edition implementation
     *  @param {function} iterator - The function to call on each element
     *  @param {object} context - Bind the provided object as 'this' for the iterator function
     */
    exports.each = each = (function() {
        var _each = Array.prototype.forEach || ecma262ForEach;
        return function (collection, iterator, context) { return _each.call(collection, iterator, context); };
    })();
    function ecma262ForEach(iterator, context) {
            if (!this)
                throw new Error("Array is null or undefined.");
            if (!isType(iterator, 'function'))
                throw new Error("Iterator is not callable.");

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

    /**
     * Map a function across a collection, generating a new collection as a result.
     * @param {Array} collection - The collection to map
     * @param {function} fn - The mapping function to apply
     */
    exports.map = map = (function() {
        var _map = Array.prototype.map || (function() {
            Array.prototype.map = function (c, fn) {
                if (!this)
                    throw new Error('Array is null or undefined');
                if (!fn)
                    throw new Error('Mapping function is null or undefined.');

                var result = [];
                this.forEach(function(o, i, coll) {
                    result.push(fn.call(null, o, i, coll));
                });
                return result;
            };

            return Array.prototype.map;
        })();

        return function(c, fn) { return _map.call(c, fn); };
    })();


    /**
     *  Reduce a collection to a single value, by applying elements left to right until only one is left
     *  @param {Array} collection - The collection to reduce
     *  @param {function} accumulator - The function which will reduce the last value and the current value
     *  @param {object} memo - The object which will accumulate the final result to be returned
     */
    exports.reduce = reduce = (function() {
        var _reduce = Array.prototype.reduce || (function() {
            Array.prototype.reduce = function (accumulator, memo) {

                if (!this)
                    throw new Error("Array is null or undefined.");
                var args     = slice(arguments),
                    elements = this.length >>> 0;

                memo = memo || first(this);

                if (!elements && !memo)
                    throw new Error("Array is empty and no start value was provided.");
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

    /**
     *  Remove elements from a collection that do not pass the predicate
     *  @param {Array} collection - The collection to filter
     *  @param {function} predicate - The predicate function takes (in this order), the item to check, the index of the item, and the entire collection
     *  @param {object} context - The context to execute the filter in
     */
    exports.filter = filter = (function() {
        var _filter = Array.prototype.filter || (function() {
            Array.prototype.filter = function (predicate, context) {

                if (!this)
                    throw new Exception("Array is null or undefined.", { context: this, args: arguments });
                if (typeof predicate !== 'function')
                    throw new Exception("Predicate is not callable.", { context: this, args: arguments });

                var result = [];
                each(this, function (item, index, collection) {
                    if (predicate.call(context, item, index, collection))
                        result.push(item);
                });
                return result;
            };

            return Array.prototype.filter;
        })();

        return function (c, pred, ctx) { return _filter.call(c, pred, ctx); };
    })();


    // The default configuration (everything disabled)
    var defaultConfig = {
        extendPrototypes: false,
        enableModules:    false
    };
    // The "give-me-everything" config (everything enabled)
    var enabledConfig = reduce(Object.keys(defaultConfig), function (obj, key) {
        obj[key] = true;
        return obj;
    }, {});
    // Choose which config to use based on the value given to the builder function
    switch (getType(config)) {
        case type.null:
        case type.undefined:
        case type.boolean:
            config = config ? enabledConfig : defaultConfig;
            break;
        default:
            config = enabledConfig;
            break;
    }

    /**
     *  Re-configure the toolbox.
     *
     *  A null or undefined configuration object assumes the most restrictive defaults. This is to prevent someone who simply
     *  forgot to call configure with proper settings from throwing a wrench in their application. Configuration is completely
     *  optional, but recommended to get the most out of the library.
     * 
     *  `config === true || config === false`
     *
     *     This is an all or nothing configuration setting. It's mostly for those who want everything, but don't want to clutter up
     *     code by setting all the config values explicitly.
     *     
     *  `config === object`
     *
     *     When passed an object for configuration, all unspecified options are defaulted to false. To enable or change the default for an
     *     option, you need to explicitly set it.
     *     
     *  **Configurable Options**
     *     
     *  extendPrototypes: 
     *      Enables extension of system prototypes with new features. This option only applies to features which do not alter the behavior of those classes.
     *
     *  enableModules: 
     *      Loads curl.js for AMD module loading. Applies only to browsers.
     *
     *  @param {object} config - Either true/false or an object that defines the configuration values desired
     */
    exports.configure = configure;
    function configure(config) {
        return builder.call(this, config, builder);
    }

    /**
     *  Retreive the current configuration object. Read-only.
     */
    exports.config = getConfig;
    function getConfig() {
        return config;
    }

    /**
     *  Creates a new exception
     *  @constructor
     */
    exports.Exception = Exception;
    function Exception(message, context) {
        this.info = context;
        this.message = message;

        return this;
    }
    Exception.prototype = Error.prototype;
    /** Get the exception message as a string */
    Exception.prototype.toString = function () {
        return 'Exception: ' + this.message;
    };

    /**
     *  Perform a deep comparison to check if two objects are equal.
     *
     *  The guts of this function are basically ripped straight from Underscore.js
     *  with small modifications. Internal recursive comparison function for `areEqual`
     */
    exports.areEqual = areEqual;
    function areEqual(a, b) {
        return eq(a, b, [], []);
    }
    function eq(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
        if (a === b) return a !== 0 || 1 / a == 1 / b;
        // A strict comparison is necessary because `null == undefined`.
        if (a === null || b === null) return a === b;
        // Compare types
        if (!isType(a, b)) return false;
        switch (getType(a)) {
            // Strings, numbers, dates, and booleans are compared by value.
            case 'string':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return a == String(b);
            case 'number':
                // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
                // other numeric values.
                return a !== +a ? b !== +b : (a === 0 ? 1 / a === 1 / b : a === +b);
            case 'date':
            case 'boolean':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a == +b;
            // RegExps are compared by their source patterns and flags.
            case 'regexp':
                return  a.source == b.source &&
                        a.global == b.global &&
                        a.multiline == b.multiline &&
                        a.ignoreCase == b.ignoreCase;
        }
        if (typeof a != 'object' || typeof b != 'object') return false;
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
        var length = aStack.length;
        while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] == a) return bStack[length] == b;
        }
        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);
        var size = 0, result = true;
        // Recursively compare objects and arrays.
        if (isType(a, type.array)) {
            // Compare array lengths to determine if a deep comparison is necessary.
            size = a.length;
            result = size == b.length;
            if (result) {
                // Deep compare the contents, ignoring non-numeric properties.
                while (size--) {
                    if (!(result = eq(a[size], b[size], aStack, bStack))) break;
                }
            }
        } else {
            // Objects with different constructors are not equivalent, but `Object`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(isFunction(aCtor) && (aCtor instanceof aCtor) &&
                                     isFunction(bCtor) && (bCtor instanceof bCtor))) {
                return false;
            }
            // Deep compare objects.
            for (var key in a) {
                if (has(a, key)) {
                    // Count the expected number of properties.
                    size++;
                    // Deep compare each member.
                    if (!(result = has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
                }
            }
            // Ensure that both objects contain the same number of properties.
            if (result) {
                for (key in b) {
                    if (has(b, key) && !(size--)) break;
                }
                result = !size;
            }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return result;
    }



    /**
     *  Determine if the first object is of the same type as the second object.
     *  Alternatively, you can pass in a string representing the name of the type
     *  you are comparing for. A few examples
     *
     *      isType({}, Object.prototype) ==> true
     *      isType(obj, undefined)       ==> true
     *      isType(5, 'number')          ==> true
     *
     *  **IMPORTANT**: Referencing constructors instead of the prototype for the object
     *  you are comparing against will fail! Remember, constructors are of type Function.
     *  
     *  Example: `Object == [object Function]` and `Object.prototype == [object Object]`
     */
    exports.isType = isType;
    function isType(x) {
        var args = slice(arguments, 1);
        if (!args.length)
            throw new Error('isType requires at least two arguments.');

        for (var i = 0; i < args.length; i++) {
            var y = typeof args[i] === 'string' ? args[i] : getType(args[i]);

            if (x === undefined && (y === 'undefined' || y === undefined))
                return true;
            else if (x === null && (y === 'null' || y === null))
                return true;
            else {
                if (getType(x) === y)
                    return true;
            }
        }

        return false;
    }

    /**
        Determine if an object is null or undefined
        @param {object} obj - The object in question
     */
    exports.exists = exists;
    function exists(obj) {
        return !isType(obj, type.null, type.undefined);
    }

    /**
     *  Determine if the provided string is empty
     *  @param (string) s - The string to test
     */
    exports.empty = empty;
    function empty(s) {
        var emptyPattern = /[\S]+/g;
        return !exists(s) || !emptyPattern.test(s);
    }

    /**
        Determine if an object has it's own property with the provided name
        @param {object} obj - The object to check
        @param {string} name - The property name to look up
     */
    exports.has = has;
    function has(obj, name) {
        if (!exists(obj))
            throw new Exception('$toolbox.has: Object does not exist.', arguments);

        // If no property name is provided, return all property names which this object owns
        if (!exists(name)) {
            return reduce(Object.keys(obj), function(result, key) {
                if (Object.prototype.hasOwnProperty.call(obj, key))
                    result.push(key);
                return result;
            }, []);
        }
        // Otherwise, return true or false depending on whether the object has that property
        else {
            if (Object.prototype.hasOwnProperty.call(obj, name))
                return true;
            else
                return false;
        }
    }

    /**
     *  Safely extend the toolbox, or another object
     *  @param {object} $me - The object to mix into
     *  @param {object} $you - The objext we're mixing
     *  @param {Array} blacklist - A list of function names that cannot be mixed over
     ****/
    exports.mixin = mixin;
    function mixin(target, source, blacklist) {
        // Make sure that if we're mixing into the toolbox, certain properties cannot be overwritten
        if (this === target)
            blacklist = union(['configure', 'config'], blacklist);

        var isBlacklisted = papply(contains, blacklist || []);
        // Ignore all functions/properties that are blacklisted by name
        var functionNames = pick(functions(source), 'name');
        var propertyNames = pick(properties(source), 'name');
        var valid = reject(isBlacklisted, concat(functionNames, propertyNames));

        each(valid, function(name) { target[name] = source[name]; });

        return target;
    }

    /**
     *  Extend an object with properties from one or more other objects.
     *  Last definition wins, so the last object to define a property will
     *  have it's value set for that property on the resulting object.
     */
    exports.extend = extend;
    function extend(target) {
        if (this === target)
            throw new Exception('extend: Cannot extend toolbox. Use mixin instead.', this);

        var extensions = slice(arguments, 1);
        if (extensions.length)
        {
            each(extensions, function(extension) {
                var functions  = pick(functions(extension), 'name');
                var properties = pick(properties(extension), 'name');
                each(concat(functions, properties), function(prop) {
                    target[prop] = extension[prop];
                });
            });
        }

        return target;
    }

    /**
     *  Determines if an object property is callable as a function
     *  @param {object} obj - The object to look the property up in
     *  @param {string} prop - The name of the property to check
     */
    exports.isFunction = isFunction;
    function isFunction(obj, prop) {
        if (isType(obj[prop], 'function')) {
            return true;
        }
        return false;
    }

    /**
     *  Return all of an object's own functions/methods with the following schema
     *
     *      descriptor = {
     *          name: The name of the function
     *          fn: The function object itself, prebound with the object's context
     *          arguments: The number of arguments the function takes
     *      }
     */
    exports.functions = functions;
    function functions(obj) {
        var funcs = [];

        for (var key in obj) {
            if (has(obj, key) && isFunction(obj, key)) {
                var createExecutor = function(k) { return bind(obj[k], obj); };
                var func = {
                      name: key
                    , fn: createExecutor(key)
                    , arguments: obj[key].length
                };
                funcs.push(func);
            }
        }

        return funcs;
    }

    /**
     *  Return all of an object's own properties that are not functions
     */
    exports.properties = properties;
    function properties(obj) {
        var props = [];

        for (var key in obj) {
            if (has(obj, key) && !isFunction(obj, key)) {
                var createGet = function(k) { return bind(function() { return this[k]; }, obj); };
                var createSet = function(k) { return bind(function(value) { this[k] = value; }, obj); };
                var prop = {
                      name: key
                    , get: createGet(key)
                    , set: createSet(key)
                };
                props.push(prop);
            }
        }

        return props;
    }

    /**
     *  Pick the value associated with the specified property for
     *  each object in an array of objects.
     */
    exports.pick = pick;
    function pick(objs, prop) {
        return reduce(objs, function(result, obj) {
            if (obj[prop])
                result.push(obj[prop]);
            return result;
        }, []);
    }

    /**
     *  With no args, returns an empty string. With one arg x, returns
     *  x.toString(). str(null) returns an empty string. With more than
     *  one arg, returns the concatenation of the str values of the args.
     */
    exports.str = str;
    function str(seperator) {
        var args = slice(arguments);
        // If no seperator was provided, the first argument should be part of the result
        if (!isType(seperator, 'string')) {
            seperator = null;
        } else {
            args = slice(args, 1);
        }

        if (args.length) {
            return reduce(args, function (memo, arg) {
                var append = '';
                // Reduce an array to a string
                if (isType(arg, 'array'))
                    append = reduce(arg, function(m, a) { return m + a.toString(); }, '');
                else if (exists(arg.toString))
                    append = arg.toString();
                else
                    append = Object.prototype.toString.call(arg);

                if (empty(memo))
                    return append;
                else if (exists(seperator))
                    return memo + seperator + append;
                else return memo + append;
            }, '');
        } else return '';
    }

    /**
     *  Returns a new string or RegExp (depending on which one was passed in as target).
     *  EXAMPLES:
     *      stringex.interpolate('yellow #{0}', 'moon')    #=> 'yellow moon'
     *      stringex.interpolate(/^[#{0}]$/g, '\\w')       #=> /^[\w]$/g
     *      stringex.interpolate('My #{0} is #{name}', 'name', {
     *          name: 'Paul'
     *      })                                             #=> 'My name is Paul'
     *  NOTES:
     *      1.) The arguments object is used here to allow for an unlimited number of parameters.
     *      2.) You can mix and match interpolation types (named, indexed), but in order to
     *          use named variables, you must pass in an object with those names as properties.
     *          Objects are ignored for indexing (they will only be used for replacing named variables)
     *          so the order of the parameters is important, with Objects being the only exception.
     */
    exports.format = format;
    function format(s) {
        function interpolate(s, args) {
            if (isType(s, type.regex) || isType(s, type.string)) {

                // The pattern to match for interpolation variables
                var interpolated, interpolationPattern = /#\{[\d]+\}|#\{[\w-_]+\}/g;
                // An array of strings that were split by matching on the interpolation pattern
                var matches = [];
                // Regular expression parts to be reassembled later
                var flags, regex;

                if (isType(s, type.regex)) {
                    // Get the array of matches for flags, and use
                    // shift to remove the pattern match element
                    flags = /.+\/([gim]+)?$/.exec(s.toString());
                    flags.shift();
                    // Get the raw pattern without the js jive
                    regex = /^\/(.+)\/[gim]+?$/.exec(s.toString());
                    regex.shift();

                    // We're assuming that to reach this point, this is a valid regexp,
                    // so regex will always contain one element, which is the raw pattern
                    interpolated = regex[0];
                }
                else {
                    interpolated = s;
                }

                if (args.length) {
                    // For every argument passed in, find the interpolation variable with
                    // the same index value (minus one to account for the string var istelf).
                    // So: interpolate("Hello, #{0}. #{1}", 'Paul', "It's nice to meet you.") will
                    // render "Hello, Paul. It's nice to meet you."
                    matches = interpolationPattern.test(interpolated) ? interpolated.match(interpolationPattern).length : 0;

                    if (matches === args.length) {
                        // There was an argument supplied for all interpolations
                        interpolated = doReplace(interpolated, args);
                    }
                    else if (matches < args.length) {
                        // There were more arguments supplied than interpolations
                        interpolated = doReplace(interpolated, args);
                    }
                    else if (matches > args.length) {
                        // There were fewer arguments supplied than interpolations
                        var memo = args[args.length - 1];
                        // Replace the provided arguments
                        interpolated = doReplace(interpolated, args);
                        // Replace remaining interpolations with the last provided argument value
                        interpolated = doReplaceAll(interpolated, memo);
                    }
                }

                return interpolated;
            }
            else {
                throw new Error('Invalid type passed as interpolation target. Must be string or RegExp.');
            }

        }

        // Iterate through the arguments, peforming either an indexed or named interpolation depending on param type
        function doReplace(target, replacements) {
            var result = target;
            each(replacements, function (arg, index) {
                if (isType(arg, type.object)) {
                    for (var key in arg) {
                        var pattern = new RegExp('#\\{' + key + '\\}', 'g');
                        result = result.replace(pattern, arg[key]);
                    }
                }
                else {
                    var pattern = new RegExp('#\\{' + index + '\\}', 'g');
                    result = result.replace(pattern, arg.toString());
                }
            });
            return result;
        }

        // Replace all instances of #{[\d]+}
        function doReplaceAll(target, replace) {
            var result = target.replace(interpolationPattern, replace.toString());
            return result;
        }

        return interpolate(s, slice(arguments, 1));
    }


    /**
     *  Returns string of random characters with a length matching the specified limit. Excludes 0
     *  to avoid confusion between 0 and O.
     *
     *  @param {int} limit - The max length of the string returned
     */
    exports.randomChars = randomChars;
    function randomChars(limit) {
        // If no limit was passed, return a string with a sane default limit
        limit = limit || 32;
        var strongAlphanumerics = [
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            1, 2, 3, 4, 5, 6, 7, 8, 9
        ];

        var collected = [];
        for (var i = 0; i < limit; i++) {
            collected.push(strongAlphanumerics[Math.floor(Math.random() * 61)]);
        }

        return collected.toString().replace(/[,]/g, '');
    }

    /**
     * Repeats the provided string n-times. Returns a new string.
     */
    exports.repeat = repeat;
    function repeat(str, n) {
        n = n || 1;

        if (!isType(str, 'string'))
            throw new Exception('repeat: str must be a string.');
        if (!isType(n, 'number'))
            throw new Exception('repeat: n must be a number.');

        var result = str;
        for (var i = 1; i < n; i++) {
            result = result + str;
        }

        return result;
    }

    /**
     * Generate a string of N random digits
     */
    exports.randomDigits = randomDigits;
    function randomDigits(limit) {
        limit = limit || 32;
        var result = '';
        while (result.length < limit) {
            result = result + Math.random().toString(10).slice(2);
        }
        return result.slice(0, limit);
    }

    /**
     *  Generates a string of N random hexadecimal characters
     *  @param {int} limit - The length of the string to return
     */
    exports.randomHex = randomHex;
    function randomHex(limit) {
        limit = limit || 32;
        var result = '';
        while (result.length < limit) {
            result = result + Math.random().toString(16).slice(2);
        }
        return result.slice(0, limit);
    }

    /**
     *  Generates an RFC4122, version 4, UUID
     *
     *  References:
     *      http://www.ietf.org/rfc/rfc4122.txt (particularly version 4)
     *      https://twitter.com/#!/kriskowal/status/157519149772447744
     *      http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
     *      http://note19.com/2007/05/27/javascript-guid-generator/
     *      http://www.broofa.com/Tools/Math.uuid.js
     *      http://www.broofa.com/blog/?p=151
     */
    exports.uuid = uuid;
    function uuid() {
        return randomHex(8) + "-" + randomHex(4) + "-4" + randomHex(3) + "-" + randomHex(8) + randomHex(4);
    }


    /** Join a collection with the provided seperator. */
    exports.join = join;
    function join   (c, sep) { return Array.prototype.join.call(c, sep); }
    /** Slice a collection given a start and end index (both optional). */
    exports.slice = slice;
    function slice  (c, start, end) { return Array.prototype.slice.call(c, start, end); }
    /**  Concatenate N arguments into a new array. (immutable) */
    exports.concat = concat;
    function concat ()     { return Array.prototype.concat.apply([], slice(arguments)); }
    /**  Push N arguments onto the provided array (immutable) */
    exports.push = push;
    function push   (c)    { return concat(c, slice(arguments, 1)); }
    /**  Cons two items into a new collection */
    exports.cons = cons;
    function cons   (x, y) { return concat(x, y); }
    /** Return the first element of the provided collection */
    exports.first = first;
    function first  (c)    { var result = c[0]; return result; }
    /** Return the last element of the provided collection */
    exports.last = last;
    function last   (c)    { var result = c[c.length-1]; return result; }
    /** Return the first N elements of the provided collection */
    exports.head = head;
    function head   (c, n) { return slice(c, 0, n); }
    /** Return all but the first element of the provided collection */
    exports.tail = tail;
    function tail   (c)    { return slice(c, 1); }
    /** Returns true of the provided collection contains the given element */
    exports.contains = contains;
    function contains (c, item) {
        return any(c, function (element) { return item === element; });
    }
    /** Returns only the unique elements from the provided collection */
    exports.unique = unique;
    function unique (c) {
        var result = [];
        each(c, function(item) {
            if (!contains(result, item))
                result.push(item);
        });
        return result;
    }
    /** Returns the union of N collections */
    exports.union = union;
    function union  ()     {
        return reduce(slice(arguments), function (result, item) {
            return cons(result, unique(result, item));
        }, []);
    }

    /** Rejects any elements from the provided collection which match the predicate */
    exports.reject = reject;
    function reject(predicate, collection) {
        var result = [];
        iterate(new Generator(collection), function (element) {
            if (!predicate(element))
                result.push(element);
        });
        return result;
    }

    /** Forces iteration over a generator */
    exports.iterate = iterate;
    function iterate(generator, fn) {
        if (!(generator.constructor && generator.constructor.name === 'Generator'))
            throw new Error('Cannot call iterate on any class but Generator.');
        var r = generator.next();
        while (r.constructor && r.constructor.name !== 'StopIteration') {
            fn(r);
            r = generator.next();
        }
    }

    /** Check if a collection contains at least one element matching the predicate */
    exports.any = any;
    function any(collection, predicate) { 
        if (!isType(predicate, type.function))
            throw new Error("any: predicate is not callable.");
        if (!isType(collection, type.array, type.object))
            throw new Error("any: collection provided is not an enumerable object.");

        var result = false;
        iterate(new Generator(collection), function (element) {
            if (predicate(element))
                result = true;
        });

        return result;
    }

    /** Check if all elements of a collection pass a truth test */
    exports.all = all;
    function all(collection, predicate) {
        if (!isType(predicate, type.function))
            throw new Error("all: predicate is not callable.");
        if (!isType(collection, type.array, type.object))
            throw new Error("all: collection provided is not an enumerable object.");

        var result = true;
        iterate(new Generator(collection), function (element) {
            if (!predicate(element))
                result = false;
        });

        return result;
    }


    /**
        Acts as a lazy iterator over a collection (array or object)
        @constructor
     */
    exports.Generator = Generator;
    function Generator(collection) {
        var keys = Object.keys(collection);

        this.next = function () {
            if (keys.length !== 0) {
                return collection[keys.shift()];
            }
            else {
                return new StopIteration(); // throw?
            }

            function StopIteration () {
                this.name = 'StopIteration';
                this.message = 'Iteration of the underlying collection has been completed.';
            }
            StopIteration.prototype = new Error();
        };
    }

    /**
     * Represents an eventual value returned from the completion of single operation.
     */
    exports.Deferred = (function () {
        var callbacks = [],
            deferred = {
                resolve: function (result) { this.complete('resolve', result); },
                reject:  function (err) { this.complete('reject', err); },
                then:    function (resolve, reject) { callbacks.push({ resolve: resolve, reject: reject }); },
                promise: {
                    then: function safeThen(resolve, reject) {
                        deferred.then(resolve, reject);
                        return this;
                    }
                }
            };

        function complete (type, result) {
            deferred.then = type === 'reject'
                ? function(resolve, reject) { deferred.reject(result); return this; }
                : function(resolve)         { deferred.resolve(result); return this; };

            deferred.resolve = deferred.reject = function() { throw new Error("Deferred already completed"); };

            each(callbacks, function (callback) {
                callback[type](result);
            });

            callbacks = null;
        }

        // Cache deferred object after initial creation
        return function Deferred() { return promise; };
    })();


    /**
     *  Bind a function context, as well as any arguments you wish to
     *  partially apply. Returns a function that acts like the old one,
     *  but only requires whatever additional arguments you want to call
     *  it with.
     *  
     *  Note: Meant for instance methods, use papply for static functions.
     */
    exports.bind = bind;
    function bind(fn, context) {
        return function () {
            return fn.apply(context, slice(arguments));
        };
    }

    /**
     *  Partially apply arguments to a function.
     *  Takes a function, and any arguments you want to partially apply.
     *  This will return a new function that acts like the old one, but only
     *  requires whatever additional arguments you want to call it with.
     *  
     *  Note: Meant for static functions, use bind for instance methods.
     */
    exports.papply = papply;
    function papply(fn) {
        var args = slice(arguments, 1);
        return function () {
            var additional = slice(arguments);
            return fn.apply(null, concat(args, additional));
        };
    }

    /**
     *  This function is the equivalent of the 'let' keyword in Clojure. FYI:
     *  'let' binds values to both existing and new variables for the scope of the
     *  'let' body. When binding to existing variables, it simply shadows the
     *  original value with the new. letvars has essentially identical behavior.
     *  You provide a map ({}) of variable names and the values to bind, and a
     *  function to execute with those variables available in the body. The function
     *  will be executed immediately, so use it as you would the original function.
     *
     *  Some additional features based on how this works under the covers:
     *      - You can specify expressions as values in the args object using 2 methods,
     *      the difference is simply in what scope and at what time the expression is
     *      evaluated:
     *          1.) As an immediately evaluated expression: 
     *              { x: (func() + 3) * 4 }
     *          2.) As a string which will be evaluated when the function is called:
     *              { y: 11, x: '(y + 3) * 4' }
     */
    exports.letvars = letvars;
    function letvars(args, fn) {
        // Assemble a string of variable declarations: var i = 0; var j = (y + 3) * 4;
        var names  = Object.keys(args);
        var argstr = reduce(names, function(memo, key) {
            return string.trim(join([memo, 'var', key, '=', args[key], ';'], ' '));
        }, '');
        // Get the function body
        var raw = fn.toString();
        // If fn is a native function, letvars will not work, so throw an explanation
        if (raw.indexOf('[native code]') !== -1) {
            throw new Error('letvars cannot be called with a native function');
        }
        // Define the replacement regex for injecting our variable declarations
        var definition = /^(function)(.*)\{([\^]*)\}/;
        // $0 = The matched string, $3 = Function body
        var inject = function($0, $1, $2, $3) {
            // Inject the variable declarations at the top of the function body.
            // The result is a functor body as a string with our modified function returned
            return 'return (' + $0.replace($3, argstr + ' ' + $3) + ');';
        };
        // HACK: Dear god haaaaaack. But it actually is quite nice in this instance.
        // 
        // Create a new function which wraps our modified function, 
        // and call it using the current context.
        if (definition.test(raw)) throw new Error(format('fn does not match the expected function signature: #{ raw }'));
        return Function(raw.replace(definition, inject))().call(this);
    }

    /**
     *  Takes a set of functions and returns a fn that is the juxtaposition
     *  of those fns. The returned fn takes a variable number of args, and
     *  returns a vector containing the result of applying each fn to the
     *  args (left-to-right).
     *  juxt(a, b, c) => abc(x) => [a(x), b(x), c(x)]
     */
    exports.juxt = juxt;
    function juxt() {
        var fns = slice(arguments);
        if (!fns.length)
            throw new Error('juxt requires at least one argument.');

        return function () {
            var args = slice(arguments);
            return reduce(fns, function (result, fn) {
                result.push(fn.apply(null, args));
                return result;
            }, []);
        };
    }

    /************
    thread
        Threads x through each fn. Inserts x as the last parameter in the first
        fn, converting to an array if it is not one already. If there are more
        functions, inserts the first result as the last item in second fn, etc..
     ****/
    exports.thread = thread;
    function thread(x, fns) {
        if (fns.length) {
            return reduce(fns, function(result, fn) {
                return fn.apply(null, [ result ]);
            }, x);
        }
        else return x;
    }

    /**
     *  Curry allows you to compose two functions into one monolithic function.
     *  The arguments to the final function are applied from right to left.
     *  
     *  Example:
     *      curry(f, g)(2) => f(g(2))
     */
    exports.curry = curry;
    function curry(f, g) {
        if (f && g) {
            return function() {
                var args   = slice(arguments);
                var result = g.apply(null, args);
                return f.apply(null, [ result ]);
            };
        }
        else throw new Error('Curry only accepts two functions.');
    }

    /************
    def
        Define a function and provide either one or more objects on which to apply it
     ****/

    /************
    defmulti(dispatcher, missing, [fn, [fn1, [..]]])
        Define a function which dispatches to one or more functions based on the arguments.
        Parameters:
            dispatcher: The function which tells defmulti how to find the data it needs to dispatch properly,
                        needs to return the value to dispatch on. See the example below.
            missing:    The default method to run if the args signature isn't recognized
            fnX:        Function descriptors to be dispatched (See FunctionDescriptor class below.)
     
      Example:

            var dispatcher = function (config) { 
                return { dispatch: config.environment, args: slice(arguments) }; 
            };
            // A good place for some kind of sane default response
            // default doesn't require a descriptor object because no lookups need to
            // be performed to determine whether or not to call it.
            var default = function (config, query) {
                var repository = new Repository(new MemoryContext(config.logLevel));
                return query.execute(repository);
            };
            // All dispatched methods however require a descriptor { name, fn }.
            // Name is used to match against the dispatcher objects 'dispatch' value
            var sql = {
                name: 'MSSQL',
                fn: function (config, query) {
                    try {
                        var connection = new Connection(config.connectionString);
                        var context = new SQLContext(connection, config.logLevel);
                        var repository = new Repository(context);
                        // Assume query.execute returns a Deferred object
                        return query.execute(repository).then(context.closeConnection);
                    } catch (ex) { 
                        // handle
                    }
                }
            };
            var test = {
                // Set up a test environment to run code against
            };

            // The API is simple, and encourages reusable components where possible
            var executeQuery = defmulti(dispatcher, default, sql, test);
            // Make your exposed API even more succinct using partial application!
            var dbConfig = { environment: 'test' };
            var queryDb = papply(executeQuery, dbConfig);

            // No more conditionals scattered all over your code!!
            queryDb('SELECT * FROM NONSENSE WHERE PHRASE IN ("pies", "gerg")');
     ****/
    function defmulti (dispatcher, missing) {
    }

    /**
     *  Takes `f` function and returns wrapper in return, that may be
     *  used for tail recursive algorithms. Note that returned funciton
     *  is not side effect free and should not be called from anywhere
     *  else during tail recursion. In other words if
     *      `var f = recur(function foo() { ... bar() ... })`
     *  then `bar should never call `f`. It is ok though for `bar` to 
     *  call `recur(foo)` instead.
     */
    exports.recur = recur;
    function recur(fn) {
        var active, nextArgs;
        return function() {
            var args, result;
            nextArgs = arguments;
            if (!active) {
                active = true;
                while (nextArgs) {
                    args = nextArgs;
                    nextArgs = null;
                    result = fn.apply(this, args);
                }
                active = false;
            }
            return result;
        };
    }

    /**
     *  Cache results for a function for calls with identical arguments
     *  Credit to @philogb, @addyosmani, @mathias, and @DmitryBaranovsk 
     */
    exports.memoize = memoize;
    function memoize(fn) {
        return function () {
            var args   = slice(arguments)
                , hash = ''
                , i    = args.length;

            currentArg = null;
            while (i--) {
                currentArg = args[i];
                hash += currentArg === Object(currentArg) ? JSON.stringify(currentArg) : currentArg;
                fn.memoize = fn.memoize || {};
            }
            if (hash in fn.memoize)
                return fn.memoize[hash];
            else {
                fn.memoize[hash] = fn.apply(this, args);
                return fn.memoize[hash];
            }
        };
    }


    /**
     *  Define function 'name' (for this example, we'll use foo) attached to 'context' 
     *  (or 'this', if 'context' is not supplied), that when called for the first time
     *  reassigns itself to a new function which has the result of calling foo captured
     *  in a closure. Before exiting, it then returns the result of calling foo.
     *
     *  Subsequent calls to foo simply return the result that is stored in it's closure. 
     *  This is a fast lookup and efficient especially if the conditionals used in the 
     *  previous solutions are many and complex.
     *
     *  In essence, this results in a means by which you can define a runtime optimized
     *  lookup for a function or value. Instead of calling a function which must perform
     *  potentially expensive evaluation of conditionals or feature detection before returning
     *  a result, lazydef enables you to perform those computations the first time the function
     *  is called, and then return the proper result as if the function had been written without
     *  those comuptations at all!
     *
     *  This is different from memoization, where you want to return the same result for a given 
     *  set of arguments. lazydef is better used in situations like 1.) a function which satisfies
     *  one or more conditions after the first call, but must continually evaluate those conditions
     *  each time the function is called (e.g. a function which has to perform browser feature
     *  detection prior to returning a result). These extra computations are typically unecessary,
     *  and could be expensive to perform. 2.) you want to optimize a function which has variable results, 
     *  but the method by which you get those results is determined at runtime, and is unecessary or
     *  expensive to evaluate for every call (think browser specific functions for retrieving
     *  scroll position on a web page).
     *  Additional Reading: http://michaux.ca/articles/lazy-function-definition-pattern
     *
     *  Example:
     *      this.methodFirstCalled = lazydef('methodFirstCalled', function() {
     *          return new Date();
     *      });
     *      this.methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     *      ...5 seconds...
     *      this.methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     *      ...5 seconds...
     *      this.methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     */
    exports.lazydef = lazydef;
    function lazydef(name, fn, context) {
        return function () {
            var result = fn.apply(this, arguments);
            return ((context || this)[name] = function () { return result; })();
        };
    }


    exports.logging = {};

    var Levels = {
          all:   new Level(0, 'all')
        , debug: new Level(1, 'debug')
        , info:  new Level(2, 'info')
        , warn:  new Level(3, 'warn')
        , error: new Level(4, 'error')
        , none:  new Level(5, 'none')
    };

    /**
     *  Predefined logging levels
     *  @static
     */
    exports.logging.Levels = Levels;

    function Logger() {
        this.level = Levels.all;

        function _log(message) {
            if (root.console && root.console.log)
                console.log(message);
        }

        function _dir(obj) {
            if (root.console && root.console.dir)
                console.dir(obj);
            else if (JSON !== null && JSON !== undefined)
                _log(JSON.stringify(obj));
        }

        this.log = function(level) {
            var args = slice(arguments, 1);
            if (level.gte(this.level)) {
                each(args, function(arg) {
                    if (typeof arg === 'string')
                        _log(format('#{0}: #{1} - #{2}', new Date(), level.name, arg));
                    else if (arg instanceof Exception)
                        _log(arg);
                    else if (arg instanceof Error)
                        _log(format('#{0}: #{1} - #{2}', new Date(), level.name, prettifyException(arg)));
                    else
                        _dir(arg);
                });
            }

            function prettifyException(ex) {
                var exceptionMessage = ex.message || ex.description || String(ex);

                if (ex) {
                    var e = format('Exception: #{0}', exceptionMessage);
                    if (ex.lineNumber) {
                        e = format('#{0} on line: #{1}', e, ex.lineNumber);
                    }
                    if (ex.fileName) {
                        e = format('#{0} in file: #{1}', e, ex.fileName);
                    }
                    if (ex.stack) {
                        e = format('#{e}#{newline}Stack Trace:#{newline}#{stack}', { e: e, newline: string.newline, stack: ex.stack });
                    }

                    return e;
                }

                return 'N/A';
            }

            function getFileName(url) {
                return url.substr(Math.max(url.lastIndexOf('/'), url.lastIndexOf('\\')) + 1);
            }
        };
    }

    Logger.prototype.debug = function() {
        var args = concat(Levels.debug, slice(arguments));
        this.log.apply(this, args);
    };

    Logger.prototype.info = function() {
        this.log.apply(this, Levels.info, slice(arguments));
    };

    Logger.prototype.warn = function() {
        this.log.apply(this, Levels.warn, slice(arguments));
    };

    Logger.prototype.error = function() {
        this.log.apply(this, Levels.error, slice(arguments));
    };

    /**
     *  Defines a logging level, and provides facilities for displaying and comparing them
     *  @constructor
     */
    exports.logging.Level = Level;
    function Level(level, name) {
        this.level = level;
        this.name = name;
    }
    Level.prototype.toString = function() {
        return this.name;
    };
    Level.prototype.eq = function(level) {
        return this.level === level.level;
    };
    Level.prototype.gte = function(level) {
        return this.level >= level.level;
    };

    /**
     *  The core logging object. Provides static methods for logging
     *  both messages and objects. If a browser (like IE), doesn't support
     *  displaying objects in the console, but does support JSON, the object
     *  is rendered as a JSON string.
     */
    exports.log = new Logger();


    return exports;
});