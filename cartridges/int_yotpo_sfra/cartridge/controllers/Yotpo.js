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

        // Augment customerDetails with ciphered Customer Email Token.
        // Token equates to: SHA256(Email + YotpoLoyaltyAPIKey)
        var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
        var MessageDigest = require('dw/crypto/MessageDigest');
        var Bytes = require('dw/util/Bytes');
        var Encoding = require('dw/crypto/Encoding');
        var yotpoConfiguration = YotpoConfigurationModel.getYotpoConfig(currentLocaleID);
        var cipheredCustomerEmailToken = '';
        try {
            var loyaltyAPIKey = yotpoConfiguration.yotpoLoyaltyAPIKey;
            var messageDigest = new MessageDigest(MessageDigest.DIGEST_SHA_256);
            var clearTextCustomerEmailToken = customerDetails.customerEmail + loyaltyAPIKey;
            cipheredCustomerEmailToken = Encoding.toBase64(messageDigest.digestBytes(new Bytes(clearTextCustomerEmailToken, 'UTF-8')));
        } catch (ex) {
            YotpoLogger.logMessage('Exception occurred while generating the cipheredCustomerToken Locale: ' + currentLocaleID + ' exception is:' + ex, 'error', 'Yotpo-IncludeLoyaltyTracking');
        }
        customerDetails.token = cipheredCustomerEmailToken;
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
