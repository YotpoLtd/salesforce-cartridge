'use strict';

/**
 * @module scripts/yotpo/model/loyalty/export/exportLoyaltyCustomerModel
 *
 * The model is used to export customer data to Yotpo
 */

/**
 * Post customer data to Yotpo API
 * @param {*} customerArray Payload data to post to yotpo
 * @param {*} locale locale to lookup api key info
 * @throws {Constants.EXPORT_LOYALTY_SERVICE_ERROR} If the post to the loyalty service was unsuccessful.
 */
function exportCustomersByLocale(customerArray, locale) {
    var LoyaltyService = require('./loyaltyService');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'ExportLoyaltyCustomerModel~exportCustomersByLocale';

    var keys = YotpoConfigurationModel.getLoyaltyAPIKeys(locale);
    if (!keys) {
        var error = 'Failed to export loyalty Customer event. Unable to load Yotpo Loyalty API Key for locale: ' + locale;
        YotpoLogger.logMessage(error, 'error', logLocation);
        throw new Error(error);
    }

    var queryParams = {
        guid: keys.guid,
        api_key: keys.key
    };
    var payload = { customers: customerArray };
    LoyaltyService.exportData(payload, queryParams, 'process_customers_batch');
}

/**
 * Get a customer object iterator starting from a given customer ID
 * @param {*} lastCustomerId Str customer ID to start iterator from
 * @returns {Object} custIterator customer object iterator
 */
function getCustomerExportObjectIterator(lastCustomerId) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var custIterator = CustomerMgr.searchProfiles('customerNo >= {0}', 'customerNo ASC', lastCustomerId);
    return custIterator;
}

/* Module Exports */
exports.exportCustomersByLocale = exportCustomersByLocale;
exports.getCustomerExportObjectIterator = getCustomerExportObjectIterator;
