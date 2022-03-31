'use strict';
/**
 * @module scripts/job/loyalty/backfillLoyaltyOrders
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

var Orders;
var stepOrdersProcessed = 0;
var chunkOrdersProcessed = 0;
var stepErrorCount = 0;
var chunkErrorCount = 0;
var lastOrderId = '0';
var stepSkippedOrders = [];
var chunkSkippedOrders = [];

/**
 * Performs search
 *
 * @param {Object} parameters - parameters passed from BM configuration (NOT USED)
 * @param {dw.job.JobStepExecution} stepExecution - execution of a job step
 */
function beforeStep(parameters, stepExecution) {
    var ExportLoyaltyOrderModel = require('*/cartridge/models/loyalty/export/exportLoyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var logLocation = 'backfillLoyaltyOrders~beforeStep';
    var constants = require('*/cartridge/scripts/utils/constants');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    // reset error flagging in job context
    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();
    jobContext.yotpoOrderExportReachedErrorThreshold = false;

    var loyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', 'default');
    if (!loyaltyEnabled) {
        var message = 'Failed to start loyalty Order Export, Yotpo Loyalty system is disabled';
        YotpoLogger.logMessage(message, 'warn', logLocation);
        jobContext.displayErrorInBm = true;
        throw new Error(message);
    }

    var loyaltyOrderFeedEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnableOrderFeed', 'default');
    if (!loyaltyOrderFeedEnabled) {
        YotpoLogger.logMessage('Failed to start loyalty Order Export, Yotpo Loyalty Order Export is disabled', 'warn', logLocation);
        jobContext.displayErrorInBm = true;
        throw new Error();
    }

    if ('loyaltyOrderExportComplete' in yotpoJobsConfiguration.custom) {
        if (yotpoJobsConfiguration.custom.loyaltyOrderExportComplete) {
            YotpoLogger.logMessage('Failed to start loyalty Order Export, Yotpo Loyalty Order Export is marked as complete in jobs configuration custom object', 'warn', logLocation);
            jobContext.displayErrorInBm = true;
            throw new Error();
        }
    }

    if ('loyaltyOrderExportLastId' in yotpoJobsConfiguration.custom) {
        lastOrderId = '' + yotpoJobsConfiguration.custom.loyaltyOrderExportLastId;
    } else {
        require('dw/system/Transaction').wrap(function () {
            yotpoJobsConfiguration.custom.loyaltyOrderExportLastId = lastOrderId;
        });
    }

    YotpoLogger.logMessage('Starting Yotpo Loyalty Order Export Step Job', 'debug', logLocation);

    try {
        Orders = ExportLoyaltyOrderModel.getOrderExportObjectIterator(lastOrderId);
    } catch (e) {
        // Set error status to job context so it can be checked in the following script step to
        // surface the job error status for the chunk step in the Business Manager.
        // As of writing this is the only way to have a chunk job complete and be able to set the exit status
        jobContext.displayErrorInBm = true;

        throw new Error(e);
    }
}

/**
 * Resets error count, order count, and chunkSkippedOrders array so we can track errors in each chunk
 */
function beforeChunk() {
    chunkErrorCount = 0;
    chunkOrdersProcessed = 0;
    chunkSkippedOrders = [];
}


/**
 * Returns the total number of items that are available.
 * Called by the framework exactly once before chunk processing begins.
 *
 * @return {number} - Total number of orders retrieved in 'beforeStep'
 */
function getTotalCount() {
    if (Orders) {
        return Orders.getCount();
    }
    return 0;
}

/**
 * Gets the next Order object
 *
 * @return {Object} - Order Object to send to 'process' returns null when there are more objects to read
 */
function read() {
    var ExportLoyaltyOrderModel = require('*/cartridge/models/loyalty/export/exportLoyaltyOrderModel');
    var nextOrder;
    if (Orders.hasNext()) {
        nextOrder = Orders.next();
        lastOrderId = '' + nextOrder.orderNo;
        return nextOrder;
    }
    Orders = ExportLoyaltyOrderModel.getOrderExportObjectIterator(lastOrderId);
    // Skip 1 order to avoid repeat posting the last order.  Cant do +1 on the lastOrderId before the query because the order id is not numeric.
    Orders.next();
    if (Orders.hasNext()) {
        nextOrder = Orders.next();
        if (nextOrder.orderNo > lastOrderId) {
            lastOrderId = '' + nextOrder.orderNo;
            return nextOrder;
        }
    }

    return null;
}

/**
 * Performs any calculations / formatting required
 *
 * @param {Object} orderObject - Order Object to be processed
 * @return {Object} - OrderData to be sent to List for 'write' returns null if Order was skipped due to data errors
 */
function process(orderObject) {
    var LoyaltyOrderModel = require('*/cartridge/models/loyalty/common/loyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'backfillLoyaltyOrders~process';

    stepOrdersProcessed++;
    chunkOrdersProcessed++;
    var orderData;
    var orderLocale = 'default'; // Overridden if specificed in the object

    if (!orderObject) {
        return null;
    }

    try {
        orderData = LoyaltyOrderModel.prepareOrderJSON(orderObject);
        if (orderObject.customerLocaleID) {
            orderLocale = orderObject.customerLocaleID;
        }
    } catch (e) {
        YotpoLogger.logMessage(e, 'error', logLocation);
    }

    if (!empty(orderData)) {
        return {
            orderLocale: orderLocale,
            orderId: orderObject.orderNo,
            orderData: orderData
        };
    }

    stepErrorCount++;
    chunkErrorCount++;
    if (!empty(orderObject.orderNo)) {
        stepSkippedOrders.push(orderObject.orderNo);
        chunkSkippedOrders.push(orderObject.orderNo);
    }

    return null;
}

/**
 * Builds request objects and performs web service call to send Order to Yotpo
 *
 * @param {dw.util.List} events - List of OrderData events objects returned from "process"
 */
function write(events) {
    var ExportLoyaltyOrderModel = require('*/cartridge/models/loyalty/export/exportLoyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'backfillLoyaltyOrders~write';

    var ordersByLocale = events.toArray().reduce(function callback(acc, curval) {
        var curLocale = curval.orderLocale;
        if (!acc[curLocale]) {
            acc[curLocale] = []; // eslint-disable-line no-param-reassign
        }
        if (curval.orderId) {
            acc[curLocale].push(curval.orderData);
            YotpoLogger.logMessage('Writing Order payload to yotpo for Order: ' + curval.orderId, 'debug', logLocation);
        }
        return acc;
    }, {});

    Object.keys(ordersByLocale).forEach(function (locale) {
        var orderDataArray = ordersByLocale[locale];
        try {
            var errorsArray = ExportLoyaltyOrderModel.exportOrdersByLocale(orderDataArray, locale);
            if (errorsArray) {
                YotpoLogger.logMessage('Yotpo order import, some orders failed to load: ' + orderDataArray + ' Error: ' + errorsArray, 'error', logLocation);
            }
        } catch (errorDetails) {
            YotpoLogger.logMessage('Failed to write order payload to yotpo for payload: ' + orderDataArray + ' Error: ' + errorDetails, 'error', logLocation);
        }
    });
}

/**
 * Makes log entries for Order processed in the chunk
 *
 * @param {boolean} success - flag for chunk status
 */
function afterChunk(success) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'backfillLoyaltyOrders~afterChunk';
    var logMsg = '\n' + chunkErrorCount + ' Orders skipped out of ' + chunkOrdersProcessed + ' processed in this chunk';
    var orderErrorsMsg = 'The following Orders where excluded from export in this chunk due to data errors: \n' +
    chunkSkippedOrders.join('\n');
    var Calendar = require('dw/util/Calendar');
    var constants = require('*/cartridge/scripts/utils/constants');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    if (success) {
        yotpoLogger.logMessage('Yotpo Order Export chunk completed successfully. \n ' + logMsg, 'debug', logLocation);
        var	helperCalendar = new Calendar();
        var currentDateTime = helperCalendar.getTime();
        yotpoJobsConfiguration.custom.orderFeedJobLastExecutionDateTime = currentDateTime;
    } else {
        yotpoLogger.logMessage('Yotpo Order Export chunk failed. \n ' + logMsg, 'error', logLocation);
    }

    if (chunkErrorCount > 0) {
        yotpoLogger.logMessage(logMsg + '\n' + orderErrorsMsg, 'error', logLocation);
    }

    if (lastOrderId && lastOrderId !== '0') {
        require('dw/system/Transaction').wrap(function () {
            yotpoJobsConfiguration.custom.loyaltyOrderExportLastId = lastOrderId;
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
    var logLocation = 'backfillLoyaltyOrders~afterStep';
    var logMsg = '\n' + stepErrorCount + ' Orders skipped out of ' + stepOrdersProcessed + ' processed in this step \n' +
    'Total number of Orders to be exported: ' + getTotalCount();
    var OrdersErrorsMsg = 'The following Orders where excluded from export in this job execution due to data errors: \n' +
        stepSkippedOrders.join('\n');

    if (success) {
        yotpoLogger.logMessage('Yotpo Order Export step completed successfully. \n ' + logMsg, 'debug', logLocation);
        require('dw/system/Transaction').wrap(function () {
            yotpoJobsConfiguration.custom.loyaltyOrderExportComplete = true;
        });
    } else {
        yotpoLogger.logMessage('Yotpo Order Export step failed. \n ' + logMsg, 'error', logLocation);
    }

    var hasErrors = stepErrorCount > 0;
    var displayErrorInBm = stepErrorCount > Math.round(getTotalCount() * constants.EXPORT_ORDER_ERROR_COUNT_THRESHOLD);

    if (displayErrorInBm) {
        // Set error status to job context so it can be checked in the following script step to
        // surface the job error status for the chunk step in the Business Manager.
        // As of writing this is the only way to have a chunk job complete and be able to set the exit status
        jobContext.displayErrorInBm = displayErrorInBm;

        throw new Error(logMsg + '\n' + OrdersErrorsMsg);
    } else if (hasErrors) {
        yotpoLogger.logMessage(logMsg + '\n' + OrdersErrorsMsg, 'error', logLocation);
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
