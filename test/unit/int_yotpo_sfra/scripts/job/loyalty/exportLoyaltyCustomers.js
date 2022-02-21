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

    let customerJson = {
        'customerNo': 'randomID',
    }

    let customerObjDefaults = {
        'customerNo': 'randomID',
    };

    const yotpoConfigurationModel = {
        isCartridgeEnabled: () => {
            return sitePrefs.yotpoCartridgeEnabled;
        },
        getYotpoPref: (pref) => {
            return sitePrefs[pref] || null;
        }
    };

    let hasNextReturn = true;
    const exportLoyaltyCustomerModel = {
        getCustomerExportObjectIterator: () => {
            return {
                count: 1,
                hasNext: () => {
                    return hasNextReturn;
                },
                next: () => {
                    return true;
                },
                getCount: () => 5
            };
        },
        getQueuedCustomerExportObjects: () => {},
        generateCustomerExportPayload: () => {},
        updateLoyaltyInitializedFlag: () => {},
        exportCustomersByLocale: () => {}
    };

    const loyaltyOrderModel = {
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

    let jobsConfigObject = {
        custom: {}
    }

    beforeEach(function () {
        // The exporter has a bunch of private variables that need to reset between tests.
        exportLoyaltyCustomers = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/job/loyalty/exportLoyaltyCustomers.js', {
            '*/cartridge/models/loyalty/export/exportLoyaltyCustomerModel': exportLoyaltyCustomerModel,
            '*/cartridge/models/loyalty/common/loyaltyCustomerModel': {
                updateLoyaltyInitializedFlag: () => {},
                prepareCustomerJSON: () => customerJson
            },
            '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
            '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
            '*/cartridge/scripts/utils/constants': constants,
            'dw/object/CustomObjectMgr': {
                getCustomObject: () => jobsConfigObject
            },
            '*/cartridge/models/loyalty/common/loyaltyOrderModel': loyaltyOrderModel
        });
        sitePrefs = Object.assign({}, sitePrefDefaults);
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
    });

    describe('read', () => {
        it('should return true when has next is true.', () => {
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            assert.isTrue(exportLoyaltyCustomers.read());
        });
        it('should return null when has next is not true.', () => {
            let getCustomerExportObjectIterator = sinon.stub(exportLoyaltyCustomerModel, 'getQueuedCustomerExportObjects');
            hasNextReturn = false;
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            assert.isNull(exportLoyaltyCustomers.read());
            getCustomerExportObjectIterator.restore();
            hasNextReturn = true;
        });
    });

    describe('process', () => {
        it('should return return an assembled Customer Object.', () => {
            let generateCustomerExportPayload = sinon.stub(exportLoyaltyCustomerModel, 'generateCustomerExportPayload');
            generateCustomerExportPayload.returns({
                fake: 'object'
            });
            let result = exportLoyaltyCustomers.process(customerObjDefaults);
            assert.equal(result.customerId, 'randomID');
            generateCustomerExportPayload.restore();
        });
        it('should return null if no Customer data.', () => {
            let res = exportLoyaltyCustomers.process();
            assert.isNull(res);
        });
    });

    describe('write', () => {
        it('Should post the objects to Yotpo.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomersByLocale');
            exportCustomerByLocale.returns(false);
            let events = {toArray: () => [customerObj]};
            exportLoyaltyCustomers.write(events);
            exportCustomerByLocale.restore();
        });
        it('Should mark object as failed if it does not post to yotpo.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomersByLocale');
            exportCustomerByLocale.throws('FakeError');
            let events = {toArray: () => [customerObj]};
            exportLoyaltyCustomers.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write customer payload to yotpo for payload:  Error: FakeError/), 'error', 'exportCustomers~write');
            exportCustomerByLocale.restore();
        });
        it('Should log and fail if errors array is present.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomersByLocale');
            exportCustomerByLocale.returns([]);
            customerObj.customerId = null;
            let events = {toArray: () => [customerObj]};
            exportLoyaltyCustomers.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo customer import, some customers failed to load:  Error/), 'error', 'exportCustomers~write');
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
        it('Should log processed vs not status for Customers.', () => {
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
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 3 processed in this chunk/), 'error', 'exportCustomers~afterChunk');
        });
    });
    describe('afterStep', () => {
        it('Should log successful when the step was successful.', () => {
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            exportLoyaltyCustomers.afterStep(true, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 0 processed in this step /), 'debug', 'exportCustomers~afterStep');
        });
        it('Should log unsuccessful when the step was unsuccessful.', () => {
            jobsConfigObject.custom.loyaltyCustomerExportComplete = false;
            exportLoyaltyCustomers.beforeStep({}, stepExecution);
            exportLoyaltyCustomers.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export step failed/), 'error', 'exportCustomers~afterStep');
        });
    });
});
