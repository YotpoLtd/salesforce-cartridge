'use strict';

/**
*
* This controller is invoked to track logged in customer and basket for Yotpo loyalty
*
* @module controllers/Yotpo
*/

var server = require('server');

/**
 * This controller is invoked to track logged in customer and basket for Yotpo loyalty
 */
server.get('IncludeLoyaltyTracking', function (req, res, next) {
    var CommonModel = require('*/cartridge/models/common/commonModel');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');

    var viewData = res.getViewData();
    var currentLocaleID = YotpoUtils.getCurrentLocaleSFRA(viewData.locale);
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', currentLocaleID);
    var customerDetails = {
        customerExists: false
    };

    var basketDetails = {
        basketExists: false
    };

    if (req.currentCustomer.profile) {
        customerDetails = CommonModel.getLoggedInCustomerDetails(req.currentCustomer.profile.customerNo);
    }
    basketDetails = CommonModel.getCurrentBasketDetails(currentLocaleID);

    res.render('/tracking/yotpoLoyaltyTracking', {
        isLoyaltyEnabled: isLoyaltyEnabled,
        customerDetails: customerDetails,
        basketDetails: basketDetails
    });

    return next();
});

module.exports = server.exports();
