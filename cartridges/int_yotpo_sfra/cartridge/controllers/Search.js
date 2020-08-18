'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Search-Show controller to load Yotpo rating and reviews configuration data for category page.
 */
server.append('Show', function (req, res, next) {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    YotpoConfigurationModel.getYotpoConfig(res.getViewData().locale);
    next();
});

/**
 * Extends Search-UpdateGrid controller to load Yotpo rating and reviews configuration data for category page.
 */
server.append('UpdateGrid', function (req, res, next) {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    YotpoConfigurationModel.getYotpoConfig(res.getViewData().locale);
    next();
});

module.exports = server.exports();
