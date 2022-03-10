'use strict';

/**
 * @module models/loyalty/export/exportLoyaltyOrderModel
 *
 * The model is used to export order to Yotpo.
 */

/**
 * This is the main function called by Loyalty Exporter.
 *
 * @param {Object} payload : Raw payload to post to API
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.orderNo : The order number
 * @param {string} params.orderState : The order state e.g created, updated, refunded
 * @returns {boolean} success of export
 */
function exportOrder(payload, params) {
    var Site = require('dw/system/Site');

    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var LoyaltyService = require('*/cartridge/models/loyalty/export/loyaltyService');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var localeID = request.locale;
    var logLocation = 'ExportLoyaltyOrderModel~exportOrder';

    YotpoLogger.logMessage('\n------ Yotpo Export Order To Yotpo Loyalty  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Date format for the Yotpo data: ' + Constants.DATE_FORMAT_FOR_YOTPO_DATA +
            '\n Current Locale: ' + localeID +
            '\n Order Number: ' + params.orderNo +
            '\n Order State: ' + params.orderState, 'debug', logLocation);


    var apiKeys = YotpoConfigurationModel.getLoyaltyAPIKeys(localeID);
    var isValid = !empty(apiKeys);

    if (!isValid) {
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    var loyaltyGuid = apiKeys.guid;
    var loyaltyAPIKey = apiKeys.key;

    var queryParams = {
        guid: loyaltyGuid,
        api_key: loyaltyAPIKey
    };
    var success = LoyaltyService.exportData(payload, queryParams, 'orders');
    return success;
}

/**
 * Post Order data to Yotpo API
 * @param {*} ordersArray Payload data to post to yotpo
 * @param {*} locale locale to lookup api key info
 * @throws {Constants.EXPORT_LOYALTY_SERVICE_ERROR} If the post to the loyalty service was unsuccessful.
 */
function exportOrdersByLocale(ordersArray, locale) {
    var LoyaltyService = require('*/cartridge/models/loyalty/export/loyaltyService');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'ExportLoyaltyOrderModel~exportOrderByLocale';

    var keys = YotpoConfigurationModel.getLoyaltyAPIKeys(locale);
    if (!keys) {
        var error = 'Failed to export loyalty Order event. Unable to load Yotpo Loyalty API Key for locale: ' + locale;
        YotpoLogger.logMessage(error, 'error', logLocation);
        throw new Error(error);
    }

    var queryParams = {
        guid: keys.guid,
        api_key: keys.key
    };
    var payload = { orders: ordersArray };
    LoyaltyService.exportData(payload, queryParams, 'process_orders_batch');
}


/**
 * Get an Order object iterator starting from a given order ID
 * @param {*} lastOrderId Str Order ID to start iterator from
 * @returns {Object} orderIterator order object iterator
 */
function getOrderExportObjectIterator(lastOrderId) {
    var OrderMgr = require('dw/order/OrderMgr');
    var orderIterator = OrderMgr.searchOrders('orderNo >= {0}', 'orderNo ASC', lastOrderId);
    return orderIterator;
}

/**
 * This is the main function called by Loyalty Exporter.
 *
 * @param {string} OrderNo : The Order number
 * @returns {Object} Json payload to post to Yotpo
 */
function generateOrderExportPayload(OrderNo) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Site = require('dw/system/Site');

    var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'ExportLoyaltyOrderModel~generateOrderExportPayload';

    YotpoLogger.logMessage('\n------ Yotpo Export Order To Yotpo Loyalty  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Order Number: ' + OrderNo, 'debug', logLocation);

    var orderObj = OrderMgr.getOrder(OrderNo);

    return LoyaltyOrderModel.prepareOrderJSON(orderObj);
}

/**
 * Post Order data to Yotpo API
 * @param {*} payload Payload data to post to yotpo
 * @param {*} locale locale to lookup api key info
 * @throws {Constants.EXPORT_LOYALTY_SERVICE_ERROR} If the post to the loyalty service was unsuccessful.
 */
function exportOrderByLocale(payload, locale) {
    var LoyaltyService = require('*/cartridge/models/loyalty/export/loyaltyService');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'ExportLoyaltyOrderModel~exportOrderByLocale';

    var keys = YotpoConfigurationModel.getLoyaltyAPIKeys(locale);
    if (!keys) {
        var error = 'Failed to export loyalty Order event. Unable to load Yotpo Loyalty API Key for locale: ' + locale;
        YotpoLogger.logMessage(error, 'error', logLocation);
        throw new Error(error);
    }

    var queryParams = {
        guid: keys.guid,
        api_key: keys.key
    };
    LoyaltyService.exportData(payload, queryParams, 'orders');
}

/**
 * Return iterator for loyalty Order export objects
 *
 * @returns {Object} Order Object iterator
 */
function getQueuedOrderExportObjects() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('*/cartridge/scripts/utils/constants');

    return CustomObjectMgr.queryCustomObjects(constants.YOTPO_LOYALTY_ORDER_EXPORT_OBJECT,
        'custom.Status = {0} OR custom.Status = {1}',
        'creationDate desc',
        'QUEUED',
        'FAIL');
}

/* Module Exports */
exports.generateOrderExportPayload = generateOrderExportPayload;

exports.getQueuedOrderExportObjects = getQueuedOrderExportObjects;
exports.getOrderExportObjectIterator = getOrderExportObjectIterator;

exports.exportOrderByLocale = exportOrderByLocale;
exports.exportOrdersByLocale = exportOrdersByLocale;

exports.exportOrder = exportOrder;
