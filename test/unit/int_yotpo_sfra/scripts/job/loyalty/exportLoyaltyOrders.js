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

    const yotpoConfigurationModel = {
        isCartridgeEnabled: () => { return sitePrefs.yotpoCartridgeEnabled; },
        getYotpoPref: (pref) => { return sitePrefs[pref] || null; }
    };

    const exportLoyaltyOrderModel = {
        getQueuedOrderExportObjects: () => {
            return {
                count: 1,
                hasNext: () => { return true; },
                next: () => { return true; }
            };
        },
        generateOrderExportPayload: () => {},
        exportOrderByLocale: () => {}
    };

    var jobContext = { getContext: () => { return {}; } };
    var stepExecution = { getJobExecution: () => { return jobContext; } };

    beforeEach(function () {
        // The exporter has a bunch of private variables that need to reset between tests.
        exportLoyaltyOrders = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/job/loyalty/exportLoyaltyOrders.js', {
            '*/cartridge/models/loyalty/export/exportLoyaltyOrderModel': exportLoyaltyOrderModel,
            '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
            '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
            '*/cartridge/scripts/utils/constants': constants
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
        it('Call getQueuedOrderExportObjects and populate the package scoped Orders object', () => {
            assert.equal(exportLoyaltyOrders.getTotalCount(), 0);
            assert.isUndefined(exportLoyaltyOrders.beforeStep({}, stepExecution));
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Starting Yotpo Loyalty Order Export Step Job/), 'debug', 'exportLoyaltyOrders~beforeStep');
            assert.equal(exportLoyaltyOrders.getTotalCount(), 1);
        });
        it('Throws an error if getQueuedOrderExportObjects throws.', () => {
            let getQueuedOrderExportObjects = sinon.stub(exportLoyaltyOrderModel, 'getQueuedOrderExportObjects');
            getQueuedOrderExportObjects.throws('fakeException');
            assert.throws(() => exportLoyaltyOrders.beforeStep({}, stepExecution), 'fakeException');
            getQueuedOrderExportObjects.restore();
        });
    });

    describe('read', () => {
        it('should return true when has next is true.', () => {
            exportLoyaltyOrders.beforeStep({}, stepExecution);
            assert.isTrue(exportLoyaltyOrders.read());
        });
        it('should return null when has next is not true.', () => {
            let getQueuedOrderExportObjects = sinon.stub(exportLoyaltyOrderModel, 'getQueuedOrderExportObjects');
            getQueuedOrderExportObjects.returns({ hasNext: () => { return false; } });
            exportLoyaltyOrders.beforeStep({}, stepExecution);
            assert.isNull(exportLoyaltyOrders.read());
            getQueuedOrderExportObjects.restore();
        });
    });

    describe('process', () => {
        it('should return return an assembled order Object.', () => {
            let generateOrderExportPayload = sinon.stub(exportLoyaltyOrderModel, 'generateOrderExportPayload');
            generateOrderExportPayload.returns({ fake: 'object' });
            assert.deepEqual(exportLoyaltyOrders.process(fakeOrderEvent), orderObj);
            generateOrderExportPayload.restore();
        });
        it('should use existing payload if present and override the locale if included.', () => {
            fakeOrderEvent.custom.locale = 'testing';
            fakeOrderEvent.custom.Payload = '{"fake":"object"}';
            orderObj.OrderLocale = 'testing';
            orderObj.OrderEventObject.custom.locale = 'testing';
            assert.deepEqual(exportLoyaltyOrders.process(fakeOrderEvent), orderObj);
        });
        it('should return null if no order data.', () => {
            let res = exportLoyaltyOrders.process();
            assert.isNull(res);
        });
    });

    describe('write', () => {
        it('Should post the objects to Yotpo.', () => {
            let exportOrderByLocale = sinon.stub(exportLoyaltyOrderModel, 'exportOrderByLocale');
            exportOrderByLocale.returns(true);
            let events = [orderObj];
            exportLoyaltyOrders.write(events);
            assert.equal(events[0].OrderEventObject.custom.Status, 'SUCCESS');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Writing Order payload to yotpo for Order/), 'debug', 'exportLoyaltyOrders~write');
            exportOrderByLocale.restore();
        });
        it('Should mark object as failed if it does not post to yotpo.', () => {
            let exportOrderByLocale = sinon.stub(exportLoyaltyOrderModel, 'exportOrderByLocale');
            exportOrderByLocale.throws('FakeError');
            let events = [orderObj];
            exportLoyaltyOrders.write(events);
            assert.equal(events[0].OrderEventObject.custom.Status, 'FAIL');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write Order payload to yotpo for Order/), 'error', 'exportLoyaltyOrders~write');
            exportOrderByLocale.restore();
        });
        it('Should log and fail if event has no order ID.', () => {
            orderObj.OrderId = null;
            let events = [orderObj];
            exportLoyaltyOrders.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write event, OrderId not found/), 'error', 'exportLoyaltyOrders~write');
        });
    });
    describe('afterChunk', () => {
        it('Should log successful when the chunk was successful.', () => {
            exportLoyaltyOrders.afterChunk(true);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export chunk completed successfully/), 'debug', 'exportLoyaltyOrders~afterChunk');
        });
        it('Should log unsuccessful when the chunk was unsuccessful.', () => {
            exportLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export chunk failed/), 'error', 'exportLoyaltyOrders~afterChunk');
        });
        it('Should log number of failed orders.', () => {
            // 0 out chunkErrorCount
            exportLoyaltyOrders.beforeChunk(false);
            exportLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 0 processed in this chunk/), 'error', 'exportLoyaltyOrders~afterChunk');
            exportLoyaltyOrders.process();
            exportLoyaltyOrders.process();
            exportLoyaltyOrders.process();
            // Only care about logging for the afterChunk
            loggerSpy.logMessage.reset();
            exportLoyaltyOrders.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/3 Orders skipped out of 3 processed in this chunk/), 'error', 'exportLoyaltyOrders~afterChunk');
        });
    });
    describe('afterStep', () => {
        it('Should log successful when the step was successful.', () => {
            exportLoyaltyOrders.afterStep(true, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export step completed successfully/), 'debug', 'exportLoyaltyOrders~afterStep');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 Orders skipped out of 0 processed in this step /), 'debug', 'exportLoyaltyOrders~afterStep');
        });
        it('Should log unsuccessful when the step was unsuccessful.', () => {
            exportLoyaltyOrders.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Order Export step failed/), 'error', 'exportLoyaltyOrders~afterStep');
        });
        it('Should log unsuccessful order counts.', () => {
            // Process an order
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
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/1 Orders skipped out of 2 processed in this step /), 'error', 'exportLoyaltyOrders~afterStep');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/The following Orders where excluded from export in this job execution due to data errors:/), 'error', 'exportLoyaltyOrders~afterStep');
            constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD = 0.3;
        });
    });
});
