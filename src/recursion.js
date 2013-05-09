// Copyright (c) 2010 Guillaume Lathoud
// MIT License
/*jslint evil:true */

// The three main functions are:
//
//     tailopt             (calls tailopt_str, then source2fun)
//     tailopt.tailopt_str (returns modified source code strings)
//     tailopt.source2fun  (eval strings to a function)
// 
// To prevent scope issues during the final eval(), we put as much as
// possible under the tailopt.* namespace (a function is an object).
// 
// -----
// Using tailopt.tailopt_str alone
//
// If you do not trust function decompilation:
//
//     Function.prototype.toString
//
// in your target Javascript environment(s) (e.g. mobile), you can
// integrate tailopt.tailopt_str in your Javascript build system,
// and have your server deliver the *already* optimized code.
// 
// -----
// Using tailopt and tailopt.source2fun: scope issues
//
// In your tail recursive function, you should avoid any other closure
// than the tail recursion, because the modified code will most likely
// be eval'ed in a different scope.
//
// In other words, your tail recursive function should be implemented 
// in a scope-independent manner.
//
// Example: in tailopt.tailopt_str we use tailopt.remove_comments (=no
// closure) and not a locally defined remove_comments closure.


// xxx with a parser we could detect closures, inform the user with a
// warning, (or even refuse to optimize the function).  In the future,
// I need to integrate a parser for this reason, and for several
// others (see xxx's below, e.g. variable collision issue).

