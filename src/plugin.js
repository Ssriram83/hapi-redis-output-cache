'use strict';

const joi                = require('joi');
const cacheKeyGenerator  = require('./cacheKeyGenerator');
const Redis = require('ioredis');

exports.register = function (plugin, options, next) {
    const validation = joi.validate(options, require('./schema'));
    const attempt = options.attempt || 3;
    const connectionOptions = {
        host: options.host,
        port: options.port || 6379,
        retry_strategy: function (attempt) {
            const reconnectAfter = Math.min(Math.pow(attempt, 2) * 100, 10000);
            plugin.log('cache', `${options.error}. Attemting to reconnect in ${reconnectAfter}ms.`);
            return reconnectAfter;
        }
    };
    const client = (options.cluster) ? new Redis.Cluster([connectionOptions]): new Redis(connectionOptions);
    if(validation.error) {
        return next(validation.error);
    }

    // const client = require('redis').createClient({
    //     host: options.host,
    //     port: options.port || 6379,
    //     retry_strategy: function (options) {
    //         const reconnectAfter = Math.min(Math.pow(options.attempt, 2) * 100, 10000);
    //         plugin.log('cache', `${options.error}. Attemting to reconnect in ${reconnectAfter}ms.`);
    //
    //         return reconnectAfter;
    //     }
    // });

    client.on('error', err => {
        plugin.log('cache', err);
});

    client.on('ready', () => {
        plugin.log('cache', 'Connected.');
});

    plugin.ext('onPreHandler', (req, reply) => {
        const routeOptions = req.route.settings.plugins['hapi-redis-output-cache'] || {};
    if(routeOptions.isCacheable !== true) {
        return reply.continue();
    }

    if(req.route.method !== 'get') {
        return reply.continue();
    }

    const cacheKey = cacheKeyGenerator.generateCacheKey(req, options);

    if(client.connected) {
        try {
            client.get(cacheKey, (err, data) => {
                if(err) {
                    plugin.log('cache', options.error);
                    return reply.continue();
                }

                if(data) {
                    const cachedValue = JSON.parse(data);
                    req.outputCache = {
                        data: cachedValue,
                        isStale: true
                    };

                    const currentTime = Math.floor(new Date() / 1000);

                    if(cachedValue.expiresOn > currentTime) {
                        req.outputCache.isStale = false;

                        const response = reply(cachedValue.payload);
                        response.code(cachedValue.statusCode);

                        const keys = Object.keys(cachedValue.headers);
                        for(let i = 0; i < keys.length; i++) {
                            const key = keys[i];
                            response.header(key, cachedValue.headers[key]);
                        }

                        response.hold();
                        response.send();
                    }
                }

                return reply.continue();
        });
        } catch (err) {
            plugin.log('cache', `Unable to perform GET on ${options.host}:${options.port} for key ${cacheKey}. Redis returned: ${err}`);
            return reply.continue();
        }
    } else {
        return reply.continue();
    }
});

    plugin.ext('onPreResponse', (req, reply) => {
        const routeOptions = req.route.settings.plugins['hapi-redis-output-cache'] || {};
    if(routeOptions.isCacheable !== true) {
        return reply.continue();
    }

    if(req.route.method !== 'get') {
        return reply.continue();
    }

    if(req.response.statusCode !== 200) {
        if (req.response.statusCode >= 500 && req.response.statusCode < 600 && req.outputCache && req.outputCache.data) {
            req.response.statusCode = req.outputCache.data.statusCode;
            req.response.headers['content-type'] = 'application/json; charset=utf-8';

            const keys = Object.keys(req.outputCache.data.headers);
            for(let i = 0; i < keys.length; i++) {
                const key = keys[i];
                req.response.headers[key] = req.outputCache.data.headers[key];
            }

            req.response.source = req.outputCache.data.payload;
        }

        return reply.continue();
    }

    if(req.outputCache && req.outputCache.isStale === false) {
        return reply.continue();
    }

    const cacheKey = cacheKeyGenerator.generateCacheKey(req, options);

    const cacheValue = {
        statusCode: req.response.statusCode,
        headers: req.response.headers,
        payload: req.response.source,
        expiresOn: Math.floor(new Date() / 1000) + options.staleIn
    };

    if(client.connected) {
        try {
            client.setex(cacheKey, options.expiresIn, JSON.stringify(cacheValue));
            options.onCacheMiss(req, reply);
        } catch (err) {
            plugin.log('cache', `Unable to perform SETEX on ${options.host}:${options.port} for key ${cacheKey}. Redis returned: ${err}`);
        }
    }

    return reply.continue();
});

    next();
};
