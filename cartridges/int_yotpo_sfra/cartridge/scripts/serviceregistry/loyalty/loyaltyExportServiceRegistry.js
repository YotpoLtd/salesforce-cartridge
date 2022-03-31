'use strict';

/**
*
* This is the Export Order and Customer service for Yotpo Loyalty
*
*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var loyaltyService = LocalServiceRegistry.createService('int_yotpo_sfra.https.post.loyalty.api', {

    // eslint-disable-next-line no-unused-vars
    mockExec: function (svc, params) {
        return {
            123412887: 'Unknown Error',
            123412889: 'Invalid email address',
            123412890: 'Missing value, sfcc_id'
        };
    },

    createRequest: function (svc, args) {
        svc.addHeader('Content-Type', 'application/json; charset=utf-8');

        return args;
    },

    parseResponse: function (svc, rawResponse) {
        return rawResponse;
    },

    // Hide sensitive data in server request and response logs
    getRequestLogMessage: function (reqObj) {
        var requestJSON = JSON.parse(reqObj);
        requestJSON.api_key = '';
        requestJSON.guid = '';

        if (requestJSON.ip_address) {
            requestJSON.ip_address = '';
        }

        if (requestJSON.customer_id) {
            requestJSON.customer_id = '';
        }

        if (requestJSON.customer_email) {
            requestJSON.customer_email = '';
        }

        if (requestJSON.remote_ip) {
            requestJSON.remote_ip = '';
        }

        if (requestJSON.id) {
            requestJSON.id = '';
        }

        if (requestJSON.email) {
            requestJSON.email = '';
        }

        if (requestJSON.first_name) {
            requestJSON.first_name = '';
        }

        if (requestJSON.last_name) {
            requestJSON.last_name = '';
        }

        return JSON.stringify(requestJSON);
    }
});

exports.loyaltyService = loyaltyService;
