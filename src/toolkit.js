// The toolkit is wrapped up as a module, for compatibility across
// vanilla browser environments, AMD module loaders, and CommonJS
// module based environments (such as Node.js).
(function (root, builder, undefined) {
    // the toolkit namespace object
    var ns = {};

    if (typeof exports === 'object') {
        // CommonJS Native
        exports = builder.call(ns, root, false, builder);
    }
    if (typeof define === 'function') {
        // CommonJS AMD
        define(builder.call(ns, root, false, builder));
    } 
    else {
        // Vanilla environments (browser)
        root.$toolkit = builder.call(ns, root, false, builder);
    }

})(this, function (root, config, builder, undefined) {
    
    
    var console = root.console;

    /*******************
    Constants
     ****/ 
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
    
    /********************
    Convenience Objects
     ****/
    var string = {
          empty: ''
        , newline: '\r\n'
        , trim: function (str) {
            return String.prototype.trim.call(str);
        }
    };
    
/*
################################################
Pre-Requisites
    These are functions and objects that must be initialized before the
    module can be run.
################################################
*/

    /*******************
    getType
        Get the type string for the provided object.
     ****/
    function _getType(obj) {
        if (typeof obj === 'undefined')
            return type.undefined.toUpperCase();
        else if (obj === null)
            return type.null.toUpperCase();
        else if (obj.constructor && obj.constructor.name)
            return obj.constructor.name.toUpperCase();
        else
            return Object.prototype.toString.call(obj).toUpperCase();
    }
    var getType = this.getType = memoize(_getType);

     
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
    var each = this.each = (function () {
        var _each = Array.prototype.forEach || ecma262ForEach;
        return function (collection, iterator, context) { return _each.call(collection, iterator, context); };
    })();


    /*********************
    reduce
        Reduce a collection to a single value, by applying elements left to right until only one is left
     ****/
    var reduce = this.reduce = (function() {
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

    /*********************
    filter
        Remove elements from a collection that do not pass the predicate
     ****/
    var filter = this.filter = (function() {
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
    
    
    /*******************
     Configuration
       A null or undefined configuration object assumes the most restrictive defaults. This is to prevent someone who simply
       forgot to call configure with proper settings from throwing a wrench in their application. Configuration is completely
       optional, but recommended to get the most out of the library.
       
     config === true || config === false
       This is an all or nothing configuration setting. It's mostly for those who want everything, but don't want to clutter up
       code by setting all the config values explicitly.
       
     config === object
       When passed an object for configuration, all unspecified options are defaulted to false. To enable or change the default for an
       option, you need to explicitly set it.
       
       ===============================
       Configurable Options
       
       extendPrototypes: 
            Enables extension of system prototypes with new features. This option only applies to features which do not alter the behavior of those classes.
       enableModules: 
            Loads curl.js for AMD module loading. Applies only to browsers.
     **/
    var defaultConfig = {
            extendPrototypes: false,
            enableModules:    false
        },
        enabledConfig = reduce(Object.keys(defaultConfig), function (obj, key) { 
            obj[key] = true;
            return obj;
        }, {});
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
    
    /**************
    configure(config:object):void
        Re-configure the toolkit
     ****/
    function configure(config) {
        builder.call(this, config, builder);
    }
    this.configure = configure;

    /*******************
    config():object
        Retreive the current configuration object. Read-only.
     ****/
    function getConfig() {
        return config;
    }
    this.config = getConfig;
    
    /*******************
    Exception
        Log an exception message and print exception info
        Returns an error object to throw.
     ****/
    function Exception(message, context) {
        this.info = context;
        this.message = message;

        return this;
    }
    Exception.prototype.toString = function () {
        return 'Exception: ' + this.message;
    };
    this.Exception = Exception;
    
    
/*
##################################################
OBJECTS
##################################################
*/

    /***********************
    eq
        Ripped from Underscore.js with small modifications.
        Internal recursive comparison function for `areEqual`.
     ****/
    function eq(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
        if (a === b) return a !== 0 || 1 / a == 1 / b;
        // A strict comparison is necessary because `null == undefined`.
        if (a == null || b == null) return a === b;
        // Compare types
        if (isType(a, b)) return false;
        switch (getType(a)) {
            // Strings, numbers, dates, and booleans are compared by value.
            case '[object String]':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return a == String(b);
            case '[object Number]':
                // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
                // other numeric values.
                return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
            case '[object Date]':
            case '[object Boolean]':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a == +b;
            // RegExps are compared by their source patterns and flags.
            case '[object RegExp]':
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

    /*******************
    isEqual
        Perform a deep comparison to check if two objects are equal.
     ****/
    function areEqual(a, b) {
        return eq(a, b, [], []);
    };
    this.areEqual = areEqual;

    /*******************
    isType
       Determine if the first object is of the same type as the second object.
       Alternatively, you can pass in a string representing the name of the type
       you are comparing for. A few examples
            isType({}, Object.prototype) ==> true
            isType(obj, undefined)       ==> true
            isType(5, 'number')          ==> true
       IMPORTANT: Referencing constructors instead of the prototype for the object
       you are comparing against will fail! Remember, constructors are of type Function.
       Example: Object == [object Function] and Object.prototype == [object Object]
     ***/
    function isType(x) {
        var args = slice(arguments, 1);
        if (!args.length) 
            throw new TypeError('isType requires at least two arguments.');

        for (var i = 0; i < args.length; i++) {
            if (x === undefined && (y === 'undefined' || y === undefined))
                return true;
            else if (x === null && (y === 'null' || y === null))
                return true;
            else {
                var y = typeof y === 'string' ? y.toUpperCase() : getType(y);
                if (getType(x) === y)
                    return true;
            }
        }
        
        return false;
    }
    this.isType = isType;
    
    /*******************
    exists
        Determine if an object is null or undefined
     ****/
    function exists(obj) {
        return !isType(obj, type.null, type.undefined);
    }
    this.exists = exists;

    /*******************
    has
        Determine if an object has it's own property with the provided name
     ****/
    function has(obj, name) {
        if (!exists(obj))
            throw new Exception('$toolkit.has: Object does not exist.', arguments);
            
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
    this.has = has;
    
    /**************
    mixin
        Safely extend the toolkit, obviously not required, but it's the recommended path

        Parameters:
            $me:  The object to mix into
            $you: The objext we're mixing
            blacklist: A list of function names that cannot be mixed over
     ****/
    // Creates an entirely new object with the properties of both $me and $you
    function mixin($me, $you, blacklist) {
        // Make sure that if we're mixing into the toolkit, certain properties cannot be overwritten
        if (this === $me)
            blacklist = union(['configure', 'config'], blacklist);

        var blacklisted = papply(contains, blacklist || []);
        // Ignore all functions that are blacklisted by name
        var functionNames = pick(functions($you), 'name');
        var valid = reject(papply(contains, blacklisted), functionNames);

        each(valid, function(name) { $me[name] = $you[name]; });
    }
    this.mixin = mixin;

    /***************
    extend
        Extend an object with properties from one or more other objects.
        Last definition wins, so the last object to define a property will
        have it's value set for that property on the resulting object.
     ****/
    function extend($me) {
        var extensions = slice(arguments, 1);

        if (extensions.length)
        {
            each(extensions, function(extension) {
                var properties = has(extension);
                each(properties, function(prop) {
                    $me[prop] = extension[prop];
                });
            });
        }

        return $me;
    }
    this.extend = extend;
    
    /*******************
    isFunction
        Determines if an object property is callable as a function
     ****/
    var isFunction = this.isFunction = memoize(function (obj, prop) {
        if (isType(obj[prop], 'function')) {
            return true;
        }
        
        return false;
    });

    /*******************
    functions
        Return all of an object's own functions/methods

        Returns: A descriptor object with the following schema:
        descriptor = {
            name: The name of the function
            fn: The function object itself, prebound with the object's context
            arguments: The number of arguments the function takes
        }
     ****/
    function functions(obj) {
        var funcs = [];
        
        for (var key in obj) {
            if (isFunction(obj, key)) {
                var func = {
                      name: key
                    , fn: bind(obj[key], obj)
                    , arguments: obj[key].length
                };
                push(func, funcs);
            }
        }
        
        return funcs;
    }
    this.functions = functions;
    
    /*******************
    pick
        Pick the value associated with the specified property for
        each object in an array of objects.
     ****/
    function pick(objs, prop) {
        return reduce(objs, function(final, obj) {
            if (obj[prop])
                final.push(obj[prop]);
            return final;
        }, []);
    }
    this.pick = pick;
    
/*
##################################################
STRINGS
##################################################
*/
    /*********************
    str
        With no args, returns an empty string. With one arg x, returns
        x.toString(). str(null) returns an empty string. With more than
        one arg, returns the concatenation of the str values of the args.
     ****/
    function str() {
        var args = slice(arguments);
        return reduce(args, function (memo, arg) {
            console.log(memo, arg);
            if (!exists(arg)) return memo + '';
            if (isType(arg.toString, 'function')) return memo + arg.toString();
            else return memo + Object.prototype.toString.call(arg);
        }, '');
    }
    this.str = str;

    /* 
    format
        Returns a new string or RegExp (depending on which one was passed in as target).
        EXAMPLES:
            stringex.interpolate('yellow #{0}', 'moon')    #=> 'yellow moon'
            stringex.interpolate(/^[#{0}]$/g, '\\w')       #=> /^[\w]$/g
            stringex.interpolate('My #{0} is #{name}', 'name', {
                name: 'Paul'
            })                                             #=> 'My name is Paul'
        NOTES:
            1.) The arguments object is used here to allow for an unlimited number of parameters.
            2.) You can mix and match interpolation types (named, indexed), but in order to
                use named variables, you must pass in an object with those names as properties.
                Objects are ignored for indexing (they will only be used for replacing named variables)
                so the order of the parameters is important, with Objects being the only exception.
     ****/
    function format(s) {
        var interpolate = function(args) {
            console.log(arguments);
            if (isType(args, type.regex) || isType(args, type.string)) {
                // If this function was called with an array of parameters instead of individual parameters
                // then we need to use that array as our arguments array instead of the arguments object
                if (2 === args.length && isType(first(args), type.array)) {
                    args = first(args);
                }
                // The pattern to match for interpolation variables
                var interpolated, interpolationPattern = /#\{[\d]+\}|#\{[\w-_]+\}/g;
                // An array of strings that were split by matching on the interpolation pattern
                var matches = [];
                // Regular expression parts to be reassembled later
                var flags, regex;

                if (isType(s, type.regex)) {
                  // Get the array of matches for flags, and use
                  // shift to remove the pattern match element
                  flags = /.+\/([gim]+)?$/.exec(string.toString());
                  flags.shift();
                  // Get the raw pattern without the js jive
                  regex = /^\/(.+)\/[gim]+?$/.exec(string.toString());
                  regex.shift();

                  // We're assuming that to reach this point, this is a valid regexp,
                  // so regex will always contain one element, which is the raw pattern
                  interpolated = regex[0];
                } 
                else {
                    // Remove string parameter from arguments and use it as our interpolation target
                    interpolated = args.shift();
                }

                if (args.length) {
                    // For every argument passed in, find the interpolation variable with
                    // the same index value (minus one to account for the string var istelf).
                    // So: interpolate("Hello, #{0}. #{1}", 'Paul', "It's nice to meet you.") will
                    // render "Hello, Paul. It's nice to meet you."
                    matches = interpolated.split(interpolationPattern);

                    if ((matches.length - 1) === (args.length)) {
                        // There was an argument supplied for all interpolations
                        interpolated = doReplace(interpolated, args);
                    } 
                    else if ((matches.length - 1) < (args.length)) {
                        // There were more arguments supplied than interpolations
                        interpolated = doReplace(interpolated, args);
                    } 
                    else if ((matches.length - 1) > (args.length)) {
                        // There were fewer arguments supplied than interpolations
                        var memo = args[args.length - 1];
                        // Replace the provided arguments
                        interpolated = doReplace(interpolated, args);
                        // Replace remaining interpolations with the last provided argument value
                        interpolated = doReplaceAll(interpolated, memo);
                    }
                }

                if (typeof string === 'object' && string.constructor === RegExp) {
                    return flags ? new RegExp(interpolated, flags) : new RegExp(interpolated);
                } 
                else {
                  return interpolated;
                } 
            }
            else {
                throw new TypeError('Invalid type passed as interpolation target. Must be string or RegExp.');
            }

        }(slice(arguments, 1));

        // Iterate through the arguments, peforming either an indexed or named interpolation depending on param type
        function doReplace(target) {
            var args = first(arguments);
            var pattern;

            var result = thread(args, [
                papply(filter, exists), 
                papply(each, replacePattern), 
                papply(reduce, concat)
            ]);
            
            each(arr, function (arg, index) {
                if (isType(arg, type.object)) {
                    for (var key in arg) {
                        pattern = new RegExp('#\\{' + key + '\\}', 'g');
                        target = target.replace(pattern, arg[key]);
                    }
                }
                else {
                    pattern = new RegExp('#\\{' + index + '\\}', 'g');
                    target = target.replace(pattern, arg.toString());
                }
            });
        }

        // Replace all instances of #{[\d]+}
        function doReplaceAll(target, replace) {
            target = target.replace(interpolationPattern, replace.toString());
            return target;
        }
    }
    this.format = format;
    
    
    /**************
    randomChars
        Returns string of random characters with a length matching the specified limit. Excludes 0
        to avoid confusion between 0 and O.
     ****/
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
    this.randomChars = randomChars;

    /***************
    randomN(n)
        generates up to 8 random digits in the upper-case hexadecimal alphabet
        digits beyond 8 chars in length are backfilled with zeros
     ****/
    function randomN(n) {
        return (
            Math.random().toString(16) + "00000000"
        ).slice(2, 2 + n).toUpperCase();
    }
    this.randomN = randomN;

    /***************
    uuid()
        generates an RFC4122, version 4, UUID
        References:
            http://www.ietf.org/rfc/rfc4122.txt (particularly version 4)
            https://twitter.com/#!/kriskowal/status/157519149772447744
            http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
            http://note19.com/2007/05/27/javascript-guid-generator/
            http://www.broofa.com/Tools/Math.uuid.js
            http://www.broofa.com/blog/?p=151
     ****/
    function uuid() {
        return randomN(8) + "-" + randomN(4) + "-4" + randomN(3) + "-" + randomN(8) + randomN(4);
    }
    this.uuid = uuid;

    
/*
##################################################
ARRAYS
##################################################
*/
    // Immutable versions of common array methods
    function join   (c, sep) { return Array.prototype.join.call(c, sep); }
    function slice  (c, start, end) { return Array.prototype.slice.call(c, start, end); }
    function concat ()     { return Array.prototype.concat.apply([], slice(arguments)); }
    function push   (c)    { return concat(c, slice(arguments)); }
    function cons   (x, y) { return concat(x, y); }
    function first  (c)    { var result = c[0]; return result; }
    function last   (c)    { var result = c[c.length-1]; return result; }
    function head   (c, n) { return slice(c, 0, n); }
    function tail   (c)    { return slice(c, 1); }
    function contains (c, item) {
        return any(c, function (element) { return item === element; });
    }
    function unique (c) { return reject(papply(contains, c), concat([], slice(arguments))); }
    function distinct (c) {
        return reject(papply(contains, c), c);
    }
    function union  ()     {
        return reduce(slice(arguments), function (result, item) {
            return cons(result, unique(result, item));
        }, []);
    }
    
    mixin(this, {
          join: join
        , slice: slice
        , concat: concat
        , push: push
        , cons: cons
        , first: first
        , last: last
        , head: head
        , tail: tail
        , contains: contains
        , unique: unique
        , union: union
    });
    
    function reject(predicate, collection) {
        var result = [];
        iterate(new Generator(collection), function (element) {
            if (!predicate(element))
                result.push(element);
        });
        return result;
    }
    this.reject = reject;
    
    function iterate(generator, fn) {
        if (!(generator.constructor && generator.constructor.name === 'Generator'))
            throw new TypeError('Cannot call iterate on any class but Generator.');
        var r = generator.next(); 
        while (r.constructor && r.constructor.name !== 'StopIteration') {
            fn(r);
            r = generator.next();
        }
    }
    function iterate(fn, seed) {

    }
    this.iterate = iterate;
    
    /*********************
    any
        Check if a collection contains at least one element matching the predicate
     ****/
    function any(collection, predicate) { 
        console.log('any:', arguments, getType(predicate), getType(type.function), isType(predicate, type.function));
        if (!isType(predicate, type.function))
            throw new TypeError("any: predicate is not callable.");
        if (!isType(collection, type.array, type.object))
            throw new TypeError("any: collection provided is not an enumerable object.");

        var result = false;
        iterate(new Generator(collection), function (element) {
            if (predicate(element))
                result = true;
        });

        return result;
    }
    this.any = any;
    
    /*********************
        Check if all elements of a collection pass a truth test
     ****/
    function all(collection, predicate) {
        if (!isType(predicate, type.function))
            throw new TypeError("all: predicate is not callable.");
        if (!isType(collection, type.array, type.object))
            throw new TypeError("all: collection provided is not an enumerable object.");

        var result = true;
        iterate(new Generator(collection), function (element) {
            if (!predicate(element))
                result = false;
        });

        return result;
    }
    this.all = all;


    /***********************
    Generator
        Acts as a lazy iterator over a collection (array or object)
     ****/
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
    this.Generator = Generator;
    
/*
##################################################
ASYNC HELPERS
##################################################
*/
    /***********************
    Deferred
        Represents an eventual value returned from the completion of single operation.
     ****/
    var Deferred = this.Deferred = (function () {
        var callbacks = [],
            deferred = {
                resolve: resolve,
                reject:  reject,
                then:    then,
                promise: {
                    then: function safeThen(resolve, reject) {
                        deferred.then(resolve, reject);
                        return this;
                    }
                }
            };

        function complete (type, result) {
            deferred.then = type === 'reject'
                ? function(resolve, reject) { reject(result); return this; }
                : function(resolve)         { resolve(result); return this; };

            deferred.resolve = deferred.reject = function() { throw new Error("Deferred already completed"); };

            each(callbacks, function (callback) {
                callback[type](result);
            });

            callbacks = null;
        }

        function resolve (result) {
            complete('resolve', result);
        }

        function reject (err) {
            complete('reject', err);
        }

        function then (resolve, reject) {
            callbacks.push({ resolve: resolve, reject: reject });
        }

        // Cache deferred object after initial creation
        return function Deferred() { return promise; };
    })();


/*
##################################################
META FUNCTIONS
##################################################
*/

    /****************
    bind
        Bind a function context, as well as any arguments you wish to
        partially apply. Returns a function that acts like the old one,
        but only requires whatever additional arguments you want to call
        it with.
        
        Note: Meant for instance methods, use papply for static functions.
     ****/
    function bind(fn, context) {
        var args = slice(arguments, 2);
        
        return function () {
            return fn.call(context, concat(args, slice(arguments)));
        };
    }
    this.bind = bind;

    /*****************
    papply
        Partially apply arguments to a function.
        Takes a function, and any arguments you want to partially apply.
        This will return a new function that acts like the old one, but only
        requires whatever additional arguments you want to call it with.
        
        Note: Meant for static functions, use bind for instance methods.
     ****/
    function papply(fn) {
        var args = slice(arguments, 1);
        return function () {
            var additional = slice(arguments);
            return fn.apply(null, concat(args, additional));
        };
    }
    this.papply = papply;

    /******************
     letvars 
        This function is the equivalent of the 'let' keyword in Clojure. FYI:
        'let' binds values to both existing and new variables for the scope of the
        'let' body. When binding to existing variables, it simply shadows the
        original value with the new. letvars has essentially identical behavior.
        You provide a map ({}) of variable names and the values to bind, and a
        function to execute with those variables available in the body. The function
        will be executed immediately, so use it as you would the original function.
     
        Some additional features based on how this works under the covers:
            - You can specify expressions as values in the args object using 2 methods,
            the difference is simply in what scope and at what time the expression is
            evaluated:
                1.) As an immediately evaluated expression: 
                    { x: (func() + 3) * 4 }
                2.) As a string which will be evaluated when the function is called:
                    { y: 11, x: '(y + 3) * 4' }
     ****/
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
            throw new TypeError('letvars cannot be called with a native function');
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
        if (definition.test(raw)) throw new TypeError(format('fn does not match the expected function signature: #{ raw }'));
        return Function(raw.replace(definition, inject))().call(this);
    }
    this.letvars = letvars;

    /************
    juxt
        Takes a set of functions and returns a fn that is the juxtaposition
        of those fns. The returned fn takes a variable number of args, and
        returns a vector containing the result of applying each fn to the
        args (left-to-right).
        juxt(a, b, c) => abc(x) => [a(x), b(x), c(x)]
     ****/
    function juxt() {
        var fns = slice(arguments);
        if (!fns.length)
            throw new TypeError('juxt requires at least one argument.');
    
        return function () {
            var args = slice(arguments);
            return reduce(fns, function (final, fn) {
                final.push(fn.apply(null, args));
                return final;
            }, []);
        };
    }
    this.juxt = juxt;

    /************
    thread
        Threads x through each fn. Inserts x as the last parameter in the first
        fn, converting to an array if it is not one already. If there are more
        functions, inserts the first result as the last item in second fn, etc..
     ****/

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
    this.defmulti = defmulti;

    /******************
    recur
        Takes `f` function and returns wrapper in return, that may be
        used for tail recursive algorithms. Note that returned funciton
        is not side effect free and should not be called from anywhere
        else during tail recursion. In other words if
            `var f = recur(function foo() { ... bar() ... })`
        then `bar should never call `f`. It is ok though for `bar` to 
        call `recur(foo)` instead.
     ***/
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
    this.recur = recur;

    /******************
    memoize
        Cache results for a function for calls with identical arguments
        Credit to @philogb, @addyosmani, @mathias, and @DmitryBaranovsk 
     ****/
    function memoize(fn) {  
        return function () {
            var args = slice(arguments),
                hash = '',  
                i    = args.length;  

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
    this.memoize = memoize;


    /******************
    lazydef
        Define function 'name' (for this example, we'll use foo) attached to 'context' 
        (or 'this', if 'context' is not supplied), that when called for the first time
        reassigns itself to a new function which has the result of calling foo captured
        in a closure. Before exiting, it then returns the result of calling foo.

        Subsequent calls to foo simply return the result that is stored in it's closure. 
        This is a fast lookup and efficient especially if the conditionals used in the 
        previous solutions are many and complex.

        In essence, this results in a means by which you can define a runtime optimized
        lookup for a function or value. Instead of calling a function which must perform
        potentially expensive evaluation of conditionals or feature detection before returning
        a result, lazydef enables you to perform those computations the first time the function
        is called, and then return the proper result as if the function had been written without
        those comuptations at all!

        This is different from memoization, where you want to return the same result for a given 
        set of arguments. lazydef is better used in situations like 1.) a function which satisfies
        one or more conditions after the first call, but must continually evaluate those conditions
        each time the function is called (e.g. a function which has to perform browser feature
        detection prior to returning a result). These extra computations are typically unecessary,
        and could be expensive to perform. 2.) you want to optimize a function which has variable results, 
        but the method by which you get those results is determined at runtime, and is unecessary or
        expensive to evaluate for every call (think browser specific functions for retrieving
        scroll position on a web page).
        Additional Reading: http://michaux.ca/articles/lazy-function-definition-pattern

        Example:
            this.methodFirstCalled = lazydef('methodFirstCalled', function() {
                return new Date();
            });
            this.methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
            ...5 seconds...
            this.methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
            ...5 seconds...
            this.methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     ****/
    function lazydef(name, fn, context) {
        return function () {
            var result = fn.apply(this, arguments);
            return ((context || this)[name] = function () { return result; })();
        };
    };
    this.lazydef = lazydef;


/*
##################################################
EXCEPTIONS
##################################################
*/
    this.logging = { 
        Types: {}
    };

    function Logger() {
        this.level = Level.all;
        var appender = (root.console && root.console.log) || function () {};

        this.log = function(level) {
            var args = slice(arguments, 1);
            if (level.gte(this.level)) {
                each(args, function(arg) {
                    if (typeof arg === 'string')
                        appender(format('#{0}: #{1} - #{2}', new Date(), level.level, arg));
                    else if (arg instanceof Exception)
                        appender(arg);
                    else if (arg instanceof Error)
                        appender(format('#{0}: #{1} - #{2}', new Date(), level.level, prettifyException(arg)));
                    else
                        appender(format('#{0}: #{1}:')) && appender(arg);
                });
            }
        };
    }

    Logger.prototype = {
        debug: function() {
            this.log.apply(this, Level.debug, slice(arguments));
        },

        info: function() {
            this.log.apply(this, Level.info, slice(arguments));
            this.log(Level.info, arguments);
        },

        warn: function() {
            this.log.apply(this, Level.warn, slice(arguments));
            this.log(Level.WARN, arguments);
        },

        error: function() {
            this.log.apply(this, Level.error, slice(arguments));
        },
    };

    this.logging.Types.Logger = Logger;
    
    /**********************************
    Level
        Handles logging level functionality
     ****/

    function Level(level, name) {
        this.level = level;
        this.name = name;
    }

    Level.prototype = {
        toString: function() {
            return this.name;
        },
        eq: function(level) {
            return this.level === level.level;
        },
        gte: function(level) {
            return this.level >= level.level;
        }
    };

    this.logging.Types.Level = Level;
    // Define static log levels
    this.logging.Levels = extend({}, {
          all:   new Level(0, 'all')
        , debug: new Level(1, 'debug')
        , info:  new Level(2, 'info')
        , warn:  new Level(3, 'warn')
        , error: new Level(4, 'error')
        , none:  new Level(5, 'none')
    });
    var logger = this.logging.logger = new Logger();


    /*************************************
    Helpers
     ****/
    function getExceptionMessage(ex) {
        return ex.message || ex.description || String(ex);
    }

    function getFileName(url) {
        return url.substr(Math.max(url.lastIndexOf('/'), url.lastIndexOf('\\')) + 1);
    }

    function prettifyException(ex) {
        if (ex) {
            var e = format('Exception: #{0}', getExceptionMessage(ex));
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


/*
##################################################
LOGGING / TEST
##################################################
*/
    /***************
    console.log
        Support console logging on all platforms
     ****/
    var console = root.console || {};
    function log(level) {
        var args = slice(arguments, 1);
        if (level !== undefined && typeof level !== 'string')
            args.unshift(level);
        return logger.log.apply(logger, level || 'INFO', args);
    };
    console.log = console.log || log;

    function inspect(obj, depth) {
        depth = depth && depth < 5 ? depth : 3;
        var _stringify = JSON && JSON.stringify;

        var inspected = false;
        var _obj = obj;
        var _inspect = recur(function(currentDepth, target) {
            var keys = has(target);

        })
        while (!inspected) {
            var _depth = 0;
            var _keys  = has(_obj);


            each(_keys, function(property) {

            })

            for (var _currentDepth = 0; _currentDepth < depth; _currentDepth++) {

            }
        }

        // Final stringification
        if (_stringify) {
            return JSON.stringify(obj, shallowJson(obj), '\t');
        }
        else {

        }
    }
    this.inspect = inspect;
    console.inspect = console.inspect || inspect;

    function customJson(obj, depth) {
        var _currentDepth = 0;
        return function (key, value) {
            if (!key && !depth) {
                depth = 1;
                return value;
            }
            else if (depth > 0 && areEqual(obj, value))
                return undefined;
            else {
                if (depth > 0 && !has(obj, key))
                    return undefined;
                else
                    return value;
            }
        }
    }

    /***************
    console.assert
        Test an assertion as the truthiness of a primitive value or expression
     ****/
    function assert (/* assert1, assert2 */) {
        // Get the list of predicates to assert against
        var assertions = slice(arguments);
        // Return the 
        return !!map(assertions, unwrap, identity)
                .applyTo(function(failed) {
                    logger.error('Assertion failed:', inspect(failed));
                    return failed;
                });
    }

    // Build the logger
    var Logger = function Logger(options) {
        // Store local reference;
        var self = this;
        // Extend the logger with the provided options
        extend(self, options);

        this.attachLogger = function (log) {
            var blacklisted = ['log', 'debug', 'error', 'info', 'inspect', 'assert'],
                result = false;

            (contains(blacklisted))
                .nope(function () {

                });
        };
    };
    var logger = this.logger = {
          log:     console.log     || log
        , debug:   console.debug   || function (options) {
            return config.debug ? papply(log, extend(options, { level: 'debug' })) : indentity;
          }
        , inspect: console.inspect || inspect
        , assert:  console.assert  || assert
        , error:   console.error   || papply(log, { level: 'error'})
    };

    // Extend the console object if enabled
    if (config.extendConsole) {
        if (!exists(console.log))     console.log     = this.log;
        if (!exists(console.inspect)) console.inspect = this.inspect;
        if (!exists(console.assert))  console.assert  = this.assert;

        // Mix in the tweaked console methods to the root console object
        mixin(console, root.console, {}, {
              log:     log
            , inspect: inspect
            , assert:  assert
        });
    }

    return this;
});