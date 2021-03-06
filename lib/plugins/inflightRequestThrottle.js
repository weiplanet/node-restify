'use strict';

var assert = require('assert-plus');
var ServiceUnavailableError = require('restify-errors').ServiceUnavailableError;
var defaultResponse = new ServiceUnavailableError('resource exhausted');

/**
 * inflightRequestThrottle
 *
 * Place an upper limit on the number of inlfight requests restify will accept.
 * For every request that exceeds this threshold, restify will respond with an
 * error. This plugin should be registered as early as possible in the
 * middleware stack using `pre` to avoid performing unnecessary work.
 *
 * @param {Object} opts configure this plugin
 * @param {Number} opts.limit maximum number of inflight requests the server
 *    will handle before returning an error
 * @param {Error} opts.err A restify error used as a response when the inflight
 *    request limit is exceeded
 * @param {Function} opts.server the instance of the restify server this plugin
 *    will throttle.
 * @returns {Function} middleware to be registered on server.pre
 */
function inflightRequestThrottle (opts) {

    // Scrub input and populate our configuration
    assert.object(opts, 'opts');
    assert.number(opts.limit, 'opts.limit');
    assert.object(opts.server, 'opts.server');
    assert.func(opts.server.inflightRequests, 'opts.server.inflightRequests');

    if (opts.err !== undefined && opts.err !== null) {
        assert.ok(opts.err instanceof Error, 'opts.err must be an error');
        assert.optionalNumber(opts.err.statusCode, 'opts.err.statusCode');
    }

    var plugin = {};
    plugin._err = opts.err || defaultResponse;
    plugin._limit = opts.limit;
    plugin._server = opts.server;

    function onRequest (req, res, next) {
        var inflightRequests = plugin._server.inflightRequests();

        if (inflightRequests > plugin._limit) {
            req.log.trace({
                plugin: 'inflightRequestThrottle',
                inflightRequests: inflightRequests,
                limit: plugin._limit
            }, 'maximum inflight requests exceeded, rejecting request');
            res.send(plugin._err);
            return next(false);
        }

        return next();
    }

    return onRequest;
}

module.exports = inflightRequestThrottle;
