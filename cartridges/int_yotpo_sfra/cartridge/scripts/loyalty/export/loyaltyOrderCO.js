'use strict';

/**
 * @module models/loyalty/export/loyaltyOrderCO
 *
 * The script is used to prepare and update export data to Yotpo for Loyalty.
 */

/**
 * This is used to store order to yotpoLoyaltyOrder custom object for sending to Yotpo.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.orderNo : The order number
 * @param {string} params.orderState : The order state e.g created, updated, refunded
 */
function createLoyaltyOrderCO(params) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Site = require('dw/system/Site');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var localeID = params.locale;
    var logLocation = 'loyaltyOrderCO~createLoyaltyOrderCO';

    YotpoLogger.logMessage('\n------ Yotpo Export Order To Yotpo Loyalty  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Date format for the Yotpo data: ' + Constants.DATE_FORMAT_FOR_YOTPO_DATA +
            '\n Current Locale: ' + localeID +
            '\n Order Number: ' + params.orderNo +
            '\n Order State: ' + params.orderState, 'debug', logLocation);

    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', localeID);
    var isLoyaltyOrderFeedEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableOrderFeed', localeID);
    var isValid = !empty(YotpoConfigurationModel.getLoyaltyAPIKeys(localeID));

    if (!isLoyaltyEnabled || !isLoyaltyOrderFeedEnabled || !isValid) {
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    var orderNo = params.orderNo;
    var order = OrderMgr.getOrder(orderNo);
    order = LoyaltyOrderModel.saveUserInfoInOrder(order);

    var payloadOrderJSON = LoyaltyOrderModel.prepareOrderJSON(order);
    var payload = JSON.stringify(payloadOrderJSON);

    try {
        Transaction.wrap(function () {
            var newLoyaltyCO = CustomObjectMgr.createCustomObject('yotpoLoyaltyOrder', dw.util.UUIDUtils.createUUID());
            newLoyaltyCO.custom.OrderID = orderNo;
            newLoyaltyCO.custom.Payload = payload;
            newLoyaltyCO.custom.Status = 'QUEUED';
            newLoyaltyCO.custom.StatusDetails = '';
            newLoyaltyCO.custom.locale = localeID;
        });
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while creating yotpoLoyaltyOrder CO for order: ' + orderNo +
                ', Exception is: ' + ex, 'error', logLocation);
    }
}

/**
 * This is used to update order CO after send to yotpo
 *
 * @param {Object} co : The CO to update
 * @param {Object} params : The parameters containing the status to update the CO to
 */
function updateLoyaltyOrderCO(co, params) {
    var Transaction = require('dw/system/Transaction');
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var localeID = request.locale;
    var logLocation = 'loyaltyOrderCO~updateLoyaltyOrderCO';

    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', localeID);
    var isLoyaltyOrderFeedEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableOrderFeed', localeID);
    var isValid = !empty(YotpoConfigurationModel.getLoyaltyAPIKeys(localeID));
    if (!isLoyaltyEnabled || !isLoyaltyOrderFeedEnabled || !isValid) {
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    try {
        Transaction.wrap(function () {
            var newLoyaltyCO = co;
            newLoyaltyCO.custom.Status = params.status;
        });
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while updating yotpoLoyaltyOrder CO for order: ' + params.orderNo +
                ', Exception is: ' + ex, 'error', logLocation);
    }
}

exports.createLoyaltyOrderCO = createLoyaltyOrderCO;
exports.updateLoyaltyOrderCO = updateLoyaltyOrderCO;
