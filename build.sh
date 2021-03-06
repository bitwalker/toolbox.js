#!/usr/bin/env bash

vows=./node_modules/vows/bin/vows

# Run tests
$vows ./tests/*

echo ""

if [ $? -eq 0 ]; then
    # Build minified script
    java -jar ./build/compiler.jar --js=./src/toolbox.js --js_output_file=./src/toolbox.min.js
    echo "Minified script output to src/toolbox.min.js."

    # Regenerate Documentation
    jsdoc -c ./conf.json
    echo "Documentation rebuilt."
else
    echo "Tests failed, minified script and documentation were not generated."
fi

