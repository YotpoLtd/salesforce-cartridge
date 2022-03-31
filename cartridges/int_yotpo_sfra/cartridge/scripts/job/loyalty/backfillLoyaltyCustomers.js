'use strict';
/**
 * @module scripts/job/loyalty/backfillLoyaltyCustomers
 *
 * https://documentation.b2c.commercecloud.salesforce.com/DOC1/index.jsp?topic=%2Fcom.demandware.dochelp%2FJobs%2FChunkOrientedScriptModules.html
 *
 * read 	Required 	Returns one item or nothing if there are no more items.
 * process 	Required 	Transforms items and applies business logic to them. It receives the item returned by the read function, performs a process, and returns one item.The item returned can be the same item that the read function returned if no processing logic is necessary, or it can be a new item of a different type. If the process function returns nothing, then the read function item is filtered and doesn't appear in the list of items to be written later.
 * write 	Required 	Receives a list of items. The list size matches the chunk size or, if the number of items in the last available chunk is smaller, it is smaller. The write function returns nothing.
 * totalCount 	Optional 	Returns the total number of items that are available. Called by the framework exactly once before chunk processing begins. A known total count allows better monitoring, for example, to show that 50 of 100 items have already been processed.
 * beforeStep 	Optional 	Executed before a chunk step begins. Implements logic before all items of all chunks are read, processed, and written.
 * beforeChunk 	Optional 	Executed before a chunk begins. Implements logic before a chunk of S items is read, processed, and written.
 * afterChunk 	Optional 	Executed after a chunk finishes. Implements logic after a chunk of S items has been read, processed, and written successfully.
 * afterStep 	Optional 	Executed after a chunk step finished successfully. Implements logic after all items of all chunks are read, processed, and written successfully.
 */

var customers;
var stepCustomersProcessed = 0;
var chunkCustomersProcessed = 0;
var stepErrorCount = 0;
var chunkErrorCount = 0;
var lastCustomerId = '0';
var stepSkippedCustomers = [];
var chunkSkippedCustomers = [];

/**
 * Performs search
 *
 * @param {Object} parameters - parameters passed from BM configuration (NOT USED)
 * @param {dw.job.JobStepExecution} stepExecution - execution of a job step
 */
