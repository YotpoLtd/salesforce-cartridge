'use strict';

var server = require('server');

server.get('Start', function (req, res, next) {
    var Site = require('dw/system/Site');
    var yotpoConfig = server.forms.getForm('yotpoConfig');

    var localeList = [];
    var allowedLocales = Site.getCurrent().allowedLocales;
    var numLocales = allowedLocales.length;
    var selectedLocale = allowedLocales[0];

    if ('querystring' in req && 'selectedlocale' in req.querystring && !empty(req.querystring.selectedlocale)) {
        selectedLocale = req.querystring.selectedlocale;
    }

    for (var i = 0; i < numLocales; i++) {
        var locale = allowedLocales[i];
        var localeObj = {};

        localeObj.selected = (locale === selectedLocale);
        localeObj.localeID = locale;
        localeList.push(localeObj);
    }

    var yotpoHelper = require('*/cartridge/scripts/util/yotpoHelper.js');
    var selectedLocaleConfig = yotpoHelper.getSelectedLocaleConfig(selectedLocale);
    if (!empty(selectedLocaleConfig)) {
        yotpoConfig.locale.value = selectedLocaleConfig.localeID || '';
        yotpoConfig.appkey.value = selectedLocaleConfig.appkey || '';
        yotpoConfig.clientsecret.value = selectedLocaleConfig.clientsecret || '';
        yotpoConfig.utokenauth.value = selectedLocaleConfig.utokenauth || '';
        yotpoConfig.ratingsenabled.value = selectedLocaleConfig.ratingsenabled;
        yotpoConfig.reviewsenabled.value = selectedLocaleConfig.reviewsenabled;
        yotpoConfig.purchasefeedenabled.value = selectedLocaleConfig.purchasefeedenabled;
    }
    res.render('/application/UI/configure', {
        allowedLocales: localeList,
        isAddEnabled: selectedLocaleConfig.isAddEnabled,
        yotpoConfig: yotpoConfig
    });

    return next();
});

server.get('JsonStart', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var selectedLocale = 'default';

    if ('querystring' in req && 'selectedlocale' in req.querystring && !empty(req.querystring.selectedlocale)) {
        selectedLocale = req.querystring.selectedlocale;
    }

    var redirectUrl = URLUtils.url('YotpoAdmin-Start', 'selectedlocale', selectedLocale).toString();
    var yotpoHelper = require('*/cartridge/scripts/util/yotpoHelper.js');
    var selectedLocaleConfig = yotpoHelper.getSelectedLocaleConfig(selectedLocale);

    var responseObj = {
        error: false,
        errorMsg: '',
        redirectUrl: redirectUrl
    };

    if (responseObj.error) {
        res.json(responseObj);
        return next();
    }

    res.json({
        success: true,
        selectedLocaleConfig: selectedLocaleConfig
    });

    return next();
});

server.post('Save', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var Resource = require('dw/web/Resource');
    var yotpoHelper = require('*/cartridge/scripts/util/yotpoHelper.js');

    var selectedLocale = req.form.locale;
    var appkey = req.form.appkey;
    var clientsecret = req.form.clientsecret;
    var ratingsenabled = !!(req.form.ratingsenabled);
    var reviewsenabled = !!(req.form.reviewsenabled);
    var purchasefeedenabled = !!(req.form.purchasefeedenabled);
    var utokenauth = null;

    var redirectUrl = URLUtils.url('YotpoAdmin-Start', 'selectedlocale', selectedLocale).toString();
    var errors = [];
    var responseObj = {
        error: false,
        errors: errors,
        redirectUrl: redirectUrl
    };

    if (empty(appkey)) {
        errors.push({
            errorElement: 'appkey',
            errorMsg: Resource.msg('appkey.missing', 'forms', null)
        });
    }

    if (empty(clientsecret)) {
        errors.push({
            errorElement: 'clientsecret',
            errorMsg: Resource.msg('clientsecret.missing', 'forms', null)
        });
    }

    if (!empty(appkey) && !empty(clientsecret)) {
        utokenauth = yotpoHelper.getUTokenAuthCode(appkey, clientsecret);
        if (empty(utokenauth)) {
            errors.push({
                errorElement: 'appkey',
                errorMsg: Resource.msg('utokenauth.invalid', 'forms', null)
            });
            errors.push({
                errorElement: 'clientsecret',
                errorMsg: Resource.msg('utokenauth.invalid', 'forms', null)
            });
        }
    }

    if (!empty(errors)) {
        responseObj.error = true;
        responseObj.errors = errors;
        res.json(responseObj);
        return next();
    }

    var selectedLocaleConfig = {
        appkey: appkey,
        clientsecret: clientsecret,
        ratingsenabled: ratingsenabled,
        reviewsenabled: reviewsenabled,
        purchasefeedenabled: purchasefeedenabled,
        utokenauth: utokenauth
    };

    try {
        yotpoHelper.setSelectedLocaleConfig(selectedLocale, selectedLocaleConfig);
    } catch (e) {
        var err = e;
        responseObj.error = err;
    }

    if (responseObj.error) {
        res.json(responseObj);
        return next();
    }

    res.json({
        success: true,
        redirectUrl: redirectUrl
    });

    return next();
});

server.post('Delete', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var selectedlocale = req.form.locale;
    var redirectUrl = URLUtils.url('YotpoAdmin-Start', 'selectedlocale', selectedlocale).toString();

    var yotpoHelper = require('*/cartridge/scripts/util/yotpoHelper.js');
    yotpoHelper.removeSelectedLocaleConfig(selectedlocale);

    var responseObj = {
        error: false,
        errorMsg: '',
        redirectUrl: redirectUrl
    };

    if (responseObj.error) {
        res.json(responseObj);
        return next();
    }

    res.json({
        success: true,
        redirectUrl: redirectUrl
    });

    return next();
});

module.exports = server.exports();
