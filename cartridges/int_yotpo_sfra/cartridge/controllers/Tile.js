'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Tile-Show controller to show Yotpo ratings on product tile on category/search page.
 */
server.append('Show', function (req, res, next) {
    var YotpoIntegrationHelper = require('*/cartridge/scripts/common/integrationHelper.js');
    var viewData = YotpoIntegrationHelper.addRatingsOrReviewsToViewData(res.getViewData());
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
