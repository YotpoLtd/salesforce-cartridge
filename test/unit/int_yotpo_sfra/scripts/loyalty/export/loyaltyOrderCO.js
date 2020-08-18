'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyOrderCO', () => {
    let loggerSpy = {
        logMessage: sinon.spy()
    };
    let sitePrefs;

    var sitePrefDefaults = {
        yotpoCartridgeEnabled: true,
        yotpoLoyaltyAPIKey: 'secretKeyFromSitePref',
        yotpoLoyaltyEnabled: true,
        yotpoLoyaltyEnableOrderFeed: true
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
    });

    const loyaltyOrderCO = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/loyalty/export/loyaltyOrderCO.js', {
        'dw/order/OrderMgr': orderMgr,
        'dw/system/Site': SiteForLogger,
        'dw/object/CustomObjectMgr': {
            createCustomObject: () => {
                return {};
            }
        },
        'dw/system/Transaction': transactionMock,
        '*/cartridge/scripts/utils/constants': constants,
        '~/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
        '*/cartridge/models/loyalty/common/loyaltyOrderModel': {
            saveUserInfoInOrder: (order) => {
                return order;
            },
            prepareOrderJSON: (order) => {
                return order;
            }
        }
    });

    describe('createLoyaltyOrderCO', () => {
        it('Create a loyalty Order custom object', () => {
            loyaltyOrderCO.createLoyaltyOrderCO({});
            assert.isTrue(transactionMock.wrap.called);
        });
        it('Should throw an error due to missing data', () => {
            sitePrefs.yotpoLoyaltyEnableOrderFeed = false;
            assert.throws(
                () => loyaltyOrderCO.createLoyaltyOrderCO({}),
                'YOTPO_CONFIGURATION_LOAD_ERROR'
            );
        });
    });

    describe('updateLoyaltyOrderCO', () => {
        it('Should update a loyalty Order custom object', () => {
            loyaltyOrderCO.updateLoyaltyOrderCO({}, {
                status: 'testing'
            });
            assert.isTrue(transactionMock.wrap.called);
        });

        it('Should throw an error due to missing data', () => {
            sitePrefs.yotpoLoyaltyEnableOrderFeed = false;
            assert.throws(
                () => loyaltyOrderCO.updateLoyaltyOrderCO({}),
                'YOTPO_CONFIGURATION_LOAD_ERROR'
            );
        });
    });
});
