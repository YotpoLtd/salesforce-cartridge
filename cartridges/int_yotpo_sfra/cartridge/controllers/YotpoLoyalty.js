'use strict';

/**
 * @module controllers/YotpoLoyalty
 *
 * This is main controller for Yotpo Loyalty. It contains all endpoints which
 * Yotpo cartridge exposes to search customers, orders and process other data requests.
 */

var server = require('server');

server.get('GetCustomer', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch single customer',
        'debug', 'YotpoLoyalty~GetCustomer');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        customerNo: req.querystring.id,
        email: req.querystring.email,
        singleCustomer: true,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.fetchCustomers(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.get('GetCustomers', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch multiple customers',
        'debug', 'YotpoLoyalty~GetCustomers');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        startIndex: req.querystring.page,
        pageSize: req.querystring.page_size,
        singleCustomer: false,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.fetchCustomers(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.get('GetOrderCountByState', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch order by state',
        'debug', 'YotpoLoyalty~GetOrderCountByState');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        state: req.querystring.state,
        orderCountByState: true,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.getOrdersCount(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.get('GetOrderCountByVolume', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch order by volume',
        'debug', 'YotpoLoyalty~GetOrderCountByVolume');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        orderCountByState: false,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.getOrdersCount(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.get('GetOrder', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch order by id',
        'debug', 'YotpoLoyalty~GetOrder');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        orderId: req.querystring.id,
        singleOrder: true,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.fetchOrders(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.get('GetOrders', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch orders by page size, page counter and state',
        'debug', 'YotpoLoyalty~GetOrders');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        page: req.querystring.page,
        pageSize: req.querystring.page_size,
        state: req.querystring.state,
        singleOrder: false,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.fetchOrders(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.post('CreateGiftCertificate', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to create gift certificate',
        'debug', 'YotpoLoyalty~CreateGiftCertificate');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        amount: req.querystring.amount,
        code: req.querystring.code,
        senderName: req.querystring.sender_name,
        recipientName: req.querystring.recipient_name,
        recipientEmail: req.querystring.recipient_email,
        description: req.querystring.description,
        message: req.querystring.message,
        swellPointsUsed: req.querystring.swell_points_used,
        swellRedemptionId: req.querystring.swell_redemption_id,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.createGiftCertificate(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

server.get('GetCouponCode', server.middleware.https, function (req, res, next) {
    var LoyaltyAPI = require('*/cartridge/scripts/loyalty/api/loyaltyAPI');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch S2F Coupon',
        'debug', 'YotpoLoyalty~GetS2FCoupon');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var viewData = res.getViewData();

    var params = {
        apiKey: req.querystring.api_key,
        couponID: req.querystring.coupon_id,
        locale: yotpoUtils.getCurrentLocaleSFRA(viewData.locale)
    };

    var result = LoyaltyAPI.getNextCouponCode(params);

    res.setStatusCode(result.status);
    res.json(result.responseJSON);

    next();
});

module.exports = server.exports();
