'use strict';

/**
 * @module scripts/loyalty/api/loyaltyAPI
 *
 * This is main script for Yotpo Loyalty. It contains all functions to create gift certificates,
 * search, customers, orders and process other data requests.
 */

/**
 * This function is used to get the customers. The function will process single customer
 * if singleCustomer flag is set otherwise will process multiple customers. The function
 * also validates the request parameters. It also validates api key for Yotpo Loyalty.
 *
 * @param {Object} params : The mandatory parameters for current request.
 * @param {string} params.apiKey - The loyalty API Key for request validation
 * @param {string} params.customerNo - The customer number
 * @param {string} params.email - The customer email
 * @param {string} params.startIndex - The start index
 * @param {string} params.pageSize - The total number of results
 * @param {boolean} params.singleCustomer - The flag to indicate if single customer
 * should be found or multiple
 *
 * @return {Object} result : The response in JSON format
 */
function fetchCustomers(params) {
    var Constants = require('*/cartridge/scripts/utils/constants');
    var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'loyaltyAPI~fetchCustomers';
    var result = {
        status: Constants.STATUS_400,
        responseJSON: {
            errorDescription: 'The request parameters are missing'
        }
    };

    if (!params.apiKey) {
        result.responseJSON = { errorDescription: 'The api key is missing' };
        return result;
    } else if ((params.singleCustomer && !(params.customerNo || params.email)) ||
            (!params.singleCustomer && !params.startIndex && !params.pageSize)) {
        return result;
    }

    var isValid = YotpoConfigurationModel.validateLoyaltyApiKey(params.apiKey, params.locale);
    if (!isValid) {
        YotpoLogger.logMessage('The Loyalty API Key could not be validated therefore cannot proceed further', 'error', logLocation);

        result.status = Constants.STATUS_401;
        result.responseJSON = {
            errorDescription: 'Invalid Loyalty API key provided'
        };
        return result;
    }

    try {
        // Default status
        result.status = Constants.STATUS_200;

        if (params.singleCustomer) {
            var profile = LoyaltyCustomerModel.searchCustomer(params);
            if (profile) {
                result.responseJSON = LoyaltyCustomerModel.prepareCustomerJSON(profile);
            } else {
                result.status = Constants.STATUS_404;
                result.responseJSON = {
                    errorDescription: 'The customer profile could not be found'
                };
            }
        } else {
            var profileIterator = LoyaltyCustomerModel.searchCustomers(params);
            result.responseJSON = LoyaltyCustomerModel.prepareCustomersJSON(profileIterator);
        }
    } catch (ex) {
        YotpoLogger.logMessage('Some error occurred while trying to process search customer(s) reqeust. \nException is' + ex
            , 'error', logLocation);
        result.status = Constants.STATUS_500;
        result.responseJSON = {
            errorDescription: 'Internal server error occurred, please check server logs for details.'
        };
    }

    return result;
}

/**
 * This function is used to get orders count on the basis of orderCountByState flag. If
 * flag is true then the orders will return on the base of state if flag is false then
 * past 30 days order will be returned
 *
 * @param {Object} params : The mandatory parameters for current request
 * @param {string} params.apiKey - The loyalty API Key for request validation.
 * @param {string} params.state - The state which order will be fetched
 * @param {string} params.orderCountByState - The flag indicate if order by sate is found or
 * past 30 days
 *
 * @return {Object} result : The result of order count
 * @return {string} result.status : The status code of request
 * @return {Object} result.responseJSON : The object of result which contain JSON data
 */
function getOrdersCount(params) {
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'loyaltyAPI~getOrdersCount';
    var result = {
        status: Constants.STATUS_400,
        responseJSON: {
            errorDescription: 'The request parameters are missing'
        }
    };

    if (!params.apiKey) {
        result.responseJSON = { errorDescription: 'The api key is missing' };
        return result;
    } else if (params.orderCountByState && !params.state) {
        return result;
    }

    var isValid = YotpoConfigurationModel.validateLoyaltyApiKey(params.apiKey, params.locale);
    if (!isValid) {
        YotpoLogger.logMessage('The Loyalty API Key could not be validated therefore cannot proceed further', 'error', logLocation);

        result.status = Constants.STATUS_401;
        result.responseJSON = {
            errorDescription: 'Invalid Loyalty API key provided'
        };
        return result;
    }

    try {
        // Default status
        result.status = Constants.STATUS_200;
        if (params.orderCountByState) {
            var orderState = LoyaltyOrderModel.getOrderState(params.state);
            if (orderState !== null) {
                result.responseJSON = LoyaltyOrderModel.getOrderCountByState(orderState);
            } else {
                result.status = Constants.STATUS_400;
                result.responseJSON = {
                    errorDescription: 'The order state is invalid'
                };
            }
        } else {
            result.responseJSON = LoyaltyOrderModel.getOrderCountByVolume(Constants.ORDER_VOLUME_DAYS);
        }
    } catch (ex) {
        YotpoLogger.logMessage('Some error occurred while trying to count order for reqeust. \nException is ' + ex
            , 'error', logLocation);
        result.status = Constants.STATUS_500;
        result.responseJSON = {
            errorDescription: 'Internal server error occurred, please check server logs for details.'
        };
    }

    return result;
}

