'use strict';

/**
 * @module scripts/loyalty/export/loyaltyExporter
 *
 * The script is used to export data to Yotpo for Loyalty.
 */

/**
 * This is the main function called to Export Order for Loyalty to Yotpo.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.orderNo : The order number
 * @param {string} params.orderState : The order state e.g created, updated, refunded
 *
 * @return {boolean} true | false : Return true if mandatory params are present other wise return false
 */
function exportLoyaltyOrder(params) {
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var logLocation = 'loyaltyExporter~exportLoyaltyOrder';
    var localeID = params.locale || 'default';

    // Only send the order feed if the yotpo cartridge is enabled, loyalty is enabled, and the loyalty order feed is enabled
    // The isLoyaltyOrderFeedEnabled attribute will allow client to turn off order feed entirely so they can pull orders directly
    // from their OMS
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', localeID);
    var isLoyaltyOrderFeedEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableOrderFeed', localeID);
    var isValid = !empty(YotpoConfigurationModel.getLoyaltyAPIKeys(localeID));

    if (!isLoyaltyEnabled || !isLoyaltyOrderFeedEnabled || !isValid) {
        return false;
    }

    try {
        if (!params.orderNo || !params.orderState || !(params.orderState === 'created' ||
            params.orderState === 'updated' || params.orderState === 'refunded')) {
            YotpoLogger.logMessage('The parameters missing mandatory data therefore aborting the process.',
                'error', logLocation);
            return false;
        }

        var payload = params.payload;
        if (empty(payload)) {
            var OrderMgr = require('dw/order/OrderMgr');
            var order = OrderMgr.getOrder(params.orderNo);
            var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
            payload = LoyaltyOrderModel.prepareOrderJSON(order);
        }

        var ExportLoyaltyOrderModel = require('*/cartridge/models/loyalty/export/exportLoyaltyOrderModel');
        ExportLoyaltyOrderModel.exportOrder(payload, params);
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while exporting order number: ' + params.orderNo +
                ', Exception is: ' + ex, 'error', logLocation);
        return false;
    }

    return true;
}

/**
 * This is the main function called to Export Customer for Loyalty to Yotpo.
 * This is triggerred in both account creation or update cases.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.customerNo : The customer number
 *
 * @return {boolean} true | false : Return true if mandatory params are present other wise return false
 */
function exportLoyaltyCustomer(params) {
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var logLocation = 'loyaltyExporter~exportLoyaltyCustomer';
    var localeID = params.locale || 'default';

    var exported = {
        error: true,
        message: ''
    };

    // Only send the customer feed if the yotpo cartridge is enabled, loyalty is enabled, and the loyalty customer feed is enabled
    // The isLoyaltyCustomerFeedEnabled attribute will allow client to turn off customer feed entirely so they can pull customers directly
    // from an external customer management system
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', localeID);
    var isLoyaltyCustomerFeedEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableCustomerFeed', localeID);
    var isValid = !empty(YotpoConfigurationModel.getLoyaltyAPIKeys(localeID));

    if (!isLoyaltyEnabled || !isLoyaltyCustomerFeedEnabled || !isValid) {
        exported.message = 'notenabled';
        return exported;
    }

    try {
        if (!params.customerNo) {
            YotpoLogger.logMessage('The customer number is missing therefore aborting the process.',
                'error', logLocation);
            exported.message = 'customermissing';
            return exported;
        }

        var exportLoyaltyCustomerModel = require('*/cartridge/models/loyalty/export/exportLoyaltyCustomerModel');
        var payload = exportLoyaltyCustomerModel.generateCustomerExportPayload(params.customerNo);
        exportLoyaltyCustomerModel.exportCustomerByLocale(payload, params.locale);
    } catch (ex) {
        // Customer failed to send to yotpo so fallback method is to save it as a CO to queue for sending later
        // through a job
        try {
            var LoyaltyCOCreator = require('*/cartridge/scripts/loyalty/export/loyaltyCustomerCO');
            LoyaltyCOCreator.createLoyaltyCustomerCO({
                customerNo: params.customerNo,
                locale: params.locale,
                customerState: params.customerState
            });
            if (params.customerState) {
                exported.message = params.customerState === 'created' ? 'loyalty.registration.delay' : 'loyalty.edit.delay';
            }
            return exported;
        } catch (e) {
            // The SFCC account was created but was not successfully sent to Yotpo.
            // Fallback CO creation also failed. Need to communicate this to user.
            YotpoLogger.logMessage('Something went wrong while exporting customer and creating the fallback CO: ' + params.customerNo +
            ', Exception is: ' + e, 'error', logLocation);
            if (params.customerState) {
                exported.message = params.customerState === 'created' ? 'loyalty.registration.error' : 'loyalty.edit.delay';
            }
            return exported;
        }
    }

    exported.error = false;
    return exported;
}

/* Module Exports */
exports.exportLoyaltyOrder = exportLoyaltyOrder;
exports.exportLoyaltyCustomer = exportLoyaltyCustomer;
