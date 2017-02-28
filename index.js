'use strict';

const pkg    = require('./package.json');
const plugin = require('./src/plugin');

exports.register = plugin.register;

// Takes a number and returns its square value
exports.register.attributes = {
    name: pkg.name,
    version: pkg.version
};
