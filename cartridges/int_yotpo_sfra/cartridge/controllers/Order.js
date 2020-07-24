'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Order-Confirm controller to send data to yotpo conversion tracking,
 */
server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(req.querystring.ID);
    var YotpoIntegrationHelper = require('*/cartridge/scripts/common/integrationHelper.js');
    var viewData = YotpoIntegrationHelper.addConversionTrackingToViewData(order, res.getViewData());
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
