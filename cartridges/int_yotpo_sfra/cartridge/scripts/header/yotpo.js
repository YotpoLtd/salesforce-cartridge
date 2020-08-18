'use strict';

/**
 * Renders yotpo scripts inline using ISML.renderTemplate
 *
 * @param {Object} params - parameters required by yotpoHeader isml template
 */
function htmlHead(params) {
    var ISML = require('dw/template/ISML');
    var Site = require('dw/system/Site');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var currLocale = request.locale;
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var isLoyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', currLocale);

    var templateParams = params || {};
    templateParams.yotpoAppKey = YotpoConfigurationModel.getAppKeyForCurrentLocaleFromRequest(request);
    templateParams.yotpoStaticContentURL = Site.getCurrent().preferences.custom.yotpoStaticContentURL;
    templateParams.isCartridgeEnabled = isCartridgeEnabled;
    templateParams.isLoyaltyEnabled = isLoyaltyEnabled;
    templateParams.yotpoLoyaltyStaticContentURL = '';
    templateParams.yotpoLoyaltySDKURL = '';

    var templateFile = 'common/yotpoHeader';

    if (isCartridgeEnabled) {
        if (isLoyaltyEnabled) {
            var loyaltyAPIKeys = YotpoConfigurationModel.getLoyaltyAPIKeys(currLocale);
            var yotpoLoyaltyStaticContentURL = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyStaticContentURL', currLocale);
            var yotpoLoyaltySDKURL = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltySDKURL', currLocale);
            yotpoLoyaltyStaticContentURL = !empty(yotpoLoyaltyStaticContentURL) && !empty(loyaltyAPIKeys) && !empty(loyaltyAPIKeys.guid) ? yotpoLoyaltyStaticContentURL.replace('<GUID>', loyaltyAPIKeys.guid) : '';
            yotpoLoyaltySDKURL = !empty(yotpoLoyaltySDKURL) && !empty(loyaltyAPIKeys) && !empty(loyaltyAPIKeys.guid) ? yotpoLoyaltySDKURL.replace('<GUID>', loyaltyAPIKeys.guid) : '';
            templateParams.yotpoLoyaltyStaticContentURL = yotpoLoyaltyStaticContentURL;
            templateParams.yotpoLoyaltySDKURL = yotpoLoyaltySDKURL;
        }
        try {
            ISML.renderTemplate(templateFile, templateParams);
        } catch (ex) {
            yotpoLogger.logMessage('Something went wrong while loading the Yotpo header scripts template, Exception code is: ' + ex, 'error', 'scripts/header/yotpo.js');
        }
    }
}

module.exports = {
    htmlHead: htmlHead
};
