'use strict';

/**
 * Renders yotpo scripts inline using ISML.renderTemplate
 *
 * @param {Object} params - parameters required by yotpoheader isml temmplate
 */
function htmlHead(params) {
    var ISML = require('dw/template/ISML');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var templateParams = params || {};
    templateParams.yotpoAppKey = yotpoUtils.getAppKeyForCurrentLocaleFromRequest(request);

    var templateFile = 'common/yotpoHeader';

    if (yotpoUtils.isCartridgeEnabled()) {
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
