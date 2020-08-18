'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('exportLoyaltyCustomers job', () => {
    let sitePrefs;
    let fakeCustomerEvent;
    let customerObj;
    // Sinon Spies
    let loggerSpy = {
        logMessage: sinon.spy()
    };
    let exportLoyaltyCustomers;

    var sitePrefDefaults = {
        yotpoCartridgeEnabled: true,
        yotpoLoyaltyAPIKey: 'secretKeyFromSitePref',
        yotpoLoyaltyEnabled: true,
        yotpoLoyaltyEnableCustomerFeed: true
    };

    var customerEventDefaults = {
        custom: {
            CustomerID: 'randomID',
            Payload: '',
            PayloadDeliveryDate: '1/1/2020',
            Status: 'Queued',
            StatusDetails: '',
            lastModified: '1/1/2020',
            creationDate: '1/1/1900'
        }
    };

    let customerObjDefaults = {
        'customerData': {
            'fake': 'object'
        },
        'customerEventObject': {
            'custom': {
                'CustomerID': 'randomID',
                'Payload': '{"fake":"object"}',
                'PayloadDeliveryDate': '1/1/2020',
                'Status': 'Queued',
                'StatusDetails': '',
                'creationDate': '1/1/1900',
                'lastModified': '1/1/2020'
            }
        },
        'customerId': 'randomID',
        'customerLocale': 'testing'
    };

    const yotpoConfigurationModel = {
        isCartridgeEnabled: () => {
            return sitePrefs.yotpoCartridgeEnabled;
        },
        getYotpoPref: (pref) => {
            return sitePrefs[pref] || null;
        }
    };

    const exportLoyaltyCustomerModel = {
        getQueuedCustomerExportObjects: () => {
            return {
                count: 1,
                hasNext: () => {
                    return true;
                },
                next: () => {
                    return true;
                }
            };
        },
        generateCustomerExportPayload: () => {},
        updateLoyaltyInitializedFlag: () => {},
        exportCustomerByLocale: () => {}
    };

    var jobContext = {
        getContext: () => {
            return {};
        }
    };
    var stepExecution = {
        getJobExecution: () => {
            return jobContext;
        }
    };

    beforeEach(function () {
        // The exporter has a bunch of private variables that need to reset between tests.
        exportLoyaltyCustomers = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/job/loyalty/exportLoyaltyCustomers.js', {
            '*/cartridge/models/loyalty/export/exportLoyaltyCustomerModel': exportLoyaltyCustomerModel,
            '*/cartridge/models/loyalty/common/loyaltyCustomerModel': {
                updateLoyaltyInitializedFlag: () => {}
            },
            '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
            '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
            '*/cartridge/scripts/utils/constants': constants
        });
        sitePrefs = Object.assign({}, sitePrefDefaults);
        fakeCustomerEvent = Object.assign({}, customerEventDefaults);
        customerObj = Object.assign({}, customerObjDefaults);
        loggerSpy.logMessage.reset();
    });

    describe('beforeStep', () => {
        it('throw an error and log if run with loyalty disabled.', () => {
            sitePrefs.yotpoLoyaltyEnabled = false;
            assert.throws(() => exportLoyaltyCustomers.beforeStep({}, stepExecution), '');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Loyalty system is disabled/), 'warn', 'exportLoyaltyCustomers~beforeStep');
        });
        it('throw an error and log if run with the Customer feedk disabled.', () => {
            sitePrefs.yotpoLoyaltyEnableCustomerFeed = false;
            assert.throws(() => exportLoyaltyCustomers.beforeStep({}, stepExecution), '');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Yotpo Loyalty Customer Export is disabled/), 'warn', 'exportLoyaltyCustomers~beforeStep');
        });
        it('Call getQueuedCustomerExportObjects and populate the package scoped Customers object', () => {
            assert.isUndefined(exportLoyaltyCustomers.beforeStep({}, stepExecution));
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Starting Yotpo Loyalty Customer Export Step Job/), 'debug', 'exportLoyaltyCustomers~beforeStep');
            assert.equal(exportLoyaltyCustomers.getTotalCount(), 1);
        });
        it('Throws an error if getQueuedCustomerExportObjects throws.', () => {
            let getQueuedCustomerExportObjects = sinon.stub(exportLoyaltyCustomerModel, 'getQueuedCustomerExportObjects');
            getQueuedCustomerExportObjects.throws('fakeException');
            assert.throws(() => exportLoyaltyCustomers.beforeStep({}, stepExecution), 'fakeException');
            getQueuedCustomerExportObjects.restore();
        });
    });

    describe('read', () => {
        it('should return true when has next is true.', () => {
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            assert.isTrue(exportLoyaltyCustomers.read());
        });
        it('should return null when has next is not true.', () => {
            let getQueuedCustomerExportObjects = sinon.stub(exportLoyaltyCustomerModel, 'getQueuedCustomerExportObjects');
            getQueuedCustomerExportObjects.returns({
                hasNext: () => {
                    return false;
                }
            });
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            assert.isNull(exportLoyaltyCustomers.read());
            getQueuedCustomerExportObjects.restore();
        });
    });

    describe('process', () => {
        it('should return return an assembled Customer Object.', () => {
            let generateCustomerExportPayload = sinon.stub(exportLoyaltyCustomerModel, 'generateCustomerExportPayload');
            generateCustomerExportPayload.returns({
                fake: 'object'
            });
            let result = exportLoyaltyCustomers.process(fakeCustomerEvent);
            assert.equal(result.customerId, 'randomID');
            generateCustomerExportPayload.restore();
        });
        it('should use existing payload if present and override the locale if included.', () => {
            fakeCustomerEvent.custom.locale = 'testing';
            fakeCustomerEvent.custom.Payload = '{"fake":"object"}';
            customerObj.customerLocale = 'testing';
            customerObj.customerEventObject.custom.locale = 'testing';
            let result = exportLoyaltyCustomers.process(fakeCustomerEvent);
            assert.deepEqual(result, customerObj);
        });
        it('should return null if no Customer data.', () => {
            let res = exportLoyaltyCustomers.process();
            assert.isNull(res);
        });
    });

    describe('write', () => {
        it('Should post the objects to Yotpo.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomerByLocale');
            exportCustomerByLocale.returns(true);
            let events = [customerObj];
            exportLoyaltyCustomers.write(events);
            assert.equal(events[0].customerEventObject.custom.Status, 'SUCCESS');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Writing customer payload to yotpo for customer/), 'debug', 'exportCustomers~write');
            exportCustomerByLocale.restore();
        });
        it('Should mark object as failed if it does not post to yotpo.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomerByLocale');
            exportCustomerByLocale.throws('FakeError');
            let events = [customerObj];
            exportLoyaltyCustomers.write(events);
            assert.equal(events[0].customerEventObject.custom.Status, 'FAIL');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write customer payload to yotpo for customer/), 'error', 'exportCustomers~write');
            exportCustomerByLocale.restore();
        });
        it('Should log and fail if event has no Customer ID.', () => {
            customerObj.customerId = null;
            let events = [customerObj];
            exportLoyaltyCustomers.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write event/), 'error', 'exportCustomers~write');
        });
    });
    describe('afterChunk', () => {
        it('Should log successful when the chunk was successful.', () => {
            exportLoyaltyCustomers.afterChunk(true);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export chunk completed successfully/), 'debug', 'exportCustomers~afterChunk');
        });
        it('Should log unsuccessful when the chunk was unsuccessful.', () => {
            exportLoyaltyCustomers.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export chunk failed/), 'error', 'exportCustomers~afterChunk');
        });
        it('Should log number of failed Customers.', () => {
            // 0 out chunkErrorCount
            exportLoyaltyCustomers.beforeChunk(false);
            exportLoyaltyCustomers.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 0 processed in this chunk/), 'error', 'exportCustomers~afterChunk');
            exportLoyaltyCustomers.process();
            exportLoyaltyCustomers.process();
            exportLoyaltyCustomers.process();
            // Only care about logging for the afterChunk
            loggerSpy.logMessage.reset();
            exportLoyaltyCustomers.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/3 customers skipped out of 3 processed in this chunk/), 'error', 'exportCustomers~afterChunk');
        });
    });
    describe('afterStep', () => {
        it('Should log successful when the step was successful.', () => {
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            exportLoyaltyCustomers.afterStep(true, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 0 processed in this step /), 'debug', 'exportCustomers~afterStep');
        });
        it('Should log unsuccessful when the step was unsuccessful.', () => {
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            exportLoyaltyCustomers.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export step failed/), 'error', 'exportCustomers~afterStep');
        });
        it('Should throw if failed Customers are more than constants.EXPORT_Customer_ERROR_COUNT_THRESHOLD.', () => {
            // Process an Customer
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            let generateCustomerExportPayload = sinon.stub(exportLoyaltyCustomerModel, 'generateCustomerExportPayload');
            generateCustomerExportPayload.returns({
                fake: 'object'
            });
            // Generate 1 successful 1 failed Customer
            exportLoyaltyCustomers.process(fakeCustomerEvent);
            exportLoyaltyCustomers.process();
            generateCustomerExportPayload.restore();
            loggerSpy.logMessage.reset();
            assert.throws(() => exportLoyaltyCustomers.afterStep(false, {}, stepExecution), /1 customers skipped out of 2 processed in this step/);
        });
    });
});
