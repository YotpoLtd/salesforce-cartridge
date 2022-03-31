'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('exportLoyaltyCustomerModel', () => {
    let loggerSpy = { logMessage: sinon.spy() };
    let LoyaltyCustomerModelStub = { prepareCustomerJSON: sinon.stub() };
    let serviceSpy = { exportData: sinon.stub() };

    const SiteForLogger = {
        getCurrent: () => {
            return {
                getName: () => {
                    return 'SiteName';
                }
            };
        }
    };

    beforeEach(function () {
        loggerSpy.logMessage.reset();
        LoyaltyCustomerModelStub.prepareCustomerJSON.reset();
        serviceSpy.exportData.reset();
    });

    const exportLoyaltyCustomerModel = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/models/loyalty/export/exportLoyaltyCustomerModel.js', {
        'dw/customer/CustomerMgr': {
            getCustomerByCustomerNumber: () => { return { profile: { status: true } }; }
        },
        'dw/system/Site': SiteForLogger,
        '*/cartridge/scripts/utils/constants': constants,
        'dw/object/CustomObjectMgr': { queryCustomObjects: () => true },
        '*/cartridge/models/loyalty/common/loyaltyCustomerModel': LoyaltyCustomerModelStub,
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        './loyaltyService': serviceSpy,
        '*/cartridge/models/common/yotpoConfigurationModel': {
            getLoyaltyAPIKeys: () => { return { guid: 'guid', key: 'apikey' }; }
        }
    });
    describe('exportCustomersByLocale', () => {
        it('should export a customer.', () => {
            exportLoyaltyCustomerModel.exportCustomersByLocale('fakepayload', 'default');
            sinon.assert.calledWithMatch(serviceSpy.exportData, { customers: "fakepayload" }, { api_key: 'apikey', guid: 'guid' }, 'customers');
        });
    });

});
