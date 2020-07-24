'use strict';

/**
 * @module scripts/common/commonModel
 *
 * Contains common funcions used elesewhere in the yotpo cartridge
 */

/**
 * Reads the Yotpo configurations from Custom Objects.
 * @returns {dw.util.List} YotpoConfigurationList - The list of CustomObject holding Yotpo configurations.
 */
function loadAllYotpoConfigurations() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var constants = require('*/cartridge/scripts/utils/constants');

    var logLocation = 'commonModel~loadAllYotpoConfigurations';

    var yotpoConfigurations = CustomObjectMgr.getAllCustomObjects(constants.YOTPO_CONFIGURATION_OBJECT);

    if (yotpoConfigurations == null || !yotpoConfigurations.hasNext()) {
        yotpoLogger.logMessage('The Yotpo configuration does not exist, therefore cannot proceed further.', 'error', logLocation);
        throw constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    yotpoLogger.logMessage('Yotpo Configurations count - ' + yotpoConfigurations.count, 'debug', logLocation);

    var yotpoConfigurationList = yotpoConfigurations.asList();
    yotpoConfigurations.close();// closing list...

    return yotpoConfigurationList;
}

/**
 * Loads the Yotpo configuration by locale ID from Custom Objects.
 * @param {string} localeID - current locale id
 * @returns {Object} Yotpo configuration object for the locale
 */
function loadYotpoConfigurationsByLocale(localeID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var constants = require('*/cartridge/scripts/utils/constants');

    var logLocation = 'commonModel~loadYotpoConfigurationsByLocale';
    var yotpoConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_CONFIGURATION_OBJECT, localeID);

    if (yotpoConfiguration == null) {
        yotpoLogger.logMessage('The Yotpo configuration does not exist for Locale, cannot proceed further. Locale ID is: ' + localeID, 'error', logLocation);
        throw constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    return yotpoConfiguration;
}

/**
 * Reads the Yotpo job configurations custom object to retrieve last execution time
 * @returns {Object} - Contains the last execution and current date time.
 */
function loadYotpoJobConfigurations() {
    var Calendar = require('dw/util/Calendar');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var constants = require('*/cartridge/scripts/utils/constants');

    var logLocation = 'commonModel~loadYotpoJobConfigurations';

    var yotpoJobConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    if (yotpoJobConfiguration == null) {
        try {
            require('dw/system/Transaction').wrap(function () {
                yotpoJobConfiguration = CustomObjectMgr.createCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);
                yotpoJobConfiguration.custom.orderFeedJobLastExecutionDateTime = new Date(0);
            });
        } catch (e) {
            var errorMessage = 'Could not create job configuration custom object. Please check that custom object meta data has been imported.';
            yotpoLogger.logMessage(errorMessage + ' Error: ' + e, 'error', logLocation);
            // The job can't continue if this fails, so throw an error that will be shown in the job log.
            throw new Error(errorMessage);
        }
    }

    var orderFeedJobLastExecutionTime = yotpoJobConfiguration.custom.orderFeedJobLastExecutionDateTime;
    var helperCalendar = new Calendar();
    var currentDateTime = helperCalendar.getTime();

    return {
        orderFeedJobLastExecutionTime: orderFeedJobLastExecutionTime,
        currentDateTime: currentDateTime
    };
}

exports.loadAllYotpoConfigurations = loadAllYotpoConfigurations;
exports.loadYotpoJobConfigurations = loadYotpoJobConfigurations;
exports.loadYotpoConfigurationsByLocale = loadYotpoConfigurationsByLocale;
