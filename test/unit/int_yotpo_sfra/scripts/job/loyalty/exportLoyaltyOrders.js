'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('exportLoyaltyOrders job', () => {
    let sitePrefs;
    let fakeOrderEvent;
    let orderObj;
    // Sinon Spies
    let loggerSpy = { logMessage: sinon.spy() };
    let exportLoyaltyOrders;

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
        'orderNo': 'randomId',
        'customerLocaleID': 'en_us'
    };

    let orderJson = {
        orderId: 'randomId'
    }

    const yotpoConfigurationModel = {
        isCartridgeEnabled: () => { return sitePrefs.yotpoCartridgeEnabled; },
        getYotpoPref: (pref) => { return sitePrefs[pref] || null; }
    };

    let hasNextReturn = true;
    const exportLoyaltyOrderModel = {
        getOrderExportObjectIterator: () => {
            return {
                count: 1,
                hasNext: () => { return hasNextReturn; },
                next: () => { return true; },
                getCount: () => 5
            };
        },
        generateOrderExportPayload: () => {},
        exportOrdersByLocale: () => {}
    };

    var jobContext = { getContext: () => { return {}; } };
    var stepExecution = { getJobExecution: () => { return jobContext; } };
    let jobsConfigObject = { custom: {} };

    beforeEach(function () {
        // The exporter has a bunch of private variables that need to reset between tests.
        exportLoyaltyOrders = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/job/loyalty/exportLoyaltyOrders.js', {
            '*/cartridge/models/loyalty/export/exportLoyaltyOrderModel': exportLoyaltyOrderModel,
            '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
            '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
            '*/cartridge/scripts/utils/constants': constants,
            '*/cartridge/models/loyalty/common/loyaltyOrderModel': {
                prepareOrderJSON: () => orderJson
            },
            'dw/object/CustomObjectMgr': {
                getCustomObject: () => jobsConfigObject
            },
        });
        sitePrefs = Object.assign({}, sitePrefDefaults);
        fakeOrderEvent = Object.assign({}, orderEventDefaults);
        orderObj = Object.assign({}, orderObjDefaults);
        loggerSpy.logMessage.reset();
    });

    describe('beforeStep', () => {
        it('throw an error and log if run with loyalty disabled.', () => {
            sitePrefs.yotpoLoyaltyEnabled = false;
            // Ugh, throws requires you pass it a function ref and not a called function so we have to wrap it.
            assert.throws(() => exportLoyaltyOrders.beforeStep({}, stepExecution), /Failed to start loyalty Order Export, Yotpo Loyalty system is disabled/);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Loyalty system is disabled/), 'warn', 'exportLoyaltyOrders~beforeStep');
        });
        it('throw an error and log if run with the order feedk disabled.', () => {
            sitePrefs.yotpoLoyaltyEnableOrderFeed = false;
            assert.throws(() => exportLoyaltyOrders.beforeStep({}, stepExecution), '');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Yotpo Loyalty Order Export is disabled/), 'warn', 'exportLoyaltyOrders~beforeStep');
        });
    });

    describe('read', () => {
        it('should return true when has next is true.', () => {
            exportLoyaltyOrders.beforeStep({}, stepExecution);
            assert.isTrue(exportLoyaltyOrders.read());
        });
        it('should return null when has next is not true.', () => {
            let getOrderExportObjectIterator = sinon.stub(exportLoyaltyOrderModel, 'getOrderExportObjectIterator');
            getOrderExportObjectIterator.returns({ hasNext: () => { return false; } });
            exportLoyaltyOrders.beforeStep({}, stepExecution);
            assert.isNull(exportLoyaltyOrders.read());
            getOrderExportObjectIterator.restore();
        });
    });

    describe('process', () => {
        it('should return order data.', () => {
            let res = exportLoyaltyOrders.process(orderObj);
            assert.equal(res.orderId, 'randomId');
        });
        it('should return null if no order data.', () => {
            let res = exportLoyaltyOrders.process();
            assert.isNull(res);
        });
    });

    describe('write', () => {
        it('Should post the objects to Yotpo.', () => {
            let exportOrderByLocale = sinon.stub(exportLoyaltyOrderModel, 'exportOrdersByLocale');
            exportOrderByLocale.returns(true);
            let events = {toArray: () => [orderObj]};
            exportLoyaltyOrders.write(events);
            exportOrderByLocale.restore();
        });
        it('Should mark object as failed if it does not post to yotpo.', () => {
            let exportOrderByLocale = sinon.stub(exportLoyaltyOrderModel, 'exportOrdersByLocale');
            exportOrderByLocale.throws('FakeError');
            let events = {toArray: () => [orderObj]};
            exportLoyaltyOrders.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write order payload to yotpo for payload:  Error: FakeError/), 'error', 'exportOrders~write');
            exportOrderByLocale.restore();
        });
    });
    describe('afterChunk', () => {
        it('Should log successful when the chunk was successful.', () => {
            exportLoyaltyOrders.afterChunk(true);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export chunk completed successfully/), 'debug', 'exportOrders~afterChunk');
        });
        it('Should log unsuccessful when the chunk was unsuccessful.', () => {
            exportLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export chunk failed/), 'error', 'exportOrders~afterChunk');
        });
        it('Should log number of failed orders.', () => {
            // 0 out chunkErrorCount
            exportLoyaltyOrders.beforeChunk(false);
            exportLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 0 processed in this chunk/), 'error', 'exportOrders~afterChunk');
            exportLoyaltyOrders.process();
            exportLoyaltyOrders.process();
            exportLoyaltyOrders.process();
            // Only care about logging for the afterChunk
            loggerSpy.logMessage.reset();
            exportLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 3 processed in this chunk/), 'error', 'exportOrders~afterChunk');
        });
    });
    describe('afterStep', () => {
        it('Should log successful when the step was successful.', () => {
            exportLoyaltyOrders.afterStep(true, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export step completed successfully/), 'debug', 'exportOrders~afterStep');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 0 processed in this step /), 'debug', 'exportOrders~afterStep');
        });
        it('Should log unsuccessful when the step was unsuccessful.', () => {
            exportLoyaltyOrders.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export step failed/), 'error', 'exportOrders~afterStep');
        });
        it('Should log unsuccessful order counts.', () => {
            // Process an order
            jobsConfigObject.custom.loyaltyOrderExportComplete = false;
            exportLoyaltyOrders.beforeStep({}, stepExecution);
            let generateOrderExportPayload = sinon.stub(exportLoyaltyOrderModel, 'generateOrderExportPayload');
            generateOrderExportPayload.returns({ fake: 'object' });
            // Generate 1 successful 1 failed order
            exportLoyaltyOrders.process(fakeOrderEvent);
            exportLoyaltyOrders.process();
            generateOrderExportPayload.restore();
            loggerSpy.logMessage.reset();
            constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD = 100;
            exportLoyaltyOrders.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 2 processed in this step /), 'error', 'exportOrders~afterStep');
            constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD = 0.3;
        });
    });
});
