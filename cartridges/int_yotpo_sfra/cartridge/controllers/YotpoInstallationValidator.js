'use strict';

var server = require('server');

/**
 * Intended for the sole use of acceptance testing the yotpo modifications
 * to the order confirmation page template. Not available in production environments.
 */
server.get('ConfirmationTemplate', function (req, res, next) {
    var System = require('dw/system/System');
    var OrderMgr = require('dw/order/OrderMgr');
    var Locale = require('dw/util/Locale');
    var Resource = require('dw/web/Resource');
    var OrderModel = require('*/cartridge/models/order');

    if (System.getInstanceType() !== System.PRODUCTION_SYSTEM) {
        var order = OrderMgr.getOrder(req.querystring.ID);

        if (!order) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }

        var currentLocale = Locale.getLocale(req.locale.id);
        var orderModel = new OrderModel(order, {
            config: {
                numberOfLineItems: '*'
            },
            countryCode: currentLocale.country,
            containerView: 'order'
        });

        res.render('checkout/confirmation/confirmation', {
            order: orderModel,
            returningCustomer: true
        });
    } else {
        res.render('/error', {
            message: Resource.msg('error.confirmation.error', 'confirmation', null)
        });
    }

    return next();
});

/**
 * Extends Order-ConfirmationTemplate controller to send data to yotpo conversion tracking.
 * Note that the conversion tracking information is only included on order confirmation page
 * if the yotpo cartridge is enabled and either ratings or reviews is also enabled
 */
server.append('ConfirmationTemplate', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var YotpoIntegrationHelper = require('*/cartridge/scripts/common/integrationHelper.js');

    var order = OrderMgr.getOrder(req.querystring.ID);
    var viewData = YotpoIntegrationHelper.addConversionTrackingToViewData(order, res.getViewData());
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
