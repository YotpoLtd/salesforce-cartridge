'use strict';

/**
 * @module scripts/yotpo/model/loyalty/export/loyaltyService
 *
 * The script is used to export payload for Loyalty to Yotpo and to get data from Yotpo
 */

/**
 * This function sends JSON payload to Yotpo. It makes HTTP request and reads the response and logs it.
 * It returns error in case of some problem in data submission.
 *
 * @param {Object} payload : The data in JSON format to be exported to Yotpo.
 * @param {Object} queryParams : The query string parameters appended to endpoint.
 * @param {string} endpoint : The endpoint to send data to.
 *
 * @returns {boolean} status: The flag to indicate the export status
 */
function exportData(payload, queryParams, endpoint) {
    var Result = require('dw/svc/Result');
    var LoyaltyExportServiceRegistry = require('*/cartridge/scripts/serviceregistry/loyalty/loyaltyExportServiceRegistry');
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');

    var logLocation = 'loyaltyService~exportData';
    var result;
    var serviceEndpoint;

    try {
        var loyaltyService = LoyaltyExportServiceRegistry.loyaltyService;
        var loyaltyCredentials = loyaltyService.getConfiguration().getCredential();
        var baseURL = loyaltyCredentials.getURL();

        if (empty(baseURL)) {
            var errorMsg = 'The URL is empty for int_yotpo_sfra.https.post.loyalty.api';
            YotpoLogger.logMessage(errorMsg, 'error', logLocation);
            throw new Error(errorMsg);
        }

        serviceEndpoint = YotpoUtils.appendParamsToUrl(baseURL + endpoint, queryParams);
        loyaltyService.setURL(serviceEndpoint);

        var requestJSON = JSON.stringify(payload);
        loyaltyService.addHeader('Content-Length', requestJSON.length);
        result = loyaltyService.call(requestJSON);
    } catch (e) {
        YotpoLogger.logMessage('Error occured while trying to export data - ' + e, 'error', logLocation);
        throw Constants.EXPORT_LOYALTY_SERVICE_ERROR;
    }

    if (result.status === Result.OK) {
        YotpoLogger.logMessage('The data sumbitted successfully to Yotpo.', 'debug', logLocation);
    } else {
        var error = 'Could not export data to Yotpo ' +
            '- HTTP Status Code is: ' + result.error +
            '\n Error Text is: ' + result.errorMessage +
            '\n Yotpo Loyalty Endpoint is: ' + serviceEndpoint;
        YotpoLogger.logMessage(error, 'error', logLocation);
        throw new Error(Constants.EXPORT_LOYALTY_SERVICE_ERROR + ' ' + error);
    }

    return true;
}

/* Module Exports */
exports.exportData = exportData;
