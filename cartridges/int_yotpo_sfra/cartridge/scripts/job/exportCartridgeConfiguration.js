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
function exportCartridgeConfiguration(parameters, stepExecution) {
    var returnStatus = new Status(Status.OK);
    var jobExecution = stepExecution.getJobExecution();
    var jobContext = jobExecution.getContext();
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

        var cartridgeConfig = {
            platform: constants.PLATFORM_FOR_YOTPO_DATA,
            plugin_version: constants.YOTPO_CARTRIDGE_VERSION
        };

        var totalLocales = localesToProcess.length;
        for (var i = 0; i < 1; i++) {
            var currLocale = localesToProcess[i];
            var yotpoConfig = YotpoConfigurationModel.getYotpoConfig(currLocale);
            var yotpoAppKey = yotpoConfig.appKey;
            var response = ExportCartridgeConfigurationModelInstance.sendConfigDataToYotpo(cartridgeConfig, yotpoAppKey, currLocale, false);
        }
    } catch (e) {
        throw new Error(e);
    }

    return returnStatus;
}

exports.exportCartridgeConfiguration = exportCartridgeConfiguration;