/**
 * This function is used to fetch the orders, if singleOrder flag is true then it will
 * process single order if flag set to false then it will process multiple orders,
 * This will also validate the requests params and api key which is pass to it
 *
 * @param {Object} params : The params which pass form the end point
 * @param {string} params.apiKey : The api key which needs to validate
 * @param {string} params.orderId : The single order id which is used to fetch single order
 * @param {string} params.page : The starting index of the orders
 * @param {string} params.pageSize : The ending index of the orders
 * @param {string} params.state : The order  state of the order for example created, open and failed
 * @param {boolean} params.signleOrder : The boolean flag which indicate the process of single order
 * or multiple orders
 *
 * @return {Object} result : The result object which have error details or result details
 */
function fetchOrders(params) {
    var OrderMgr = require('dw/order/OrderMgr');

    var Constants = require('*/cartridge/scripts/utils/constants');
    var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'loyaltyAPI~fetchOrders';
    var result = {
        status: Constants.STATUS_400,
        responseJSON: {
            errorDescription: 'The request parameters are missing'
        }
    };

    if (!params.apiKey) {
        result.responseJSON = { errorDescription: 'The api key is missing' };
        return result;
    } else if ((params.singleOrder && !params.orderId) ||
            (!params.singleOrder && !params.page && !params.pageSize && !params.state)) {
        return result;
    }

    var isValid = YotpoConfigurationModel.validateLoyaltyApiKey(params.apiKey, params.locale);
    if (!isValid) {
        YotpoLogger.logMessage('The Loyalty API Key could not be validated therefore cannot proceed further', 'error', logLocation);

        result.status = Constants.STATUS_401;
        result.responseJSON = {
            errorDescription: 'Invalid Loyalty API key provided'
        };
        return result;
    }

    try {
        // Default status
        result.status = Constants.STATUS_200;
        if (params.singleOrder) {
            var order = OrderMgr.getOrder(params.orderId);
            if (order !== null) {
                result.responseJSON = LoyaltyOrderModel.prepareOrderJSON(order);
            } else {
                result.status = Constants.STATUS_404;
                result.responseJSON = {
                    errorDescription: 'The order could not be found'
                };
            }
        } else {
            var orderState = LoyaltyOrderModel.getOrderState(params.state);
            if (orderState !== null) {
                var orderIterator = LoyaltyOrderModel.searchOrders(orderState, params.page, params.pageSize);
                result.responseJSON = LoyaltyOrderModel.prepareOrdersJSON(orderIterator);
            } else {
                result.status = Constants.STATUS_400;
                result.responseJSON = {
                    errorDescription: 'The order state is invalid'
                };
            }
        }
    } catch (ex) {
        YotpoLogger.logMessage('Some error occurred while trying to fetch order for reqeust. \nException is' + ex
            , 'error', logLocation);
        result.status = Constants.STATUS_500;
        result.responseJSON = {
            errorDescription: 'Internal server error occurred, please check server logs for details.'
        };
    }

    return result;
}
/**
 * This function is used to create gift certificate on the basis of parameters recieved from API endpoint.
 * The amount and api_key are mandatory parameters, remaining all are optional.
 * It will authenticate incoming API request using apiKey.
 *
 * @param {Object} params : The paramaters passed form the end point.
 * @param {string} params.apiKey : The api key used to validate the incoming request.
 * @param {string} params.amount : The amount used to create gift certificate.
 * @param {string} params.code : The unique code of gift certificate that should be used for Gift Certificate.
 * If not provided or null system will automatically assign  a unique code to it.
 * @param {string} params.senderName : The sender Name of this gift certificate.
 * @param {string} params.recipientName : The name of person who will receive this gift certificate.
 * @param {string} params.recipientEmail : The email of person who will receive this gift certificate.
 * @param {string} params.description : The description about this gift certificate.
 * @param {string} params.message : The message from sender about this gift certificate.
 * @param {string} params.swellPointsUsed : Custom attribute representing swell points used
 * @param {string} params.swellRedemptionId : Custom attribute representing swell redemption id
 * @return {Object} result : The result object which have error details or result details.
 * @return {string} result.giftCertificateCode : The unique code of newly created gift certificate.
 * @return {string} result.merchantID : The unique merchant ID of newly created gift certificate.
 */
