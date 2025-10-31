'use strict';

/**
 * @module models/configurationexort/exportCartridgeConfigurationModel
 *
 * The model is used to export cartridge configuration data to Yotpo.
 */


/**
 * It validates that the config data is exportable for current locale in Yotop Configuration object.
 * It returns error if the mandatory data is missing. It will also indicate skipping config data feed for current
 * locale if the flag in configuration indicate so.
 *
 * @param {Object} yotpoConfiguration - The Yotpo configuration object all necessary configuration data.
 *
 * @returns {boolean} - The flag to indicate if the orders export should be skipped for current locale.
 */
function validateCartridgeConfigurationFeedConfigData(yotpoConfiguration) {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportCartridgeConfigurationModel~validateCartridgeConfigurationFeedConfigData';
    var currentLocaleID = yotpoConfiguration.custom.localeID;
    var processCurrentLocale = false;

    yotpoLogger.logMessage('Processing Locale ID - ' + currentLocaleID +
                '\n Order Feed Configuration', 'debug', logLocation);

    // Check if data in Custom Objects for locale and job is valid and contains required data
    var configValidationResult = YotpoConfigurationModel.validateMandatoryConfigData(yotpoConfiguration);
    if (!configValidationResult) {
        if (!configValidationResult) {
            yotpoLogger.logMessage('The current locale missing mandatory data therefore aborting the process.', 'error', logLocation);
        }
    } else {
        processCurrentLocale = true;
    }

    return processCurrentLocale;
}


/**
 * Used for pre-export validation of locale yotpo configuration
 *
 * @param {dw.util.List} yotpoConfigurations - List of yotpo configurations
 *
 * @returns {Object} localesToProcess - List of locales to export orders for
 */
function validateLocaleConfigData(yotpoConfigurations) {
    var Site = require('dw/system/Site');
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportCartridgeConfigurationModel~validateLocaleConfigData';
    var logHeader = '\n\n------- Yotpo Cartridge Configuration Data Feed Configuration Validation ---------\n' +
        'Current Site ID: ' + Site.getCurrent().getName() + '\n';
    var logFooter = '\n--------------------------------------------------------------\n\n';

    var totalConfigs = yotpoConfigurations.size();
    var siteLocales = Site.getCurrent().getAllowedLocales();
    var localesToProcess = [];
    var skippedLocales = siteLocales;

    var configurationCount = yotpoConfigurations.size();

    for (var i = 0; i < configurationCount; i++) {
        var config = yotpoConfigurations[i];
        var processLocale = validateCartridgeConfigurationFeedConfigData(config);
        if (processLocale) {
            localesToProcess.push(config.custom.localeID);
            skippedLocales.remove(config.custom.localeID);
        }
    }

    // Debug log output
    yotpoLogger.logMessage(logHeader +
        'Locales to be processed: \n - ' + localesToProcess.join('\n - ') +
        '\n Locales to be skipped: \n - ' + skippedLocales.join('\n - ')
        + logFooter, 'debug', logLocation);

    if (localesToProcess.length === 0) {
        // if no locales are being processed throw an error and stop the export job
        throw new Error(logHeader +
            constants.EXPORT_CARTRIDGE_CONFIG_NO_ENABLED_CONFIG_ERROR + ': Exiting Yotpo Cartridge Configuration Data Feed job. No locales have the Yotpo Purchase Feed enabled' +
            logFooter);
    } else if (localesToProcess.length < totalConfigs) {
        // Output message to error log for skipped locales
        yotpoLogger.logMessage(logHeader +
            'The following locales have been skipped in this cartridge configuration export job execution because the configuration is invalid: \n - ' +
            skippedLocales.join('\n - ') + '\n' +
            'Continuing with processing the following locales: \n - ' +
            localesToProcess.join('\n - ') + '\n' +
            logFooter, 'error', logLocation);
    }

    return localesToProcess;
}

/**
 * This function sends the cartridge configuration information to Yotpo. It makes HTTPS request, reads the response, and logs it.
 * It returns an error in case of some problem in submission.
 *
 * @param {Object} requestData - Object structure for config export request. Gets converted to JSON
 * @param {string} locale - Locale ID
 * @param {boolean} shouldGetNewToken - Optional flag to retry auth request and save new token in Custom Object
 *
 * @returns {boolean} authenticationError : The flag to indicate if the error was due to Authentication failure.
 */
