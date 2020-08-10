'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends CheckoutServices-PlaceOrder controller to send order data to Yotpo for Loyalty
 */
server.append('PlaceOrder', function (req, res, next) {
    var viewData = res.getViewData();

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
            // Errors creating CO are already being captured in loyaltyOrderCO
        }
    }

    return next();
});

module.exports = server.exports();
