'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('exportLoyaltyOrderModel', () => {
    let sitePrefs;
    let fakeOrderEvent; // eslint-disable-line
    let orderObj; // eslint-disable-line
    // Sinon Spies
    let loggerSpy = { logMessage: sinon.spy() };
    let exportSpy = sinon.spy();

    var sitePrefDefaults = {
        yotpoCartridgeEnabled: true,
        yotpoLoyaltyAPIKey: 'secretKeyFromSitePref',
        yotpoLoyaltyEnabled: true,
        yotpoLoyaltyEnableOrderFeed: true
    };

    var orderEventDefaults = {
        custom: {
            ID: 'randomID',
            OrderID: '123',
            Payload: '',
            PayloadDeliveryDate: '1/1/2020',
            Status: 'Queued',
            StatusDetails: '',
            lastModified: '1/1/2020',
            creationDate: '1/1/1900'
        }
    };

    let orderObjDefaults = {
        'OrderData': {
            'fake': 'object'
        },
        'OrderEventObject': {
            'custom': {
                'ID': 'randomID',
                'OrderID': '123',
                'Payload': '{"fake":"object"}',
                'PayloadDeliveryDate': '1/1/2020',
                'Status': 'Queued',
                'StatusDetails': '',
                'creationDate': '1/1/1900',
                'lastModified': '1/1/2020'
            }
        },
        'OrderId': '123',
        'OrderLocale': 'default'
    };

    beforeEach(function () {
        sitePrefs = Object.assign({}, sitePrefDefaults);
        fakeOrderEvent = Object.assign({}, orderEventDefaults);
        orderObj = Object.assign({}, orderObjDefaults);
        loggerSpy.logMessage.reset();
        exportSpy.reset();
    });

    const yotpoConfigurationModel = {
        isCartridgeEnabled: () => { return sitePrefs.yotpoCartridgeEnabled; },
        getLoyaltyAPIKeys: () => { return { key: '123', guid: 'abc' }; },
        getYotpoPref: (pref) => { return sitePrefs[pref] || null; }
    };
    const loyaltyService = {
        exportData: exportSpy
    };

    const exportLoyaltyOrderModel = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/models/loyalty/export/exportLoyaltyOrderModel.js', {
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
        '*/cartridge/scripts/utils/constants': constants,
        'dw/object/CustomObjectMgr': { queryCustomObjects: () => true },
        '*/cartridge/models/loyalty/export/loyaltyService': loyaltyService
    });

    describe('exportOrder', () => {
        it('throw an error and log it does not find valid keys.', () => {
            let getLoyaltyAPIKeys = sinon.stub(yotpoConfigurationModel, 'getLoyaltyAPIKeys');
            getLoyaltyAPIKeys.returns(null);
            assert.throws(() => exportLoyaltyOrderModel.exportOrder({}, {}), /YOTPO_CONFIGURATION_LOAD_ERROR/);
            getLoyaltyAPIKeys.restore();
        });
        it('should export the order.', () => {
            exportLoyaltyOrderModel.exportOrder('payload', {});
            sinon.assert.calledWith(exportSpy, 'payload', { api_key: '123', guid: 'abc' }, 'orders');
        });
    });
    describe('generateOrderExportPayload', () => {
        it('throw an error and log it does not find valid keys.', () => {
            let getLoyaltyAPIKeys = sinon.stub(yotpoConfigurationModel, 'getLoyaltyAPIKeys');
            getLoyaltyAPIKeys.returns(null);
            assert.throws(() => exportLoyaltyOrderModel.exportOrderByLocale({}, 'default'), /Failed to export loyalty Order event. Unable to load Yotpo Loyalty API Key for locale: default/);
            getLoyaltyAPIKeys.restore();
        });
        it('should export the order.', () => {
            exportLoyaltyOrderModel.exportOrderByLocale('payload', 'default');
            sinon.assert.calledWith(exportSpy, 'payload', { api_key: '123', guid: 'abc' }, 'orders');
        });
    });
    describe('getQueuedOrderExportObjects', () => {
        it('run a query.', () => {
            assert.equal(exportLoyaltyOrderModel.getQueuedOrderExportObjects(), true);
        });
    });
});
