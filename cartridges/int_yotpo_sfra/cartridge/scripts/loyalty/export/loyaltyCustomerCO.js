'use strict';

/**
 * @module models/loyalty/export/loyaltyCustomerCO
 *
 * The script is used to prepare export data to Yotpo for Loyalty Customer.
 */

/**
 * This is used to store customer to yotpoLoyaltyCustomer custom object for sending to Yotpo.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.customerNo : The customer number
 * @param {string} params.locale : The current locale
 * @param {string} params.customerState : The customer state e.g created, updated, refunded
 */
function createLoyaltyCustomerCO(params) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Site = require('dw/system/Site');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var localeID = request.locale;
    var logLocation = 'loyaltyCustomerCO~createLoyaltyCustomerCO';

    YotpoLogger.logMessage('\n------ Yotpo Export Customer To Yotpo Loyalty  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Date format for the Yotpo data: ' + Constants.DATE_FORMAT_FOR_YOTPO_DATA +
            '\n Current Locale: ' + localeID +
            '\n Customer Number: ' + params.customerNo +
            '\n Customer State: ' + params.customerState, 'debug', logLocation);

    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', localeID);
    var isLoyaltyCustomerFeedEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableCustomerFeed', localeID);
    var isValid = !empty(YotpoConfigurationModel.getLoyaltyAPIKeys(localeID));
    if (!isLoyaltyEnabled || !isLoyaltyCustomerFeedEnabled || !isValid) {
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    var customerNo = params.customerNo;
    var currCustomer = CustomerMgr.getCustomerByCustomerNumber(customerNo);

    var payloadCustomerJSON = LoyaltyCustomerModel.prepareCustomerJSON(currCustomer.profile);
    var payload = JSON.stringify(payloadCustomerJSON);

    try {
        Transaction.wrap(function () {
            var newLoyaltyCO = CustomObjectMgr.createCustomObject('yotpoLoyaltyCustomer', dw.util.UUIDUtils.createUUID());
            newLoyaltyCO.custom.CustomerID = customerNo;
            newLoyaltyCO.custom.Payload = payload;
            newLoyaltyCO.custom.Status = 'QUEUED';
            newLoyaltyCO.custom.StatusDetails = '';
            newLoyaltyCO.custom.locale = localeID;
        });
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while creating yotpoLoyaltyCustomer CO for customer: ' + customerNo +
                ', Exception is: ' + ex, 'error', logLocation);
    }
}

exports.createLoyaltyCustomerCO = createLoyaltyCustomerCO;
