'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('backfillLoyaltyCustomers job', () => {
    let sitePrefs;
    let fakeCustomerEvent;
    let customerObj;
    // Sinon Spies
    let loggerSpy = {
        logMessage: sinon.spy()
    };
    let backfillLoyaltyCustomers;

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
        backfillLoyaltyCustomers = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/job/loyalty/backfillLoyaltyCustomers.js', {
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
            assert.throws(() => backfillLoyaltyCustomers.beforeStep({}, stepExecution), '');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Loyalty system is disabled/), 'warn', 'backfillLoyaltyCustomers~beforeStep');
        });
        it('throw an error and log if run with the Customer feedk disabled.', () => {
            sitePrefs.yotpoLoyaltyEnableCustomerFeed = false;
            assert.throws(() => backfillLoyaltyCustomers.beforeStep({}, stepExecution), '');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Yotpo Loyalty Customer Export is disabled/), 'warn', 'backfillLoyaltyCustomers~beforeStep');
        });
    });

    describe('read', () => {
        it('should return true when has next is true.', () => {
            backfillLoyaltyCustomers.beforeStep({}, stepExecution);
            assert.isTrue(backfillLoyaltyCustomers.read());
        });
        it('should return null when has next is not true.', () => {
            let getCustomerExportObjectIterator = sinon.stub(exportLoyaltyCustomerModel, 'getQueuedCustomerExportObjects');
            hasNextReturn = false;
            backfillLoyaltyCustomers.beforeStep({}, stepExecution);
            assert.isNull(backfillLoyaltyCustomers.read());
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
            let result = backfillLoyaltyCustomers.process(customerObjDefaults);
            assert.equal(result.customerId, 'randomID');
            generateCustomerExportPayload.restore();
        });
        it('should return null if no Customer data.', () => {
            let res = backfillLoyaltyCustomers.process();
            assert.isNull(res);
        });
    });

    describe('write', () => {
        it('Should post the objects to Yotpo.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomersByLocale');
            exportCustomerByLocale.returns(false);
            let events = {toArray: () => [customerObj]};
            backfillLoyaltyCustomers.write(events);
            exportCustomerByLocale.restore();
        });
        it('Should mark object as failed if it does not post to yotpo.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomersByLocale');
            exportCustomerByLocale.throws('FakeError');
            let events = {toArray: () => [customerObj]};
            backfillLoyaltyCustomers.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Failed to write customer payload to yotpo for payload:  Error: FakeError/), 'error', 'backfillLoyaltyCustomers~write');
            exportCustomerByLocale.restore();
        });
        it('Should log and fail if errors array is present.', () => {
            let exportCustomerByLocale = sinon.stub(exportLoyaltyCustomerModel, 'exportCustomersByLocale');
            exportCustomerByLocale.returns([]);
            customerObj.customerId = null;
            let events = {toArray: () => [customerObj]};
            backfillLoyaltyCustomers.write(events);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo customer import, some customers failed to load:  Error/), 'error', 'backfillLoyaltyCustomers~write');
        });
    });
    describe('afterChunk', () => {
        it('Should log successful when the chunk was successful.', () => {
            backfillLoyaltyCustomers.afterChunk(true);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export chunk completed successfully/), 'debug', 'backfillLoyaltyCustomers~afterChunk');
        });
        it('Should log unsuccessful when the chunk was unsuccessful.', () => {
            backfillLoyaltyCustomers.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export chunk failed/), 'error', 'backfillLoyaltyCustomers~afterChunk');
        });
        it('Should log processed vs not status for Customers.', () => {
            // 0 out chunkErrorCount
            backfillLoyaltyCustomers.beforeChunk(false);
            backfillLoyaltyCustomers.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 0 processed in this chunk/), 'error', 'backfillLoyaltyCustomers~afterChunk');
            backfillLoyaltyCustomers.process();
            backfillLoyaltyCustomers.process();
            backfillLoyaltyCustomers.process();
            // Only care about logging for the afterChunk
            loggerSpy.logMessage.reset();
            backfillLoyaltyCustomers.afterChunk(false);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 3 processed in this chunk/), 'error', 'backfillLoyaltyCustomers~afterChunk');
        });
    });
    describe('afterStep', () => {
        it('Should log successful when the step was successful.', () => {
            backfillLoyaltyCustomers.beforeStep({}, stepExecution);
            backfillLoyaltyCustomers.afterStep(true, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/0 customers skipped out of 0 processed in this step /), 'debug', 'backfillLoyaltyCustomers~afterStep');
        });
        it('Should log unsuccessful when the step was unsuccessful.', () => {
            jobsConfigObject.custom.loyaltyCustomerExportComplete = false;
            backfillLoyaltyCustomers.beforeStep({}, stepExecution);
            backfillLoyaltyCustomers.afterStep(false, {}, stepExecution);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/Yotpo Customer Export step failed/), 'error', 'backfillLoyaltyCustomers~afterStep');
        });
    });
});
