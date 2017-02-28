'use strict';

const hapi = require('hapi');
let fauxEndpoints;

module.exports = (options, next) => {
    const server = new hapi.Server();
    server.connection({ port: 3000 });

    options = options || {};
    options.redis = options.redis || {};

    server.on('log', event => {
        console.log(event);
    });

    server.route({
        method: "GET",
        path: "/cacheable-successful-request/{id}",
        config: {
            handler: (req, reply) => {
                reply({ id: req.params.id, test: true }).header('Content-Language', 'de-DE');
            },
            plugins: {
                'hapi-ioredis-output-cache': { isCacheable: true,expiresIn:120 }
            }
        }
    });
    server.route({
        method: "PUT",
        path: "/cacheable-successful-request/{id}",
        config: {
            handler: (req, reply) => {
                reply({ id: req.params.id, test: true }).header('Content-Language', 'de-DE').code(204);
            },
            plugins: {
                'hapi-ioredis-output-cache': { clearCache: true,expiresIn:120 }
            }
        }
    });
    server.route({
        method: "POST",
        path: "/cacheable-successful-request",
        config: {
            handler: (req, reply) => {
                reply({ test: true }).header('Content-Language', 'de-DE').code(200);
            },
            plugins: {
                'hapi-ioredis-output-cache': { isCacheable: true }
            }
        }
    });

    server.route({
        method: "GET",
        path: "/non-cacheable-successful-request",
        config: {
            handler: (req, reply) => {
                reply({ test: true }).header('Content-Language', 'de-DE');
            }
        }
    });

    server.route({
        method: "GET",
        path: "/cacheable-failed-request",
        config: {
            handler: (req, reply) => {
                reply().code(500);
            },
            plugins: {
                'hapi-ioredis-output-cache': { isCacheable: true }
            }
        }
    });

    server.register([
        {
            register: require('../index'),
            options: {
                partition: options.redis.partition || 'test',
                host: options.redis.host || '127.0.0.1',
                port: options.redis.port || 6379,
                staleIn: 30,
                expiresIn: 60,
                onCacheMiss: options.onCacheMiss || function(req, reply) { reply.request.context = { cacheMiss: true } }
            }
        }
    ],
    err => {
        if (err) {
            throw err;
        }

        fauxEndpoints = {
            request: (options, next) => {
                server.inject({
                    method: options.method || 'GET',
                    url: options.url,
                    headers: options.headers
                }, response => {
                    next(response);
                });
            }
        };

        setTimeout(() => {
            return next(fauxEndpoints);
        }, 50);
    });
};
