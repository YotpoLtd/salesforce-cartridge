'use strict';

const Status = require('dw/system/Status');

/**
 * Yotpo.ExportCartridgeConfiguration checks the cartridge version in constants.js.
 *
 * @param {Object} parameters - parameters passed in from job config (NOT USED)
 * @param {dw.job.JobStepExecution} stepExecution - job step execution from step job
 *
 * @returns {dw/system/Status} returnStatus
 */
function exportCartridgeConfiguration(parameters, stepExecution) { // eslint-disable-line no-unused-vars
    var returnStatus = new Status(Status.ERROR);
    var constants = require('*/cartridge/scripts/utils/constants');
    var ExportOrderModel = require('*/cartridge/models/orderexport/exportOrderModel');
    var exportOrderModelInstance = new ExportOrderModel();

    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var ExportCartridgeConfigurationModel = require('*/cartridge/models/configurationexport/exportCartridgeConfigurationModel');
    var ExportCartridgeConfigurationModelInstance = new ExportCartridgeConfigurationModel();

    var localesToProcess;
    try {
        // Get locale and job Custom Objects used for configuration
        var yotpoConfigurations = exportOrderModelInstance.loadAllYotpoConfigurations();
        localesToProcess = ExportCartridgeConfigurationModelInstance.validateLocaleConfigData(yotpoConfigurations);

        var cartridgeConfig = {};
        cartridgeConfig.metadata = {
            platform: constants.PLATFORM_FOR_YOTPO_DATA,
            plugin_version: constants.YOTPO_CARTRIDGE_VERSION
        };

        var totalLocales = localesToProcess.length;
        var isAnyErrorOccured = false;
        for (var i = 0; i < totalLocales; i++) {
            var currLocale = localesToProcess[i];
            var yotpoConfig = YotpoConfigurationModel.getYotpoConfig(currLocale);
            cartridgeConfig.app_key = yotpoConfig.appKey;
            cartridgeConfig.utoken = yotpoConfig.utokenAuthCode;
            var isErrorReported = ExportCartridgeConfigurationModelInstance.sendConfigDataToYotpo(cartridgeConfig, currLocale, true);
            isAnyErrorOccured = isAnyErrorOccured || isErrorReported;
        }
        if (isAnyErrorOccured) {
            returnStatus = new Status(Status.ERROR);
        } else {
            returnStatus = new Status(Status.OK);
        }
    } catch (e) {
        returnStatus = new Status(Status.ERROR, e.message);
    }

    return returnStatus;
}

exports.exportCartridgeConfiguration = exportCartridgeConfiguration;