function sendConfigDataToYotpo(requestData, locale, shouldGetNewToken) {
    var makeRequestForNewToken = shouldGetNewToken || false;

    var constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var exportCartridgeConfigurationServiceRegistry = require('*/cartridge/scripts/serviceregistry/exportCartridgeConfigurationServiceRegistry');
    var logLocation = 'exportCartridgeConfigurationModel~sendConfigDataToYotpo';

    var authenticationError = false;

    try {
        var requestJson = JSON.stringify(requestData);
        var result = exportCartridgeConfigurationServiceRegistry.yotpoExportCartridgeConfigSvc.call(requestJson);
        var responseStatus = this.parseYotpoResponse(result);
        authenticationError = responseStatus.authenticationError;

        if (!responseStatus.success) {
            if (responseStatus.serviceError) {
                this.serviceTimeouts++;

                if (this.serviceTimeouts <= constants.SERVICE_MAX_TIMEOUTS) {
                    yotpoLogger.logMessage('Retrying cartridge config submission due to service error \n' +
                    ' Error code: ' + result.error + '\n' +
                    ' Error Text is: ' + result.errorMessage, 'error', logLocation);
                    this.sendConfigDataToYotpo(requestData, locale, false);
                } else {
                    var serviceErrorMsg = constants.EXPORT_CARTRIDGE_CONFIG_RETRY_ERROR + ': Cartridge config data submission aborted due to repeated service errors \n' +
                    ' Number of attempts: ' + this.serviceTimeouts;
                    yotpoLogger.logMessage(serviceErrorMsg, 'error', logLocation);
                    // If the error persist then we should terminate here
                    throw new Error(serviceErrorMsg);
                }
            } else if (responseStatus.authenticationError && makeRequestForNewToken) {
                yotpoLogger.logMessage('Retrying Cartridge Config Data submission due to service authentication error', 'error', logLocation);
                var yotpoConfiguration = YotpoConfigurationModel.loadYotpoConfigurationsByLocale(locale);
                var ExportOrderModel = require('*/cartridge/models/orderexport/exportOrderModel');
                var exportOrderModelInstance = new ExportOrderModel();
                var utokenAuthCode = exportOrderModelInstance.getServiceAuthToken(yotpoConfiguration);
                var retryAuthenticationError = true;
                if (!empty(utokenAuthCode)) {
                    exportOrderModelInstance.saveCustomObjectData(yotpoConfiguration, 'utokenAuthCode', utokenAuthCode);
                    var updatedRequestData = exportOrderModelInstance.updateUTokenInRequestData(utokenAuthCode, requestData);
                    // retry export
                    retryAuthenticationError = this.sendConfigDataToYotpo(updatedRequestData, locale, false);
                }

                // If the error persist then we should terminate here
                if (retryAuthenticationError) {
                    var authErrorMsg = constants.EXPORT_CARTRIDGE_CONFIG_RETRY_ERROR + ': Cartridge Config Data submission aborted due to repeated authorization errors \n' +
                    ' Number of attempts: 2';
                    yotpoLogger.logMessage(authErrorMsg, 'error', logLocation);
                    throw new Error(authErrorMsg);
                }
            } else if (responseStatus.unknownError) {
                // Some other error occurred we should terminate here
                throw new Error(constants.EXPORT_CARTRIDGE_CONFIG_ERROR + ': An unknown error occurred while attempting to communicate with the Yotpo service');
            }
        }
    } catch (e) {
        yotpoLogger.logMessage('Error occurred while trying to send cartridge config data - ' + e, 'error', logLocation);
        throw e;
    }

    return authenticationError;
}

/**
 * Parses service response and sets appropriate log entries
 *
 * @param {dw.svc.Result} result - Service request response
 *
 * @returns {Object} - Contains success, authenticationError, serviceError, & unknownError flags
 */
function parseYotpoResponse(result) {
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportCartridgeConfigurationModel~parseYotpoResponse';
    var responseStatusCode;
    try {
        responseStatusCode = !empty(result.object) ? JSON.parse(result.object).status.code : result.error;
    } catch (e) {
        responseStatusCode = result.error;
    }

    var status = {
        success: false,
        authenticationError: false,
        serviceError: false,
        unknownError: false
    };

    switch (String(responseStatusCode)) {
        case constants.STATUS_200 :
            yotpoLogger.logMessage('Config info submitted successfully.', 'debug', logLocation);
            status.success = true;
            break;
        case constants.STATUS_401 :
            yotpoLogger.logMessage('The request to relay config info failed authentication. ' +
            ' Error code: ' + result.error + '\n' +
            ' Error Text is: ' + result.msg + ': ' + result.errorMessage, 'error', logLocation);
            status.authenticationError = true;
            break;
        case constants.STATUS_500 :
            yotpoLogger.logMessage('The request to relay config info encountered an Internal Server Error e.g. Timeout. ' +
            ' Error code: ' + result.error + '\n' +
            ' Error Text is: ' + result.errorMessage, 'error', logLocation);
            status.serviceError = true;
            break;
        default :
            yotpoLogger.logMessage('The request to relay config info failed for an unknown reason. Error: ' + result.error + '\n' +
            ' Error Text is: ' + result.errorMessage, 'error', logLocation);
            status.unknownError = true;
    }

    return status;
}

/**
 * Exports
 */
function ExportCartridgeConfigurationModel() {
    this.serviceTimeouts = 0;
    this.sendConfigDataToYotpo = sendConfigDataToYotpo;
    this.validateLocaleConfigData = validateLocaleConfigData;
    this.parseYotpoResponse = parseYotpoResponse;
}

module.exports = ExportCartridgeConfigurationModel;
