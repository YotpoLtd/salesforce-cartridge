'use strict';

/**
*
*    This is the Export Config service to communicate with Yotpo.
*	 Relays the rudimentary Cartridge Configuration/Version details to Yotpo.
*
*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var yotpoExportCartridgeConfigSvc = LocalServiceRegistry.createService('int_yotpo_sfra.https.post.export.cartridge.config.api', {

    /**
     * Creates a request object to be used when calling the service
     *
     * @param {dw.svc.Service} service - Service being executed.
     * @param {Object} params - Parameters given to the call method.
     *
     * @returns {Object} - Request object to give to the execute method
     */
    createRequest: function (service, params) {
        service.addHeader('Content-Type', 'application/json; charset=utf-8');
        service.addHeader('Accept', '*/*');
        service.addHeader('Accept-Encoding', 'gzip,deflate');

        return params;
    },

    /**
     * Creates a response object from a successful service call.
     * This response object will be the output object of the call method's Result.
     *
     *  @param {dw.svc.Service} service - Service being executed
     *  @param {Object} response - Service-specific response object
     *
     * @returns {dw.svc.Result} - Object to return in the service call's Result.
     */
    parseResponse: function (service, response) {
        return response.text;
    },

    /**
     * Creates a communication log message for the given request.
     * Used to hide sensitive data in server request logs
     *
     * @param {Object} request - Request object
     *
     * @returns {string} - Log message, or null to create and use the default message
     */
    getRequestLogMessage: function (request) {
        var requestJSON = JSON.parse(request);
        return JSON.stringify(requestJSON);
    },

    /**
     * Allows filtering communication URL, request, and response log messages
     *
     * @param {string} msg - original log message
     *
     * @returns {string} - Message to be logged
     */
    filterLogMessage: function (msg) {
        return msg;
    },

    /**
     * Creates a response log message for the given request
     * Can accept {Object} response - service response object
     * As a parameter
     *
     * @param {Object} response - service response object
     *
     * @returns {string} - Log message, or null to create and use the default message
     */
    getResponseLogMessage: function () {
        return null;
    }

});

exports.yotpoExportCartridgeConfigSvc = yotpoExportCartridgeConfigSvc;
