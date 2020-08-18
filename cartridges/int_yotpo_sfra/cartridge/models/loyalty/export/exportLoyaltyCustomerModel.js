'use strict';

/**
 * @module scripts/yotpo/model/loyalty/export/exportLoyaltyCustomerModel
 *
 * The model is used to export customer data to Yotpo
 */

/**
 * This is the main function called by Loyalty Exporter.
 *
 * @param {string} customerNo : The customer number
 * @returns {Object} Json payload to post to Yotpo
 */
function generateCustomerExportPayload(customerNo) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Site = require('dw/system/Site');

    var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'ExportLoyaltyCustomerModel~generateCustomerExportPayload';

    YotpoLogger.logMessage('\n------ Yotpo Export Order To Yotpo Loyalty  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Customer Number: ' + customerNo, 'debug', logLocation);

    var customerObj = CustomerMgr.getCustomerByCustomerNumber(customerNo);
    var profile = customerObj.profile;

    return LoyaltyCustomerModel.prepareCustomerJSON(profile);
}

/**
 * Post customer data to Yotpo API
 * @param {*} payload Payload data to post to yotpo
 * @param {*} locale locale to lookup api key info
 * @throws {Constants.EXPORT_LOYALTY_SERVICE_ERROR} If the post to the loyalty service was unsuccessful.
 */
function exportCustomerByLocale(payload, locale) {
    var LoyaltyService = require('./loyaltyService');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'ExportLoyaltyCustomerModel~exportCustomerByLocale';

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
    LoyaltyService.exportData(payload, queryParams, 'customers');
}

/**
 * Return iterator for loyalty customer export objects
 *
 * @returns {Object} Customer Object iterator
 */
function getQueuedCustomerExportObjects() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('*/cartridge/scripts/utils/constants');

    return CustomObjectMgr.queryCustomObjects(constants.YOTPO_LOYALTY_CUSTOMER_EXPORT_OBJECT,
        'custom.Status = {0} OR custom.Status = {1}',
        'creationDate desc',
        'QUEUED',
        'FAIL');
}

/* Module Exports */
exports.generateCustomerExportPayload = generateCustomerExportPayload;
exports.exportCustomerByLocale = exportCustomerByLocale;
exports.getQueuedCustomerExportObjects = getQueuedCustomerExportObjects;
