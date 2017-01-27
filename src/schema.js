'use strict';

const joi = require('joi');

module.exports = {
    host: joi.string().required(),
    port: joi.number().min(1),
    partition: joi.string(),
    varyByHeaders: joi.array(),
    cluster: joi.boolean(),
    attempt: joi.number(),
    staleIn: joi.number().min(1).required(),
    expiresIn: joi.number().min(1).required(),
    onCacheMiss: joi.func()
};
