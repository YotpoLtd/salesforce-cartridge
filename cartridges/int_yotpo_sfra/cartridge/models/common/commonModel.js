'use strict';

/**
 * @module scripts/common/commonModel
 *
 * Contains common funcions used elesewhere in the yotpo cartridge
 */

/**
 * This function is used to get customer by its customer number
 *
 * @param {string} customerNo: The customer number to retrieve customer information
 * @param {string} currentLocaleID: The current locale
 *
 * @return {Object} An object with customer details. Some information is blank if the customer is not available.
 *                  result.customerExists : The flag to indicate if customer exists
 *                  result.customerEmail : The customer email address
 *                  result.customerNo : current customer no
 *                  result.customerGroups : The customer Groups associate with customer
 *                  result.token : SHA256(customer email + yotpoAppKey)
 */
function getLoggedInCustomerDetails(customerNo, currentLocaleID) {
    var CustomerMgr = require('dw/customer/CustomerMgr');

    var result = {
        customerExists: false
    };

    var customerObj = CustomerMgr.getCustomerByCustomerNumber(customerNo);

    if (!customerObj) {
        return result;
    }

    var customerGroupArray = new Array();
    var customerGroupIterator = customerObj.getCustomerGroups().iterator();

    while (customerGroupIterator.hasNext()) {
        var customerGroup = customerGroupIterator.next();
        customerGroupArray.push('\"' + customerGroup.ID + '\"'); // eslint-disable-line no-useless-escape
    }

    result.customerExists = true;
    result.customerEmail = customerObj.profile.email;
    result.customerNo = customerNo;
    result.customerGroups = '[' + customerGroupArray.join(',') + ']';

    // Augment customerDetails with ciphered Customer Email Token.
    // Token equates to: SHA256(Email + YotpoLoyaltyAPIKey)
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var MessageDigest = require('dw/crypto/MessageDigest');
    var Bytes = require('dw/util/Bytes');
    var Encoding = require('dw/crypto/Encoding');
    var loyaltyAPIKey = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyAPIKey', currentLocaleID);
    var cipheredCustomerEmailToken = '';
    try {
        var messageDigest = new MessageDigest(MessageDigest.DIGEST_SHA_256);
        var clearTextCustomerEmailToken = result.customerEmail + loyaltyAPIKey;
        cipheredCustomerEmailToken = Encoding.toHex(messageDigest.digestBytes(new Bytes(clearTextCustomerEmailToken, 'UTF-8')));
    } catch (ex) {
        YotpoLogger.logMessage('Exception occurred while generating the cipheredCustomerToken Locale: ' + currentLocaleID + ' exception is:' + ex, 'error', 'CommonModel-getLoggedInCustomerDetails');
    }
    result.token = cipheredCustomerEmailToken;

    return result;
}

/**
 * This method is used to get current basket details for logged in customer.
 *
 * @param {string} currentLocaleID : The current locale id for current request used to get loyalty API key.
 *
 * @return {boolean} result.basketExists : The flag to indicate if basket exists.
 * @return {string} result.basketTokken : The SHA1 Base64 encrypted basket token which will create with the concatenated
 * value of basketID and loyalty API Key.
 * @return {string} result.basketID : The UUID of current basket.
 */
function getCurrentBasketDetails(currentLocaleID) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Bytes = require('dw/util/Bytes');
    var Encoding = require('dw/crypto/Encoding');
    var MessageDigest = require('dw/crypto/MessageDigest');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');

    var logLocation = 'CommonModel~getCurrentBasketDetails';

    var result = {
        basketExists: false
    };

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        return result;
    }

    var yotpoConfiguration = YotpoConfigurationModel.getYotpoConfig(currentLocaleID);
    var encryptedBasketToken;

    if (!yotpoConfiguration) {
        return result;
    }

    try {
        var loyaltyAPIKey = yotpoConfiguration.yotpoLoyaltyAPIKey;

        var loyaltyCartToken = loyaltyAPIKey + currentBasket.UUID;
        var messageDigest = new MessageDigest(MessageDigest.DIGEST_SHA_256);
        encryptedBasketToken = Encoding.toBase64(messageDigest.digestBytes(new Bytes(loyaltyCartToken, 'UTF-8')));
    } catch (ex) {
        YotpoLogger.logMessage('Exception occurred while encrypting cart tokken for Locale: ' + currentLocaleID + ' exception is:' + ex, 'error', logLocation);
        return result;
    }

    result.basketExists = true;
    result.basketTokken = encryptedBasketToken;
    result.basketID = currentBasket.UUID;

    return result;
}

exports.getLoggedInCustomerDetails = getLoggedInCustomerDetails;
exports.getCurrentBasketDetails = getCurrentBasketDetails;