// recur is wrapped up as a module, for compatibility across
// vanilla browser environments, AMD module loaders, and CommonJS
// module based environments (such as Node.js).
(function (root, init, undefined) {
    
    if (typeof exports === 'object') {
        // CommonJS Native
        init(root, exports);
    }
    if (typeof define === 'function') {
        // CommonJS AMD
        define(init(root, (root.recursion = {})));
    } 
    else {
        // Vanilla environments (browser)
        init(root, (root.recursion = {}));
    }

})(this, function (root, exports, undefined) {

    // Shorthand method for retrieving the first element from an array;
    function first (a) { return (a !== null && a !== undefined && a[0]) || null; }
    // Shorthand method for slicing an array
    function slice (c, start, end) { return Array.prototype.slice.call(c, start, end); }

    // IE has some eval issues, so if detected, use fallback mode, this is super nasty, but *shrug*
    var browser_version = root.navigator && root.navigator.appVersion
        , ie_version    = browser_version && parseFloat(first(browser_version.split('MSIE ')))
        , fallback_mode = !(ie_version || false);

    function error() {
        if (console && console.log) 
            console.log(arguments);
        // else: do nothing
    }

    /******************************************
    recur
        Parameters:
            fn: The function to optimize for tail recursion.
        Definition:
            Function => Function
     ****/
    function recur(fn) {
        if (typeof fn !== 'function')
            throw new TypeError('Invalid parameter for fn passed to recur. Must be of type function.');

        var optimized = null,
            workspace = stringify(fn);

        try {
            optimized = createfn(workspace.optimized_source);
        } catch (ex) {
            console.log(ex, ex.stack);
            optimized = null;
        }
        
        if (!optimized) {
            error('recur() failed: ' + workspace.original.head + '.');
            // Gracefully degrade to non-optimized function
            return optimized;
        }
        return optimized;
    }
    exports.recur = recur;

    /**************************
    createfn
        Parameters:
            source: The function's decompiled source string
        Definition:
            String => Function

        Example source string:
            "function sum(x, y) { if (y > 0) { return sum(++x, --y); } else { return x; } }"
     ****/
    function createfn(source, workspace) {
        var optimized = null;
        try {
            optimized = !fallback_mode && eval(source);
        } catch (ex) {
            optimized = null;
            error('createfn() failed: ' + workspace.original.head + ', error: ' + ex);
        }

        if (!optimized) {
            try {
                eval('ret = ' + source + ';');
            } catch (ex) {
                optimized = null;
                error('createfn() [fallback mode] failed: ' + ex + "\nwhile eval'ing source: " + source);
            }
        }

        if (!optimized) {
            throw new Error('createfn() failed to create function with source: ' + source);
        }

        return optimized;
    }


    /****************************
    stringify
        Returns an object containing several strings:
            {
                optimized_source: "(" + new_head + "{" + new_body + "})",
                optimized_head: new_head, 
                optimized_body: new_body, 
                original: { 
                    name: name,
                    head: head,
                    body: body
                }        
            }
    
        Also, stringify itself is tail-recursive!
     ****/
    function stringify(name, fn, body) {
        // Function vars
        var fname, source, head;
        // Optimized vars
        var optimized_head, optimized_body, optimized, result;
        // Parser vars
        var components, regex, matches;

        if (typeof name === 'function')
            return stringify('', name);

        fname = name;

        if (typeof fn === 'function') {
            if (!fn.toSource && !fn.toString) {
                error('Unable to obtain function sources. Returning unoptimized function.');
                return fn;
            }

            source = fn.toSource ? fn.toSource() : fn.toString();
            regex = /^\s*\(\s*(.*?)\s*\)\s*$/;
            while (matches = regex.exec(source)) source = matches[1];

            regex = /^\s*(function\s*([\w]*?)\s*\([\w\W]*?\))\s*\{([\w\W]*?)\}\s*$/;
            if (!regex.test(source)) {
                error('Function source code is in an unrecognized format. Returning unoptimized function.' + '\nSource:\n' + source);
                return fn;
            }
            components = regex.exec(source);
            return stringify(name || components[2], components[1], components[3])
        }
        head = fn;

        try {
            optimized_head = remove_comments(head)
            optimized_body = remove_comments(body);
            optimized_body = optimize(optimized_head, optimized_body);

            if (fname) {
                optimized      = optimize_top(optimized_head, optimized_body, fname);
                optimized_head = optimized.head;
                optimized_body = optimized.body;
            }
        }
        catch (err) {
            error('stringify is returning the unoptimized function because of an unexpected exception:', err, err.stack, head, body);

            optimized_head = head;
            optimized_body = body;
        }

        return {
            optimized_source: '(' + optimized_head + '{' + optimized_body + '})'
            , optimized_head: optimized_head
            , optimized_body: optimized_body
            , original: {
                name: fname,
                head: head,
                body: body
            }
        };
    }

    /************************
    remove_comments
        Strip javascript comments from the provided string

        @TODO: Currently doesn't handle comments within strings or regular expressions. They are left intact for now.
               It's possible that a parser could be needed to handle all edge cases, but this is sufficient for most cases.
     ****/
    function remove_comments(source) {
        var a, b, result = source;
        // multiline: /* comment */
        // inline:    // comment
        var multiline = /\/\/[\w\W]*?$/m,
            inline    = /\/\*[\w\W]*?\*\//;

        while (true) {
            a = result.indexOf('/*');
            b = result.indexOf('//');

            a = a < 0 ? +Infinity : a;
            b = b < 0 ? +Infinity : b;

            var infinite = !((a < +Infinity) || (b < +Infinity));
            if (infinite)
                break;
            
            if (a < b) {
                result = result.replace(inline, '\n');
            } 
            else {
                result = result.replace(multiline, '');
            }
        }

        return result;
    }

    function optimize(head, body) {
        var optimized_body;

        // Iterate until we've optimized out all tail calls
        while (true) {
            optimized_body = optimize_next(head, body);
            // No further tail calls found
            if (optimized_body === body) {
                return body;
            }

            // Update the body with the newly optimized body and start again
            body = optimized_body;
        }
    }

    function optimize_top(head, body, name) {
        
        if (!head || !body || !name)
            return;

        var vars = get_vars(head, body),
            optimized_head,
            optimized_body;

        // Maybe the top function itself has a tail call?
        // If yes, we should unroll it. Let us just try.

        // Ensure that vars are unique, should check for collisions
        var temp = new Array(vars.length);
        for (var a = 0; a < vars.length; a++) {
            temp[a] = '__0_' + vars[a] + '_0__';
        }

        var temp_head = 'function(' + temp.join(',') + ')';
        var temp_body = 'var ' + name + '; return (' + name + ' = function (' + vars.join(',') + '){' + body + '})(' + temp.join(',') + ');';

        optimized_head = temp_head;
        optimized_body = optimize_next(temp_head, temp_body);

        if (optimized_body.substring(optimized_body.indexOf('{') + 1, optimized_body.lastIndexOf('}')) !== body) {
            // Operation was successful, return the modified function
            return { 
                head: optimized_head,
                body: optimized_body
            };
        } else {
            // Operation failed, return the original function
            return {
                head: head,
                body: body
            };
        }
    }

    function optimize_next(head, body) {

        // List variables
        var vars = get_vars(head, body);

        // List blocks
        var blocks = get_blocks(body);

        // Currently doesn't support pre/postfix parantheses for expressions
        // There is no warning for this condition either

        var forms = [
            // First form
            {
                prefix:  /\breturn\s*function\s*(\w+)\s*(\([^\(\)]*?\))\s*$/,
                postfix: /^\s*(\([^\(\)]*?\))/
            },
            // First form, with superfluous parentheses
            {
                prefix:  /\breturn\s*\(\s*function\s*(\w+)\s*(\([^\(\)]*?\))\s*$/,
                postfix: /^\s*\)\s*(\([^\(\)]*?\))/
            },
            // Second form, with an anonymous function expression
            { 
                prefix:  /\breturn\s*\(\s*(\w+)\s*=\s*function\s*(\([^\(\)]*?\))\s*$/,
                postfix: /^\s*\)\s*(\([^\(\)]*?\))/
            }
        ];
        
        for (var a = 0; a < blocks.length; a++) {
            var start = blocks[a][0],
                end   = blocks[a][1];

            var prefix  = body.substring(0, start),
                block   = body.substring(start, end + 1),
                postfix = body.substring(end + 1);

            for (var rx = 0; rx < rx.length; rx++) {

                var pre  = forms[rx].prefix,
                    post = forms[rx].postfix;

                if (pre.test(prefix) && post.test(postfix)) {      
                    
                    var matching_prefix = pre.exec(prefix),
                        fname           = matching_prefix[1],
                        parameters      = get_vars(matching_prefix[2], null);

                    var matching_postfix = post.exec(postfix),
                        param_val        = get_vars(matching_postfix[1], null);

                    /**********************
                        Make sure variable names do not collide after unrolling tail calls
                        1a.) Rename parameters and variables in body
                        1b.) Detect collisions and warn user
                    ****/
                    
                    var label = 'L_' + fname;


                    /**********************
                    Expand recursive conditionals, like:
                         return <expr_without_fname> ? <fname>(...) : <something_else>
                     or:
                         return <expr_without_fname> ? <expr_without_fname> : <fname>(...)
                     or:
                         return <expr_without_fname> ? <fname>(...)> : <fname>(...)
                    ****/

                    var new_block_body = expand_recursive_conditionals(block, fname);
                    var tail           = new RegExp('\\breturn\\s+' + fname + '\\s*(\\([^\\(\\)]*\\))\\s*;');

                    while (tail.test(new_block_body)) {
                        var match   = tail.exec(new_block_body),
                            tailval = get_vars(mo[1], null);

                        var tailrepl = '{ ';
                        for (var b = 0; b < tailval.length; b++) {
                            if (tailval[b] !== parameters[b]) {
                                tailrepl += parameters[b] + '_new = ' + tailval[b] + ';\n';
                            }
                        }
                        for (var b = 0; b < tailval.length; b++) {
                            if (tailval[b] !== parameters[b]) {
                                tailrepl += parameters[b] + ' = ' + parameters[b] + '_new;\n';
                            }
                        }
                        tailrepl += 'continue ' + label + ';\n}';

                        new_block_body = new_block_body.substring(0, match.index) 
                                         + tailrepl 
                                         + new_block_body.substring(match.index + match[0].length);
                    }


                    /*************************
                        @TODO: Optimizations

                        1.) Remove unused variables, e.g

                            c = a + a;
                            a = c;

                            Becomes,

                            a = a + a;

                            Only when no other variable update depends on 'a'.

                        2.) Compute dependency graph, and generate the min number of assignments.
                    ****/
                    var arr = [];
                    for (var b = 0; b < parameters.length; b++) {
                        
                        c = parameters[b];
                        if (param_val[b] !== undefined) {
                            c += ' = ' + param_val[b];
                        }
                        arr.push(c);
                        arr.push(parameters[b] + '_new');
                    }

                    new_block = 'var ' + arr.join(', ') + ';\n';
                    new_block += label + ': while (true) ' + new_block_body; 

                    // Put the new block in place
                    new_body = body.substring(0, start - matching_prefix[0].length) 
                                + new_block 
                                + body.substring(end + 1 + matching_postfix[0].length);


                    return new_body;
                }
            }
        }

        return body;
    }

    /***********************
    get_vars
        Get all variable definitions and usages from source.
     ****/
    function get_vars(head, body) {
        // Get parameter list variable definitions
        var parameter_list = /\(([\w\W]*?)\)/,
            parameter      = /^\s*([\w\W]*?)\s*$/;

        var params = parameter_list.exec(head)[1].split(',');

        var result = [];
        for (var i = 0; i < params.length; i++) {
            result.push(parameter.exec(params[i])[1]);
        } 

        // @TODO: Parse body for vars

        return result;
    }

    /*************************
    get_blocks
        Find all '{' and '}', and group them into blocks
     ****/
    function get_blocks(source) {
        var last     = source.length
            , open   = -1
            , close  = -1
            , closes = []
            , blocks = [];
        
        while (true) {
            last--;
            if (open < 0) { 
                open  = source.lastIndexOf('{', last); 
            }
            if (close < 0) {  
                close = source.lastIndexOf('}', last); 
            }
            
            if (open > close) {
                last = open;
                blocks.push([open, closes.pop()]);
                open = -1;
                
            } else if (close > open) {
                last = close;
                closes.push(close);
                close = -1;
                
            } else {
                break;
            }
        }
        
        blocks.reverse();
        return blocks;
    }


    function expand_recursive_conditionals(block, fname) {
        var result = block
            , rcond = /\breturn\s+([^;\?:]+?)\s*\?\s*([^;\?:]+?)\s*:\s*([^;\?:]+?)\s*;/
            , cond
            , pre
            , new_cond
            , post
            , last = 0;
        
        while (cond = rcond.exec(result.substr(last))) {

            if (cond[1].indexOf('return') > -1) {
                last += cond.index + 'return'.length;
                continue;
            }

            if (cond[1].indexOf(fname) > -1) {

                // Detect mistaken conditionals (not a "named let", and not a tail call)
                if (! (new RegExp('^\\s*\\(\\s*' + fname + '\\s*=\\s*')).test(cond[1])) {
                    throw new Error('expand_recursive_conditionals(block, fname) found a mistake: ' +
                                    'to have a tail call, fname must *not* be in the test part of the conditional.');
                }

                // Do not modify irrelevant conditionals
                last += cond.index + cond[0].length;
                continue;
            }

            // Do not modify irrelevant conditionals
            if ((cond[2].indexOf(fname) < 0) && (cond[3].indexOf(fname)) < 0) {
                last += cond.index + cond[0].length;
                continue;
            }

            // Expand relevant conditionals
            // xxx permit without { } (this concerns more the "optimize" code above)
            pre      = result.substr(0, last + cond.index);
            new_cond = ' if(' + cond[1] + '){return ' + cond[2] + ';}return ' + cond[3] + ';';
            post     = result.substr(last + cond.index + cond[0].length);


            result = pre + new_cond + post;
            last   = last + pre.length + new_cond.length;
        }

        return result;
    }
});