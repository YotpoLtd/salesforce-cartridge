'use strict';


var server = require('server');
var page = module.superModule; // inherits functionality from next Product.js found to the right on the cartridge path
server.extend(page); // extends existing server object with a list of new routes from the Product.js found by module.superModule

server.append('Begin', function (req, res, next) { // adds additional middleware
    var viewData = res.getViewData();
    var BasketMgr = require('dw/order/BasketMgr');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var currentLocaleID = YotpoUtils.getCurrentLocaleSFRA(viewData.locale);
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = isCartridgeEnabled && YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', currentLocaleID);
    viewData.isLoyaltyEnabled = false;
    viewData.loyaltyError = false;
    viewData.yotpoLoyaltyCheckoutInstanceID = '';

    var currentBasket = BasketMgr.getCurrentBasket();

    // Points redemption should only be available for registered users
    if (currentBasket && isLoyaltyEnabled) {
        if (req.currentCustomer.profile) {
            try {
                viewData.isLoyaltyEnabled = true;
                viewData.yotpoLoyaltyCheckoutInstanceID = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyCheckoutInstanceID', currentLocaleID);
            } catch (e) {
                viewData.loyaltyError = true;
            }
        }
    }
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
