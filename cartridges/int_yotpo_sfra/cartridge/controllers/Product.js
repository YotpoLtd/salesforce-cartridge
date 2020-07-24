'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Product-Show controller to show Yotpo rating and reviews on product details page.
 */
server.append('Show', function (req, res, next) {
    var YotpoIntegrationHelper = require('*/cartridge/scripts/common/integrationHelper.js');
    var viewData = YotpoIntegrationHelper.addRatingsOrReviewsToViewData(res.getViewData());
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
