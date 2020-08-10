'use strict';

const Status = require('dw/system/Status');

/**
 * Checks Yotpo.ExportOrdersJson step to see if it returned any errors.
 * If so this should return an error status to surface the error in the
 * job history in the Business Manager
 *
 * @param {Object} parameters - parameters passed in from job config (NOT USED)
 * @param {dw.job.JobStepExecution} stepExecution - job step execution from step job
 *
 * @returns {dw/system/Status} returnStatus
 */
function checkForAndSurfaceErrors(parameters, stepExecution) {
    var returnStatus = new Status(Status.OK);
    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();

    if (jobContext.displayErrorInBm === true) {
        returnStatus = new Status(Status.ERROR);
    }

    return returnStatus;
}

exports.checkForAndSurfaceErrors = checkForAndSurfaceErrors;
