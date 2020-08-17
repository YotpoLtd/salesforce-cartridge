'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyCustomerCO', () => {
    let loggerSpy = {
        logMessage: sinon.spy()
    };
    let sitePrefs;

    var sitePrefDefaults = {
        yotpoCartridgeEnabled: true,
        yotpoLoyaltyAPIKey: 'secretKeyFromSitePref',
        yotpoLoyaltyEnabled: true,
        yotpoLoyaltyEnableCustomerFeed: true
    };
    let customerMgr = {
        getCustomerByCustomerNumber: () => {
            return {
                profile: {}
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

    const loyaltyCustomerCO = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/loyalty/export/loyaltyCustomerCO.js', {
        'dw/customer/CustomerMgr': customerMgr,
        'dw/system/Site': SiteForLogger,
        'dw/object/CustomObjectMgr': {
            createCustomObject: () => {
                return {};
            }
        },
        'dw/system/Transaction': transactionMock,
        '*/cartridge/scripts/utils/constants': constants,
        '~/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/scripts/model/common/yotpoConfigurationModel': yotpoConfigurationModel,
        '*/cartridge/scripts/model/loyalty/common/loyaltyCustomerModel': {
            prepareCustomerJSON: (customer) => {
                return customer;
            }
        }
    });

    describe('createLoyaltyCustomerCO', () => {
        it('Create a loyalty Customer custom object', () => {
            loyaltyCustomerCO.createLoyaltyCustomerCO({});
            assert.isTrue(transactionMock.wrap.called);
        });
        it('Should throw an error due to missing data', () => {
            sitePrefs.yotpoLoyaltyEnableCustomerFeed = false;
            assert.throws(
                () => loyaltyCustomerCO.createLoyaltyCustomerCO({}),
                'YOTPO_CONFIGURATION_LOAD_ERROR'
            );
        });

        it('Should log when create fails ', () => {
            let oldSpy = transactionMock.wrap;
            transactionMock.wrap = sinon.stub();
            transactionMock.wrap.throws(Error);
            loyaltyCustomerCO.createLoyaltyCustomerCO({});
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Something went wrong while creating yotpoLoyaltyCustomer CO for customer:/), 'error', 'loyaltyCustomerCO~createLoyaltyCustomerCO');
            transactionMock.wrap = oldSpy;
        });
    });
});

