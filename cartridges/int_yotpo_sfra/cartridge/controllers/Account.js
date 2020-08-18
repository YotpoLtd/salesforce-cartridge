'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Account-SubmitRegistration controller to send account data to Yotpo for Loyalty
 */
server.append('Login', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var viewData = res.getViewData();
        var locale = viewData.locale;

        if (viewData.success) {
            var loyaltyExporter = require('*/cartridge/scripts/loyalty/export/loyaltyExporter');
            var exported = loyaltyExporter.exportLoyaltyCustomer({
                customerNo: viewData.authenticatedCustomer.profile.customerNo,
                locale: locale,
                customerState: 'updated'
            });
            if (exported.error) {
                if (exported.message && exported.message !== 'notenabled' && exported.message !== 'customermissing') {
                    res.json({
                        success: true,
                        redirectUrl: viewData.redirectUrl
                    });
                }
            } else {
                // Successfully exported to Yotpo. Update profile
                var CustomerMgr = require('dw/customer/CustomerMgr');
                var registeredCustomer = CustomerMgr.getCustomerByCustomerNumber(viewData.authenticatedCustomer.profile.customerNo);
                var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
                LoyaltyCustomerModel.updateLoyaltyInitializedFlag(registeredCustomer);
            }
        }
    });
    next();
});

/**
 * Extends Account-SubmitRegistration controller to send account data to Yotpo for Loyalty
 */
server.append('SubmitRegistration', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
        var currViewData = res.getViewData();
        var locale = currViewData.locale;

        if (currViewData.success) {
            var CustomerMgr = require('dw/customer/CustomerMgr');

            var email = currViewData.email;
            var registeredCustomer = CustomerMgr.getCustomerByLogin(email);

            if (registeredCustomer) {
                // only export new customer to Yotpo if the customer does not already have an
                // associated loyalty account
                if (!('custom' in registeredCustomer.profile) || ('custom' in registeredCustomer.profile && !('isLoyaltyProgramInitialized' in registeredCustomer.profile.custom)) || ('custom' in registeredCustomer.profile && 'isLoyaltyProgramInitialized' in registeredCustomer.profile.custom && !registeredCustomer.profile.custom.isLoyaltyProgramInitialized)) {
                    var loyaltyExporter = require('*/cartridge/scripts/loyalty/export/loyaltyExporter');
                    var exported = loyaltyExporter.exportLoyaltyCustomer({
                        customerNo: registeredCustomer.profile.customerNo,
                        locale: locale,
                        customerState: 'created'
                    });
                    if (exported.error) {
                        if (exported.message && exported.message !== 'notenabled' && exported.message !== 'customermissing') {
                            req.session.privacyCache.set('errormsg', exported.message);

                            res.json({
                                success: true,
                                redirectUrl: accountHelpers.getLoginRedirectURL(req.querystring.rurl, req.session.privacyCache, true)
                            });
                        }
                    } else {
                        // Successfully exported to Yotpo. Update profile
                        var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
                        LoyaltyCustomerModel.updateLoyaltyInitializedFlag(registeredCustomer);
                    }
                }
            }
        }
    });

    return next();
});

/**
 * Extends Account-SaveProfile controller to send account data to Yotpo for Loyalty
 */
server.append('SaveProfile', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var viewData = res.getViewData();
        var locale = viewData.locale;

        if (viewData.success) {
            var loyaltyExporter = require('*/cartridge/scripts/loyalty/export/loyaltyExporter');
            var exported = loyaltyExporter.exportLoyaltyCustomer({
                customerNo: req.currentCustomer.profile.customerNo,
                locale: locale,
                customerState: 'updated'
            });
            if (exported.error) {
                if (exported.message && exported.message !== 'notenabled' && exported.message !== 'customermissing') {
                    var URLUtils = require('dw/web/URLUtils');
                    res.json({
                        success: true,
                        redirectUrl: URLUtils.url('Account-Show', 'errormsg', exported.message).toString()
                    });
                }
            } else {
                // Successfully exported to Yotpo. Update profile
                var CustomerMgr = require('dw/customer/CustomerMgr');
                var registeredCustomer = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo);
                var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
                LoyaltyCustomerModel.updateLoyaltyInitializedFlag(registeredCustomer);
            }
        }
    });

    return next();
});

server.append('Show', function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var errormsg;
    if (req.querystring.errormsg) {
        errormsg = Resource.msg(req.querystring.errormsg, 'yotpo', null);
        res.setViewData({
            errorMsg: errormsg
        });
    }

    next();
});
module.exports = server.exports();
