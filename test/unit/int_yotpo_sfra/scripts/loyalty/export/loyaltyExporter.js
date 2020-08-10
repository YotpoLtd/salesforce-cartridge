'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyExporter', () => {
    let loggerSpy = {
        logMessage: sinon.spy()
    };
    let sitePrefs;
    let exportStub = sinon.stub();

    var sitePrefDefaults = {
        yotpoCartridgeEnabled: true,
        yotpoLoyaltyAPIKey: 'secretKeyFromSitePref',
        yotpoLoyaltyEnabled: true,
        yotpoLoyaltyEnableOrderFeed: true,
        yotpoLoyaltyEnableCustomerFeed: true
    };
    let orderMgr = {
        queryOrders: () => {
            return {
                count: 25,
                close: () => {}
            };
        },
        getOrder: () => {
            return {
                id: 'orderID'
            };
        }
    };

    const SiteForLogger = {
        getCurrent: () => {
            return {
                getName: () => {
                    return 'SiteName';
                }
            };
        }
    };
    const yotpoConfigurationModel = {
        isCartridgeEnabled: () => {
            return sitePrefs.yotpoCartridgeEnabled;
        },
        getYotpoPref: (pref) => {
            return sitePrefs[pref] || null;
        },
        getLoyaltyAPIKeys: () => true
    };
    const transactionMock = require('../../mocks/system/transaction');

    beforeEach(function () {
        sitePrefs = Object.assign({}, sitePrefDefaults);
        loggerSpy.logMessage.reset();
        transactionMock.wrap.reset();
        exportStub.reset();
    });
    const loyaltyExporter = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/loyalty/export/loyaltyExporter.js', {
        'dw/order/OrderMgr': orderMgr,
        'dw/system/Site': SiteForLogger,
        'dw/object/CustomObjectMgr': {
            createCustomObject: () => {
                return {};
            }
        },
        'dw/system/Transaction': transactionMock,
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/scripts/model/common/yotpoConfigurationModel': yotpoConfigurationModel,
        '*/cartridge/scripts/model/loyalty/export/exportLoyaltyOrderModel': {
            exportOrder: exportStub
        },
        '*/cartridge/scripts/model/loyalty/export/exportLoyaltyCustomerModel': {
            generateCustomerExportPayload: () => {},
            exportCustomerByLocale: exportStub
        },
        '*/cartridge/scripts/model/loyalty/common/loyaltyOrderModel': {
            saveUserInfoInOrder: (order) => {
                return order;
            },
            prepareOrderJSON: (order) => {
                return order;
            }
        }
    });

    describe('exportLoyaltyOrder', () => {
        it('export a loyalty Order custom object', () => {
            loyaltyExporter.exportLoyaltyOrder({
                orderNo: 'orderNo',
                orderState: 'created'
            });
            assert.isTrue(exportStub.called);
        });

        it('Should not run when disabled', () => {
            sitePrefs.yotpoLoyaltyEnableOrderFeed = false;
            assert.isFalse(loyaltyExporter.exportLoyaltyOrder({
                orderNo: 'orderNo',
                orderState: 'created',
                payload: {}
            }));
        });
        it('Should fail and log when invalid params', () => {
            assert.isFalse(loyaltyExporter.exportLoyaltyOrder({
                orderNo: 'orderNo',
                orderState: 'invalid',
                payload: {}
            }));
        });
    });

    describe('exportLoyaltyCustomer', () => {
        it('export a loyalty Customer custom object', () => {
            loyaltyExporter.exportLoyaltyCustomer({
                customerNo: 'CustomerNo',
                locale: 'default',
                customerState: 'created',
                payload: {}
            });
            assert.isTrue(exportStub.called);
        });
        it('Should not run when disabled', () => {
            sitePrefs.yotpoLoyaltyEnableCustomerFeed = false;
            loyaltyExporter.exportLoyaltyCustomer({
                customerNo: 'CustomerNo',
                locale: 'default',
                customerState: 'created',
                payload: {}
            });
            assert.isFalse(exportStub.called);
        });
        it('Should not run when missing data', () => {
            loyaltyExporter.exportLoyaltyCustomer({
                locale: 'default',
                customerState: 'created',
                payload: {}
            });
            assert.isFalse(exportStub.called);
        });
        it('Should log on failure to create', () => {
            loyaltyExporter.exportLoyaltyCustomer({
                locale: 'default',
                customerState: 'created',
                payload: {}
            });
            assert.isFalse(exportStub.called);
        });
    });
});
