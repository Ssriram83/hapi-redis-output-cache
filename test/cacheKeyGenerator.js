'use strict';

const expect    = require('expect.js');
const generator = require('../src/cacheKeyGenerator');

describe('cacheKeyGenerator', () => {
    describe('given custom partition and varyByHeaders', () => {
        it('should generate cache key with custom partition, method, path and filtered headers', () => {
            const req = {
                route: {
                    method: 'get'
                },
                url: {
                    query: {
                        a: '1',
                        C: '3',
                        b: '2'
                    },
                    pathname: '/ReSoUrCe'
                },
                headers: {
                    a: 'a',
                    'Accept-Language': 'en-au, en-us,  en',
                    b: 'b',
                    accept: 'text/html',
                    c: 'c'
                }
            };

            const options = {
                partition: 'test',
                varyByHeaders: ['Accept', 'accept-language', 'accept-encoding']
            };

            expect(generator.generateCacheKey(req, options)).to.equal('test|get|/resource?C=3&a=1&b=2&|accept=text/html|accept-language=en-au,en-us,en');
        });
    });

    describe('given no partition', () => {
        it('should generate cache key with "default" partition, method, path and filtered headers', () => {
            const req = {
                route: {
                    method: 'get'
                },
                url: {
                    pathname: '/resource'
                }
            };

            const options = {
                partition: undefined,
                varyByHeaders: ['Accept', 'accept-language', 'accept-encoding']
            };

            expect(generator.generateCacheKey(req, options)).to.equal('default|get|/resource');
        });
    });

    describe('given no varyByHeaders', () => {
        it('should generate cache without headers', () => {
            const req = {
                route: {
                    method: 'get'
                },
                url: {
                    pathname: '/resource'
                },
                headers: {
                    accept: 'text/html',
                    'accept-language': 'en-au, en-us, en'
                }
            };

            const options = {
                partition: 'test',
                varyByHeaders: undefined
            };

            expect(generator.generateCacheKey(req, options)).to.equal('test|get|/resource');
        });
    });
});
