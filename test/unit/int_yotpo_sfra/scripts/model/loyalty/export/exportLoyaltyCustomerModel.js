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

    const exportLoyaltyCustomerModel = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/model/loyalty/export/exportLoyaltyCustomerModel.js', {
        'dw/customer/CustomerMgr': {
            getCustomerByCustomerNumber: () => { return { profile: { status: true } }; }
        },
        'dw/system/Site': SiteForLogger,
        '*/cartridge/scripts/utils/constants': constants,
        'dw/object/CustomObjectMgr': { queryCustomObjects: () => true },
        '~/cartridge/scripts/model/loyalty/common/loyaltyCustomerModel': LoyaltyCustomerModelStub,
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        './loyaltyService': serviceSpy,
        '*/cartridge/scripts/model/common/yotpoConfigurationModel': {
            getLoyaltyAPIKeys: () => { return { guid: 'guid', key: 'apikey' }; }
        }
    });

    describe('generateCustomerExportPayload', () => {
        it('should get a customer back.', () => {
            LoyaltyCustomerModelStub.prepareCustomerJSON.returns(true);
            let fakeCustomerJson = exportLoyaltyCustomerModel.generateCustomerExportPayload('cust123');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Customer Number: cust123/), 'debug', 'ExportLoyaltyCustomerModel~generateCustomerExportPayload');
            sinon.assert.calledWithMatch(LoyaltyCustomerModelStub.prepareCustomerJSON, { status: true });
            assert.equal(fakeCustomerJson, true);
        });
    });
    describe('exportCustomerByLocale', () => {
        it('should export a customer.', () => {
            exportLoyaltyCustomerModel.exportCustomerByLocale('fakepayload', 'default');
            sinon.assert.calledWithMatch(serviceSpy.exportData, 'fakepayload', { api_key: 'apikey', guid: 'guid' }, 'customers');
        });
    });

    describe('getQueuedCustomerExportObjects', () => {
        it('run a query.', () => {
            assert.equal(exportLoyaltyCustomerModel.getQueuedCustomerExportObjects(), true);
        });
    });
});
