'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('backfillLoyaltyOrders job', () => {
    let sitePrefs;
    let fakeOrderEvent;
    let orderObj;
    // Sinon Spies
    let loggerSpy = { logMessage: sinon.spy() };
    let backfillLoyaltyOrders;

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
        backfillLoyaltyOrders = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/job/loyalty/backfillLoyaltyOrders.js', {
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
            assert.throws(() => backfillLoyaltyOrders.beforeStep({}, stepExecution), /Failed to start loyalty Order Export, Yotpo Loyalty system is disabled/);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Loyalty system is disabled/), 'warn', 'backfillLoyaltyOrders~beforeStep');
        });
        it('throw an error and log if run with the order feedk disabled.', () => {
            sitePrefs.yotpoLoyaltyEnableOrderFeed = false;
            assert.throws(() => backfillLoyaltyOrders.beforeStep({}, stepExecution), '');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Yotpo Loyalty Order Export is disabled/), 'warn', 'backfillLoyaltyOrders~beforeStep');
        });
    });

    describe('read', () => {
        it('should return true when has next is true.', () => {
            backfillLoyaltyOrders.beforeStep({}, stepExecution);
            assert.isTrue(backfillLoyaltyOrders.read());
        });
        it('should return null when has next is not true.', () => {
            let getOrderExportObjectIterator = sinon.stub(exportLoyaltyOrderModel, 'getOrderExportObjectIterator');
            getOrderExportObjectIterator.returns({ hasNext: () => { return false; }, next: () => { return false; }, getCount: () => { return 0; } });
            backfillLoyaltyOrders.beforeStep({}, stepExecution);
            assert.isNull(backfillLoyaltyOrders.read());
            getOrderExportObjectIterator.restore();
            backfillLoyaltyOrders.beforeStep({}, stepExecution);
        });
    });

    describe('process', () => {
        it('should return order data.', () => {
            let res = backfillLoyaltyOrders.process(orderObj);
            assert.equal(res.orderId, 'randomId');
        });
        it('should return null if no order data.', () => {
            let res = backfillLoyaltyOrders.process();
            assert.isNull(res);
        });
    });

    describe('write', () => {
        it('Should post the objects to Yotpo.', () => {
            let exportOrderByLocale = sinon.stub(exportLoyaltyOrderModel, 'exportOrdersByLocale');
            exportOrderByLocale.returns(true);
            let events = {toArray: () => [orderObj]};
            backfillLoyaltyOrders.write(events);
            exportOrderByLocale.restore();
        });
        it('Should mark object as failed if it does not post to yotpo.', () => {
            let exportOrderByLocale = sinon.stub(exportLoyaltyOrderModel, 'exportOrdersByLocale');
            exportOrderByLocale.throws('FakeError');
            let events = {toArray: () => [orderObj]};
            backfillLoyaltyOrders.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write order payload to yotpo for payload:  Error: FakeError/), 'error', 'backfillLoyaltyOrders~write');
            exportOrderByLocale.restore();
        });
    });
    describe('afterChunk', () => {
        it('Should log successful when the chunk was successful.', () => {
            backfillLoyaltyOrders.afterChunk(true);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export chunk completed successfully/), 'debug', 'backfillLoyaltyOrders~afterChunk');
        });
        it('Should log unsuccessful when the chunk was unsuccessful.', () => {
            backfillLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export chunk failed/), 'error', 'backfillLoyaltyOrders~afterChunk');
        });
        it('Should log number of failed orders.', () => {
            // 0 out chunkErrorCount
            backfillLoyaltyOrders.beforeChunk(false);
            backfillLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 0 processed in this chunk/), 'error', 'backfillLoyaltyOrders~afterChunk');
            backfillLoyaltyOrders.process();
            backfillLoyaltyOrders.process();
            backfillLoyaltyOrders.process();
            // Only care about logging for the afterChunk
            loggerSpy.logMessage.reset();
            backfillLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 3 processed in this chunk/), 'error', 'backfillLoyaltyOrders~afterChunk');
        });
    });
    describe('afterStep', () => {
        it('Should log successful when the step was successful.', () => {
            backfillLoyaltyOrders.afterStep(true, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export step completed successfully/), 'debug', 'backfillLoyaltyOrders~afterStep');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 0 processed in this step /), 'debug', 'backfillLoyaltyOrders~afterStep');
        });
        it('Should log unsuccessful when the step was unsuccessful.', () => {
            backfillLoyaltyOrders.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export step failed/), 'error', 'backfillLoyaltyOrders~afterStep');
        });
        it('Should log unsuccessful order counts.', () => {
            // Process an order
            jobsConfigObject.custom.loyaltyOrderExportComplete = false;
            backfillLoyaltyOrders.beforeStep({}, stepExecution);
            let generateOrderExportPayload = sinon.stub(exportLoyaltyOrderModel, 'generateOrderExportPayload');
            generateOrderExportPayload.returns({ fake: 'object' });
            // Generate 1 successful 1 failed order
            backfillLoyaltyOrders.process(fakeOrderEvent);
            backfillLoyaltyOrders.process();
            generateOrderExportPayload.restore();
            loggerSpy.logMessage.reset();
            constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD = 100;
            backfillLoyaltyOrders.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 2 processed in this step /), 'error', 'backfillLoyaltyOrders~afterStep');
            constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD = 0.3;
        });
    });
});
