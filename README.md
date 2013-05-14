Toolbox.js
====================

My personal javascript toolbox. No external dependencies, and offers all the utilities you need to write clean and modular application code. 

## Current Status

`toolbox.js` is complete and stable at this point. Documentation has been generated, and unit tests are either implemented or on the way. All functions have been informally tested by hand, but the unit tests should provide some measure of consistency and protection moving forward.

## TODO

1. Complete unit tests for `toolbox.js`
5. Think of a proper name

## Usage

You can use this library via Node or the browser. Either `require` it or add the appropriate `<script>` tag. 
It can be loaded with any AMD or CommonJS module loader, so if you use `require.js` or the like, this should work
fine for you.

If you called `toolbox.configure` with `createGlobalAliases` set to true, you should be able to access toolbox functions
as if they were natively available, i.e., instead of `toolbox.string.isEmpty('')`, you should be able to call `string.isEmpty('')`
directly. Any functions that were already in global scope will never be overwritten, but the console will log these instances so
that you are aware when it happens. By default no global aliases are created, and no prototypes are extended.

## Development

You'll need jsdoc3 and vows installed. You can get both packages via `npm`.

1. Fork and clone the repo
2. Build the project with `./build.sh`
3. Pull request!

## LICENSE
This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 Unported License.
