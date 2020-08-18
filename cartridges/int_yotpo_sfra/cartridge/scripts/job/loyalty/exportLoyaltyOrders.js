'use strict';
/**
 * @module scripts/job/loyalty/exportLoyaltyOrders
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
    var logLocation = 'exportLoyaltyOrders~beforeStep';

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

    YotpoLogger.logMessage('Starting Yotpo Loyalty Order Export Step Job', 'debug', logLocation);

    try {
        Orders = ExportLoyaltyOrderModel.getQueuedOrderExportObjects();
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
        return Orders.count;
    }
    return 0;
}

/**
 * Gets the next Order object
 *
 * @return {Object} - Order Object to send to 'process' returns null when there are more objects to read
 */
function read() {
    if (Orders.hasNext()) {
        return Orders.next();
    }

    return null;
}

/**
 * Performs any calculations / formatting required
 *
 * @param {Object} OrderEventObject - Order Object to be processed
 * @return {Object} - OrderData to be sent to List for 'write' returns null if Order was skipped due to data errors
 */
function process(OrderEventObject) {
    var ExportLoyaltyOrderModel = require('*/cartridge/models/loyalty/export/exportLoyaltyOrderModel');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrders~process';

    stepOrdersProcessed++;
    chunkOrdersProcessed++;
    var OrderData;
    var OrderId;
    var OrderLocale = 'default'; // Overridden if specificed in the object

    try {
        if ('OrderID' in OrderEventObject.custom) {
            OrderId = OrderEventObject.custom.OrderID;
            if ('Payload' in OrderEventObject.custom && OrderEventObject.custom.Payload) {
                OrderData = JSON.parse(OrderEventObject.custom.Payload);
            } else {
                OrderData = ExportLoyaltyOrderModel.generateOrderExportPayload(OrderId);
                OrderEventObject.custom.Payload = JSON.stringify(OrderData); // eslint-disable-line
            }
        }
        if ('locale' in OrderEventObject.custom) {
            OrderLocale = OrderEventObject.custom.locale;
        }
    } catch (e) {
        YotpoLogger.logMessage(e, 'error', logLocation);
    }

    if (!empty(OrderData)) {
        return {
            OrderLocale: OrderLocale,
            OrderId: OrderId,
            OrderData: OrderData,
            OrderEventObject: OrderEventObject

        };
    }

    stepErrorCount++;
    chunkErrorCount++;
    if (!empty(OrderId)) {
        stepSkippedOrders.push(OrderId);
        chunkSkippedOrders.push(OrderId);
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
    var logLocation = 'exportOrders~write';
    for (var i = 0; i < events.length; i++) {
        if (events[i].OrderId) {
            YotpoLogger.logMessage('Writing Order payload to yotpo for Order: ' + events[i].OrderId, 'debug', logLocation);

            try {
                // Throws on error rather than returning status.
                ExportLoyaltyOrderModel.exportOrderByLocale(events[i].OrderData, events[i].OrderLocale);
                events[i].OrderEventObject.custom.Status = 'SUCCESS'; // eslint-disable-line
                events[i].OrderEventObject.custom.PayloadDeliveryDate = new Date(); // eslint-disable-line
                // Blank out the status Details in case this export had previously failed.
                events[i].OrderEventObject.custom.StatusDetails = ''; // eslint-disable-line
            } catch (errorDetails) {
                events[i].OrderEventObject.custom.Status = 'FAIL'; // eslint-disable-line
                events[i].OrderEventObject.custom.StatusDetails = 'Error Details: ' + errorDetails; // eslint-disable-line

                YotpoLogger.logMessage('Failed to write Order payload to yotpo for Order: ' + events[i].OrderId + ' Error: ' + errorDetails, 'error', logLocation);
            }
        } else {
            YotpoLogger.logMessage('Failed to write event, OrderId not found', 'error', logLocation);
        }
    }
}

/**
 * Makes log entries for Order processed in the chunk
 *
 * @param {boolean} success - flag for chunk status
 */
function afterChunk(success) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrders~afterChunk';
    var logMsg = '\n' + chunkErrorCount + ' Orders skipped out of ' + chunkOrdersProcessed + ' processed in this chunk';
    var orderErrorsMsg = 'The following Orders where excluded from export in this chunk due to data errors: \n' +
    chunkSkippedOrders.join('\n');

    if (success) {
        yotpoLogger.logMessage('Yotpo Order Export chunk completed successfully. \n ' + logMsg, 'debug', logLocation);
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
    var logMsg = '\n' + stepErrorCount + ' Orders skipped out of ' + stepOrdersProcessed + ' processed in this step \n' +
    'Total number of Orders to be exported: ' + getTotalCount();
    var OrdersErrorsMsg = 'The following Orders where excluded from export in this job execution due to data errors: \n' +
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
