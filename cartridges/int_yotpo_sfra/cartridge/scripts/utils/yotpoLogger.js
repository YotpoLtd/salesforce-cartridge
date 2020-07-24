'use strict';

/**
 * @module scripts/utils/yotpoLogger
 *
 * This is a common script used for Logging purpose.
 * The log is written based on message type like debug, info or error.
 */

/**
 * This is a custom logger to log messages of all severities .
 * @param {string} message : message to be logged
 * @param {string} severityLevel : level of message
 * @param {string} logLocation : location of class when error occurred.
 */
function logMessage(message, severityLevel, logLocation) {
    var Site = require('dw/system/Site');
    var Logger = require('dw/system/Logger');

    var loggerClass = 'int_yotpo_sfra';

    switch (severityLevel) {
        case 'debug' :
            var yotpoDebugLogEnabled = Site.getCurrent().getPreferences().custom.yotpoDebugLogEnabled;
            if (yotpoDebugLogEnabled) {
                Logger.getLogger(loggerClass).debug(logLocation + ' : ' + message);
            }
            break;

        case 'info' :
            var yotpoInfoLogEnabled = Site.getCurrent().getPreferences().custom.yotpoInfoLogEnabled;
            if (yotpoInfoLogEnabled) {
                Logger.getLogger(loggerClass).info(logLocation + ' : ' + message);
            }
            break;

        case 'error' :
            Logger.getLogger(loggerClass).error(logLocation + ' : ' + message);
            break;
        default: // default case to fix eslint error
    }
}

exports.logMessage = logMessage;
