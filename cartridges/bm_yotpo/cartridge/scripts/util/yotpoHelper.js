'use strict';

var yotpoHelper = {};

yotpoHelper.getSelectedLocaleConfig = function (selectedLocale) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var localeConfigObj = CustomObjectMgr.getCustomObject('yotpoConfiguration', selectedLocale);
    var localeConfig = {
        localeID: selectedLocale,
        isAddEnabled: true,
        appkey: '',
        clientsecret: '',
        utokenauth: '',
        ratingsenabled: false,
        reviewsenabled: false,
        purchasefeedenabled: false
    };

    if (!empty(localeConfigObj)) {
        localeConfig.isAddEnabled = false;
        localeConfig.appkey = localeConfigObj.custom.appKey || '';
        localeConfig.clientsecret = localeConfigObj.custom.clientSecretKey || '';
        localeConfig.utokenauth = localeConfigObj.custom.utokenAuthCode || '';
        localeConfig.ratingsenabled = localeConfigObj.custom.enableRatings;
        localeConfig.reviewsenabled = localeConfigObj.custom.enableReviews;
        localeConfig.purchasefeedenabled = localeConfigObj.custom.enablePurchaseFeed;
    }
    return localeConfig;
};

yotpoHelper.setSelectedLocaleConfig = function (selectedLocale, selectedLocaleConfig) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var localeConfigObj = CustomObjectMgr.getCustomObject('yotpoConfiguration', selectedLocale);

    Transaction.wrap(function () {
        if (empty(localeConfigObj)) {
            // Add new
            localeConfigObj = CustomObjectMgr.createCustomObject('yotpoConfiguration', selectedLocale);
        }

        localeConfigObj.custom.localeID = selectedLocale;
        localeConfigObj.custom.appKey = selectedLocaleConfig.appkey;
        localeConfigObj.custom.clientSecretKey = selectedLocaleConfig.clientsecret;
        localeConfigObj.custom.utokenAuthCode = selectedLocaleConfig.utokenauth;
        localeConfigObj.custom.enableRatings = selectedLocaleConfig.ratingsenabled;
        localeConfigObj.custom.enableReviews = selectedLocaleConfig.reviewsenabled;
        localeConfigObj.custom.enablePurchaseFeed = selectedLocaleConfig.purchasefeedenabled;
    });

    return localeConfigObj;
};

yotpoHelper.removeSelectedLocaleConfig = function (selectedLocale) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var localeConfigObj = CustomObjectMgr.getCustomObject('yotpoConfiguration', selectedLocale);

    if (!empty(localeConfigObj)) {
        // Remove existing
        Transaction.wrap(function () {
            CustomObjectMgr.remove(localeConfigObj);
        });
    }
    return;
};

yotpoHelper.getUTokenAuthCode = function (appKey, clientSecretKey) {
    var authenticationModel = require('~/../int_yotpo_sfra/cartridge/models/authentication/authenticationModel');
    var status;

    try {
        status = authenticationModel.authenticate(appKey, clientSecretKey);
    } catch (e) {
        status = {
            errorResult: true,
            updatedUTokenAuthCode: null
        };
    }

    return status.updatedUTokenAuthCode;
};

module.exports = yotpoHelper;
