'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends CheckoutServices-PlaceOrder controller to send order data to Yotpo for Loyalty
 */
server.append('PlaceOrder', function (req, res, next) {
    var viewData = res.getViewData();
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'CheckoutServices~PlaceOrder';

    // Add order to loyaltyOrderCO on PlaceOrder but
    // do not attempt to send order data to yotpo loyalty until order is actually confirmed,
    // which happens in Order-Confirm
    if (viewData.orderID) {
        var orderNo = viewData.orderID;
        try {
            var LoyaltyCOCreator = require('*/cartridge/scripts/loyalty/export/loyaltyOrderCO');
            LoyaltyCOCreator.createLoyaltyOrderCO({
                orderNo: orderNo,
                orderState: 'created',
                locale: viewData.locale
            });
        } catch (ex) {
            YotpoLogger.logMessage('Yotpo Loyalty CO was not created for order: ' + orderNo +
                    ', Exception is: ' + ex, 'error', logLocation);
        }
    } else {
        YotpoLogger.logMessage('Yotpo Loyalty CO was not created because the PlaceOrder response had no orderID ' +
                'in viewData. This can happen for payment methods (e.g. redirect / hosted checkout flows) that ' +
                'finalize the order outside this controller.', 'error', logLocation);
    }

    return next();
});

module.exports = server.exports();
