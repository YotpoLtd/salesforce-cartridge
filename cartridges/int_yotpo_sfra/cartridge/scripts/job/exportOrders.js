'use strict';
/**
 * @module scripts/job/exportOrders
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

var yotpoConfigurations;
var yotpoJobConfiguration;
var orders;
var stepOrdersProcessed = 0;
var chunkOrdersProcessed = 0;
var stepErrorCount = 0;
var chunkErrorCount = 0;
var stepSkippedOrders = [];
var chunkSkippedOrders = [];

/**
 * Performs search
 *
 * @param {Object} parameters - parameters passed from BM configuration (NOT USED)
 * @param {dw.job.JobStepExecution} stepExecution - execution of a job step
 */
function beforeStep(parameters, stepExecution) {
    var ExportOrderModel = require('*/cartridge/models/orderexport/exportOrderModel');
    var exportOrderModelInstance = new ExportOrderModel();
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrders~beforeStep';

    yotpoLogger.logMessage('Starting Yotpo Order Export Step Job', 'debug', logLocation);

    // reset error flagging in job context
    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();
    jobContext.yotpoOrderExportReachedErrorThreshold = false;

    // Get locale and job Custom Objects used for configuration
    yotpoConfigurations = exportOrderModelInstance.loadAllYotpoConfigurations();
    yotpoJobConfiguration = exportOrderModelInstance.loadYotpoJobConfigurations();

    // Per-export configuration validation.
    // Outputs log entries for any skipped locales
    // Will throw an error if no locales are configured to export orders
    var localesToProcess;
    try {
        localesToProcess = exportOrderModelInstance.validateLocaleConfigData(yotpoConfigurations, yotpoJobConfiguration);

        // Get all non-exported orders
        orders = exportOrderModelInstance.searchOrders(
            yotpoJobConfiguration.orderFeedJobLastExecutionTime,
            yotpoJobConfiguration.currentDateTime,
            localesToProcess
        );
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
    return orders.count;
}

/**
 * Gets the next order
 *
 * @return {dw.order.Order} - Order to send to 'process' returns null when there are more orders to read
 */
function read() {
    if (orders.hasNext()) {
        return orders.next();
    }

    return null;
}

/**
 * Performs any calculations / formatting required
 *
 * @param {dw.order.Order} order - Order to be processed
 *
 * @return {Object} - orderData to be sent to List for 'write' returns null if order was skipped due to data errors
 */
function process(order) {
    var ExportOrderModel = require('*/cartridge/models/orderexport/exportOrderModel');
    var exportOrderModelInstance = new ExportOrderModel();
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrders~process';

    stepOrdersProcessed++;
    chunkOrdersProcessed++;

    var orderLocale = order.customerLocaleID;

    var orderData;
    try {
        orderData = exportOrderModelInstance.prepareOrderData(order, {
            orderFeedJobLastExecutionTime: yotpoJobConfiguration.orderFeedJobLastExecutionTime,
            currentDateTime: yotpoJobConfiguration.currentDateTime
        });
    } catch (e) {
        yotpoLogger.logMessage(e, 'error', logLocation);
    }

    if (!empty(orderData)) {
        return {
            orderLocale: orderLocale,
            orderData: orderData
        };
    }

    stepErrorCount++;
    chunkErrorCount++;
    if (!empty(order.orderNo)) {
        stepSkippedOrders.push(order.orderNo);
        chunkSkippedOrders.push(order.orderNo);
    }

    return null;
}

/**
 * Builds request objects and performs web service call to send order to Yotpo
 *
 * @param {dw.util.List} ordersData - List of orderData objects returned from "process"
 */
function write(ordersData) {
    var ExportOrderModel = require('*/cartridge/models/orderexport/exportOrderModel');
    var exportOrderModelInstance = new ExportOrderModel();

    // Get objects to build requests separated by locale
    var configAndRequestsByLocale = exportOrderModelInstance.getConfigAndRequestsByLocale(
        yotpoConfigurations,
        yotpoJobConfiguration.orderFeedJobLastExecutionTime
    );
    configAndRequestsByLocale = exportOrderModelInstance.addOrderDataToRequests(ordersData, configAndRequestsByLocale);
    exportOrderModelInstance.exportOrdersByLocale(configAndRequestsByLocale);
}

/**
 * Makes log entries for orders processed in the chunk
 *
 * @param {boolean} success - flag for chunk status
 */
function afterChunk(success) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrders~afterChunk';
    var logMsg = '\n' + chunkErrorCount + ' orders skipped out of ' + chunkOrdersProcessed + ' processed in this chunk';
    var orderErrorsMsg = 'The following orders where excluded from export in this chunk due to data errors: \n' +
    chunkSkippedOrders.join('\n');

    if (success) {
        yotpoLogger.logMessage('Yotpo Order Export chunk completed successfully. \n ' + logMsg, 'debug', logLocation);
        var ExportOrderModel = require('*/cartridge/models/orderexport/exportOrderModel');
        var exportOrderModelInstance = new ExportOrderModel();
        exportOrderModelInstance.updateJobExecutionTime(yotpoJobConfiguration.currentDateTime);
    } else {
        yotpoLogger.logMessage('Yotpo Order Export chunk failed. \n ' + logMsg, 'error', logLocation);
    }

    if (chunkErrorCount > 0) {
        yotpoLogger.logMessage(logMsg + '\n' + orderErrorsMsg, 'error', logLocation);
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

    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();
    var logLocation = 'exportOrders~afterStep';
    var logMsg = '\n' + stepErrorCount + ' orders skipped out of ' + stepOrdersProcessed + ' processed in this step \n' +
    'Total number of orders to be exported: ' + getTotalCount();
    var orderErrorsMsg = 'The following orders where excluded from export in this job execution due to data errors: \n' +
        stepSkippedOrders.join('\n');

    if (success) {
        yotpoLogger.logMessage('Yotpo Order Export step completed successfully. \n ' + logMsg, 'debug', logLocation);
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

        throw new Error(logMsg + '\n' + orderErrorsMsg);
    } else if (hasErrors) {
        yotpoLogger.logMessage(logMsg + '\n' + orderErrorsMsg, 'error', logLocation);
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