function createGiftCertificate(params) {
    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
    var Transaction = require('dw/system/Transaction');

    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'loyaltyAPI~createGiftCertificate';
    var result = {
        status: Constants.STATUS_400,
        responseJSON: {
            errorDescription: 'The request parameters are missing'
        }
    };

    if (!params.apiKey) {
        result.status = Constants.STATUS_401;
        result.responseJSON = {
            errorDescription: 'The api key is missing'
        };
        return result;
    } else if (!params.amount) {
        return result;
    }

    var isValid = YotpoConfigurationModel.validateLoyaltyApiKey(params.apiKey, params.locale);
    if (!isValid) {
        YotpoLogger.logMessage('The Loyalty API Key could not be validated therefore cannot proceed further', 'error', logLocation);

        result.status = Constants.STATUS_401;
        result.responseJSON = {
            errorDescription: 'Invalid Loyalty API key provided'
        };
        return result;
    }

    try {
        // Default status
        result.status = Constants.STATUS_200;
        var giftCertificate;

        Transaction.wrap(function () {
            giftCertificate = GiftCertificateMgr.createGiftCertificate(params.amount, params.code);

            if (params.senderName) {
                giftCertificate.setSenderName(params.senderName);
            }

            if (params.recipientName) {
                giftCertificate.setRecipientName(params.recipientName);
            }

            if (params.recipientEmail) {
                giftCertificate.setRecipientEmail(params.recipientEmail);
            }

            if (params.description) {
                giftCertificate.setDescription(params.description);
            }

            if (params.message) {
                giftCertificate.setMessage(params.message);
            }

            if (params.swellPointsUsed) {
                giftCertificate.custom.swellPointsUsed = parseInt(params.swellPointsUsed, 10);
            }

            if (params.swellRedemptionId) {
                giftCertificate.custom.swellRedemptionId = params.swellRedemptionId;
            }
        });

        result.responseJSON = {
            gift_certificate_code: giftCertificate.getGiftCertificateCode(),
            merchant_id: giftCertificate.getMerchantID()
        };
    } catch (ex) {
        YotpoLogger.logMessage('Some error occurred while trying to create gift certificate for reqeust. \nException is' + ex
            , 'error', logLocation);
        result.status = Constants.STATUS_500;
        result.responseJSON = {
            errorDescription: 'Internal server error occurred, please check server logs for details.'
        };
    }

    return result;
}
/**
 * This function is used to get the next coupon code for the given CouponID.
 * The intended use for this function is primarily for yotpo Loyalty to fetch
 * the next available S2F Coupon Code
 * @param {Object} params : The mandatory parameters for current request
 * @param {string} params.apiKey - The loyalty API Key for request validation.
 *
 * @return {Object} result : The result of order count
 * @return {string} result.status : The status code of request
 * @return {Object} result.responseJSON : The object of result which contain JSON data
 */
function getNextCouponCode(params) {
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var couponID = params.couponID ? params.couponID : ''; // i.e. yotpoLoyaltyS2FCoupon
    var nextCouponCode = '';

    var logLocation = 'loyaltyAPI~getNextCouponCode';
    var result = {
        status: Constants.STATUS_400,
        responseJSON: {
            errorDescription: 'The request parameters are missing'
        }
    };

    if (!params.apiKey) {
        result.responseJSON = { errorDescription: 'The api key is missing' };
        return result;
    }

    var isValid = YotpoConfigurationModel.validateLoyaltyApiKey(params.apiKey, params.locale);
    if (!isValid) {
        YotpoLogger.logMessage('The Loyalty API Key could not be validated therefore cannot proceed further', 'error', logLocation);

        result.status = Constants.STATUS_401;
        result.responseJSON = {
            errorDescription: 'Invalid Loyalty API key provided'
        };
        return result;
    }

    try {
        var Transaction = require('dw/system/Transaction');
        var CouponMgr = require('dw/campaign/CouponMgr');
        var currCoupon = CouponMgr.getCoupon(couponID);

        Transaction.wrap(function () {
            nextCouponCode = !empty(currCoupon) ? currCoupon.getNextCouponCode() : '';
        });

        if (!empty(nextCouponCode)) {
            // Default status
            result.status = Constants.STATUS_200;
        } else {
            result.status = Constants.STATUS_400;
            result.responseJSON = {
                errorDescription: 'Unable to acquire valid coupon code for couponID ' + couponID
            };
        }
        result.responseJSON = {
            couponCode: nextCouponCode
        };
    } catch (ex) {
        YotpoLogger.logMessage('Some error occurred while trying to retrieve next coupon code for couponID ' + couponID + '. \nException is ' + ex
            , 'error', logLocation);
        result.status = Constants.STATUS_500;
        result.responseJSON = {
            errorDescription: 'Internal server error occurred, please check server logs for details.'
        };
    }

    return result;
}

exports.fetchCustomers = fetchCustomers;
exports.getOrdersCount = getOrdersCount;
exports.fetchOrders = fetchOrders;
exports.createGiftCertificate = createGiftCertificate;
exports.getNextCouponCode = getNextCouponCode;
