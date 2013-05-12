Toolbox.js
====================

My personal javascript toolbox. No external dependencies, and offers all the utilities you need to write clean and modular application code. 

## Current Status

`toolbox.js` is complete and stable at this point. Documentation has been generated, and unit tests are either implemented or on the way. All functions have been informally tested by hand, but the unit tests should provide some measure of consistency and protection moving forward.

`toolbox.enumerable.js` is not complete, and should not be used at the moment. Expect that to change soon. No documentation or tests.

`recursion.js` is not complete, and shoult not be used at the moment. Expect that to change soon. No documentation or tests.

## TODO

1. Complete unit tests for `toolbox.js`
2. Refactor `toolbox.enumerable.js`, fix bugs, make stable.
3. Docs and tests for `toolbox.enumerable.js`
4. Repeat 2 and 3 for `recursion.js`
5. Think of a proper name

## Usage

You can use this library via Node or the browser. Either `require` it or add the appropriate `<script>` tag. 
It can be loaded with any AMD or CommonJS module loader, so if you use `require.js` or the like, this should work
fine for you.

If you called `$toolbox.configure` with `createGlobalAliases` set to true, you should be able to access toolbox functions
as if they were natively available, i.e., instead of `$toolbox.string.isEmpty('')`, you should be able to call `string.empty('')`
directly. Any functions that were already in global scope will never be overwritten, but the console will log these instances so
that you are aware when it happens. By default no global aliases are created, and the only prototype that may be extended is Array.prototype,
to ensure that forEach, map, reduce, and filter always exist - if they do exist, they are not overridden.

## Development

You'll need jsdoc3 and vows installed. You can get both packages via `npm`.

1. Fork and clone the repo
2. Run the tests with `vows tests/*`
3. If you make changes to comments, update documentation with `jsdoc -c conf.json`
4. Pull request!

## LICENSE
This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 Unported License.