'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Order-Confirm controller to send data to yotpo conversion tracking,
 */
server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var order = OrderMgr.getOrder(req.querystring.ID);
    var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
    var YotpoIntegrationHelper = require('*/cartridge/scripts/common/integrationHelper.js');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'Order~Confirm';
    var viewData = YotpoIntegrationHelper.addConversionTrackingToViewData(order, res.getViewData());
    var orderNo = '';
    var fromCO = false;
    var currOrderCO;

    // The loyaltyExporter checks that cartridge, loyalty, and loyalty order feed are enabled
    // If so, it will attempt to send the custom object we created during CheckoutServices-PlaceOrder
    try {
        if (viewData.order && viewData.order.orderNumber) {
            orderNo = viewData.order.orderNumber;
            var loyaltyExporter = require('*/cartridge/scripts/loyalty/export/loyaltyExporter');

            // Get the yotpoLoyaltyOrder CO for this order, which should've been created
            // during PlaceOrder.
            var orderIter = CustomObjectMgr.queryCustomObjects('yotpoLoyaltyOrder', 'custom.OrderID = {0}', null, orderNo);
            var payload;
            while (orderIter.hasNext()) {
                currOrderCO = orderIter.next();
                payload = currOrderCO.custom.Payload;
                break;
            }
            if (empty(payload)) {
                // custom object could not be found
                payload = LoyaltyOrderModel.prepareOrderJSON(order);
            } else {
                // Payload gets stringified in loyaltyService. The JSON stored on the CO is
                // already stringified, so we don't want to stringify it twice.
                payload = JSON.parse(payload);
                fromCO = true;
            }

            var success = loyaltyExporter.exportLoyaltyOrder({
                orderNo: orderNo,
                orderState: 'created',
                payload: payload,
                locale: viewData.locale
            });

            if (success && fromCO) {
                // Successfully sent the payload from the stored Order CO to Yotpo. Update the
                // Status on the CO to SUCCESS.
                try {
                    var LoyaltyCO = require('*/cartridge/scripts/loyalty/export/loyaltyOrderCO');
                    LoyaltyCO.updateLoyaltyOrderCO(currOrderCO, { orderNo: orderNo, orderState: 'created', status: 'SUCCESS' });
                } catch (ex) {
                    // Errors updating CO are already being captured in loyaltyOrderCO
                }
            }
        }
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while sending yotpoLoyaltyOrder to yotpo: ' + orderNo +
                ', Exception is: ' + ex, 'error', logLocation);
    }

    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
