'use strict';

const _ = require('underscore');

const lowerCase = array => {
    const result = [];

    for(let i = 0; i < array.length; i++) {
        result.push(array[i].toLowerCase());
    }

    return result;
};

const normaliseUrl = url => {
    const pathname = url.pathname.toLowerCase();
    const sortedQueryKeys = _.keys(url.query).sort();

    let normalisedQuery = '';
    sortedQueryKeys.forEach(key => {
        normalisedQuery += `${key}=${url.query[key]}&`
    });

    if(normalisedQuery.length > 0) {
        normalisedQuery = `?${normalisedQuery}`
    }

    return `${pathname}${normalisedQuery}`;
};

const normaliseHeaders = (rawRequestHeaders, varyByHeaders) => {
    if(!varyByHeaders) {
        return null;
    }

    const requestHeaders = _.map(_.keys(rawRequestHeaders), requestHeaderKey => {
        return {
            key: requestHeaderKey.toLowerCase(),
            value: rawRequestHeaders[requestHeaderKey]
        }
    });

    const varyByHeaderKeys = _.sortBy(lowerCase(varyByHeaders));

    const filteredHeaders = _.compact(_.map(varyByHeaderKeys, varyByHeaderKey => {
        const requestHeader = _.find(requestHeaders, requestHeader => { return requestHeader.key === varyByHeaderKey; });
        return requestHeader ? `${requestHeader.key}=${requestHeader.value.replace(/(\s+)/gi, '')}` : null;
    }));

    return filteredHeaders.join('|');
};

module.exports = {
  generateCacheKey: (req, options) => {
      const partition = options.partition || 'default';
      const method    = req.route.method.toLowerCase();
      const path      = normaliseUrl(req.url);
      const headers   = normaliseHeaders(req.headers, options.varyByHeaders);

      return _.compact([partition, path, headers]).join('|');
  },
  generateDelKey: (req, options) => {
        const partition = options.partition || 'default';
        //const method    = req.route.method.toLowerCase();

        let path      = normaliseUrl(req.url);
        //const headers   = normaliseHeaders(req.headers, options.varyByHeaders);
        return [_.compact([partition, path]).join('|'),_.compact([partition, path.substring(0,path.lastIndexOf('/'))]).join('|')];
  }
};