function beforeStep(parameters, stepExecution) {
    var ExportLoyaltyCustomerModel = require('*/cartridge/models/loyalty/export/exportLoyaltyCustomerModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var logLocation = 'backfillLoyaltyCustomers~beforeStep';
    var constants = require('*/cartridge/scripts/utils/constants');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    // reset error flagging in job context
    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();
    jobContext.yotpoCustomerExportReachedErrorThreshold = false;

    var loyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', 'default');
    if (!loyaltyEnabled) {
        YotpoLogger.logMessage('Failed to start loyalty Customer Export, Yotpo Loyalty system is disabled', 'warn', logLocation);
        jobContext.displayErrorInBm = true;
        throw new Error();
    }

    var loyaltyCustomerFeedEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableCustomerFeed', 'default');
    if (!loyaltyCustomerFeedEnabled) {
        YotpoLogger.logMessage('Failed to start loyalty Customer Export, Yotpo Loyalty Customer Export is disabled', 'warn', logLocation);
        jobContext.displayErrorInBm = true;
        throw new Error();
    }

    if ('loyaltyCustomerExportComplete' in yotpoJobsConfiguration.custom) {
        if (yotpoJobsConfiguration.custom.loyaltyCustomerExportComplete) {
            YotpoLogger.logMessage('Failed to start loyalty Customer Export, Yotpo Loyalty Customer Export is marked as complete in jobs configuration custom object', 'warn', logLocation);
            jobContext.displayErrorInBm = true;
            throw new Error();
        }
    }

    if ('loyaltyCustomerExportLastId' in yotpoJobsConfiguration.custom) {
        lastCustomerId = '' + yotpoJobsConfiguration.custom.loyaltyCustomerExportLastId;
    } else {
        require('dw/system/Transaction').wrap(function () {
            yotpoJobsConfiguration.custom.loyaltyCustomerExportLastId = lastCustomerId;
        });
    }

    YotpoLogger.logMessage('Starting Yotpo Loyalty Customer Export Step Job', 'debug', logLocation);

    try {
        customers = ExportLoyaltyCustomerModel.getCustomerExportObjectIterator(lastCustomerId);
    } catch (e) {
        // Set error status to job context so it can be checked in the following script step to
        // surface the job error status for the chunk step in the Business Manager.
        // As of writing this is the only way to have a chunk job complete and be able to set the exit status
        jobContext.displayErrorInBm = true;

        throw new Error(e);
    }
}

/**
 * Resets error count, order count, and chunkSkippedCustomers array so we can track errors in each chunk
 */
function beforeChunk() {
    chunkErrorCount = 0;
    chunkCustomersProcessed = 0;
    chunkSkippedCustomers = [];
}


/**
 * Returns the total number of items that are available.
 * Called by the framework exactly once before chunk processing begins.
 *
 * @return {number} - Total number of orders retrieved in 'beforeStep'
 */
function getTotalCount() {
    return customers.getCount();
}

/**
 * Gets the next customer object
 *
 * @return {Object} - Customer Object to send to 'process' returns null when there are more objects to read
 */
function read() {
    var ExportLoyaltyCustomerModel = require('*/cartridge/models/loyalty/export/exportLoyaltyCustomerModel');
    var nextCustomer;
    if (customers.hasNext()) {
        nextCustomer = customers.next();
        lastCustomerId = '' + nextCustomer.customerNo;
        return nextCustomer;
    }
    customers = ExportLoyaltyCustomerModel.getCustomerExportObjectIterator(lastCustomerId);
    // Skip next customer to avoid duplicate posting
    customers.next();
    if (customers.hasNext()) {
        nextCustomer = customers.next();
        if (nextCustomer.customerNo > lastCustomerId) {
            lastCustomerId = '' + nextCustomer.customerNo;
            return nextCustomer;
        }
    }

    return null;
}

/**
 * Performs any calculations / formatting required
 *
 * @param {Object} customerObject - Customer Object to be processed
 * @return {Object} - customerData to be sent to List for 'write' returns null if customer was skipped due to data errors
 */
function process(customerObject) {
    var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'backfillLoyaltyCustomers~process';

    stepCustomersProcessed++;
    chunkCustomersProcessed++;
    var customerData;
    var customerLocale = 'default';

    if (!customerObject) {
        return null;
    }

    try {
        customerData = LoyaltyCustomerModel.prepareCustomerJSON(customerObject);
    } catch (e) {
        YotpoLogger.logMessage(e, 'error', logLocation);
    }

    //  If you create a custom locale attribute on the customer object, change the name of that attribute here.  None exists nor is needed by default.
    if ('locale' in customerObject) {
        customerLocale = customerObject.locale;
    }

    if (!empty(customerData)) {
        return {
            customerLocale: customerLocale,
            customerId: customerObject.customerNo,
            customerData: customerData
        };
    }

    stepErrorCount++;
    chunkErrorCount++;
    if (!empty(customerData.customerNo)) {
        stepSkippedCustomers.push(customerData.customerNo);
        chunkSkippedCustomers.push(customerData.customerNo);
    }

    return null;
}

/**
 * Builds request objects and performs web service call to send customer to Yotpo
 *
 * @param {dw.util.List} events - List of customerData events objects returned from "process"
 */
function write(events) {
    var ExportLoyaltyCustomerModel = require('*/cartridge/models/loyalty/export/exportLoyaltyCustomerModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'backfillLoyaltyCustomers~write';
    var customersByLocale = events.toArray().reduce(function callback(acc, curval) {
        var curLocale = curval.customerLocale;
        if (!acc[curLocale]) {
            acc[curLocale] = []; // eslint-disable-line no-param-reassign
        }
        if (curval.customerId) {
            acc[curLocale].push(curval.customerData);
            YotpoLogger.logMessage('Writing customer payload to yotpo for customer: ' + curval.customerId, 'debug', logLocation);
        }
        return acc;
    }, {});
    Object.keys(customersByLocale).forEach(function (locale) {
        var customerDataArray = customersByLocale[locale];
        try {
            var errorsArray = ExportLoyaltyCustomerModel.exportCustomersByLocale(customerDataArray, locale);
            if (errorsArray) {
                YotpoLogger.logMessage('Yotpo customer import, some customers failed to load: ' + customerDataArray + ' Error: ' + errorsArray, 'error', logLocation);
            }
        } catch (errorDetails) {
            YotpoLogger.logMessage('Failed to write customer payload to yotpo for payload: ' + customerDataArray + ' Error: ' + errorDetails, 'error', logLocation);
        }
    });
}

/**
 * Makes log entries for customer processed in the chunk
 *
 * @param {boolean} success - flag for chunk status
 */
function afterChunk(success) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'backfillLoyaltyCustomers~afterChunk';
    var logMsg = '\n' + chunkErrorCount + ' customers skipped out of ' + chunkCustomersProcessed + ' processed in this chunk';
    var errorsMsg = 'The following customers where excluded from export in this chunk due to data errors: \n' +
    chunkSkippedCustomers.join('\n');
    var constants = require('*/cartridge/scripts/utils/constants');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    if (success) {
        yotpoLogger.logMessage('Yotpo Customer Export chunk completed successfully. \n ' + logMsg, 'debug', logLocation);
    } else {
        yotpoLogger.logMessage('Yotpo Customer Export chunk failed. \n ' + logMsg, 'error', logLocation);
    }

    if (chunkErrorCount > 0) {
        yotpoLogger.logMessage(logMsg + '\n' + errorsMsg, 'error', logLocation);
    }

    if (lastCustomerId && lastCustomerId !== '0') {
        require('dw/system/Transaction').wrap(function () {
            yotpoJobsConfiguration.custom.loyaltyCustomerExportLastId = lastCustomerId;
        });
    }
}

/**
 * Execution time custom object is updated
 *
 * @param {boolean} success - flag for step status
 * @param {Object} parameters - parameters passed from BM configuration (NOT USED)
 * @param {dw.job.JobStepExecution} stepExecution - execution of a job step
 */
function afterStep(success, parameters, stepExecution) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var constants = require('*/cartridge/scripts/utils/constants');

    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();
    var logLocation = 'backfillLoyaltyCustomers~afterStep';
    var logMsg = '\n' + stepErrorCount + ' customers skipped out of ' + stepCustomersProcessed + ' processed in this step \n' +
    'Total number of customers to be exported: ' + getTotalCount();
    var customersErrorsMsg = 'The following customers where excluded from export in this job execution due to data errors: \n' +
        stepSkippedCustomers.join('\n');

    if (success) {
        yotpoLogger.logMessage('Yotpo Customer Export step completed successfully. \n ' + logMsg, 'debug', logLocation);
        require('dw/system/Transaction').wrap(function () {
            yotpoJobsConfiguration.custom.loyaltyCustomerExportComplete = true;
        });
    } else {
        yotpoLogger.logMessage('Yotpo Customer Export step failed. \n ' + logMsg, 'error', logLocation);
    }

    var hasErrors = stepErrorCount > 0;
    var displayErrorInBm = stepErrorCount > Math.round(getTotalCount() * constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD);

    if (displayErrorInBm) {
        // Set error status to job context so it can be checked in the following script step to
        // surface the job error status for the chunk step in the Business Manager.
        // As of writing this is the only way to have a chunk job complete and be able to set the exit status
        jobContext.displayErrorInBm = displayErrorInBm;

        throw new Error(logMsg + '\n' + customersErrorsMsg);
    } else if (hasErrors) {
        yotpoLogger.logMessage(logMsg + '\n' + customersErrorsMsg, 'error', logLocation);
    }
}

module.exports = {
    beforeStep: beforeStep,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep,
    afterChunk: afterChunk,
    beforeChunk: beforeChunk,
    getTotalCount: getTotalCount
};
