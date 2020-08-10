'use strict';

/**
 * @module scripts/utils/yotpoConfigurationModel
 *
 * This script provides functions related to Yotpo configuration shared across other Yotpo scripts.
 * Reused script components for Yotpo are contained here.
 */


/**
 * This is a common function to check whether the Yotpo cartridge is enabled.
 * @returns {boolean} boolean
 */
function isCartridgeEnabled() {
    var Site = require('dw/system/Site');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'yotpoConfigurationModel~isCartridgeEnabled';
    var yotpoCartridgeEnabled = Site.getCurrent().getCustomPreferenceValue('yotpoCartridgeEnabled');

    if (!yotpoCartridgeEnabled) {
        yotpoLogger.logMessage('The Yotpo cartridge is disabled, please check custom preference (yotpoCartridgeEnabled).', 'info', logLocation);
    }

    return yotpoCartridgeEnabled;
}

/**
 * Retrieves the yotpo configuration Custom Object for current locale.
 * @param {string} currentLocaleID - current locale id
 * @param {string} logLocation - location for log messages
 * @returns {Object} if configuraton CO exists for the locale
 */
function getYotpoConfigurationCOForCurrentLocale(currentLocaleID, logLocation) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    if (empty(currentLocaleID)) {
        yotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return null;
    }

    yotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        yotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return null;
    }
    return yotpoConfiguration;
}

/**
 * Calculates yotpo config based on custom object settings, and caches
 * this config onto the session, so that the config is not repeatedly
 * recalculated when a customer is viewing uncached pages.
 * @param {string} locale current locale id
 * @returns {Object} The yotpo configurations overrides.
 */
function setYotpoConfigOverrides(locale) {
    var Site = require('dw/system/Site');
    var URLUtils = require('dw/web/URLUtils');
    var currSite = Site.getCurrent();
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');

    var logLocation = 'yotpoConfigurationModel~setYotpoConfig';

    /**
     * List of attributes that can be overridden via the custom object.
     * The custom object attribute MUST match the site preference name.
     */
    var yotpoConfig = {
        locale: locale,

        enableReviews: currSite.getCustomPreferenceValue('enableReviews') || false,
        isReviewsEnabled: currSite.getCustomPreferenceValue('enableReviews') || false,

        enableRatings: currSite.getCustomPreferenceValue('enableRatings') || false,
        isRatingsEnabled: currSite.getCustomPreferenceValue('enableRatings') || false,

        productInformationFromMaster: currSite.getCustomPreferenceValue('productInformationFromMaster') || false,

        yotpoLoyaltyEnabled: currSite.getCustomPreferenceValue('yotpoLoyaltyEnabled') || false,
        isLoyaltyEnabled: currSite.getCustomPreferenceValue('yotpoLoyaltyEnabled') || false,

        yotpoLoyaltyEnableOrderFeed: currSite.getCustomPreferenceValue('yotpoLoyaltyEnableOrderFeed') || false,
        isLoyaltyOrderFeedEnabled: currSite.getCustomPreferenceValue('yotpoLoyaltyEnableOrderFeed') || false,

        yotpoLoyaltyEnableCustomerFeed: currSite.getCustomPreferenceValue('yotpoLoyaltyEnableCustomerFeed') || false,
        isLoyaltyCustomerFeedEnabled: currSite.getCustomPreferenceValue('yotpoLoyaltyEnableCustomerFeed') || false,

        yotpoLoyaltyGUID: currSite.getCustomPreferenceValue('yotpoLoyaltyGUID') || '',
        yotpoLoyaltyAPIKey: currSite.getCustomPreferenceValue('yotpoLoyaltyAPIKey') || '',
        yotpoLoyaltyStaticContentURL: currSite.getCustomPreferenceValue('yotpoLoyaltyStaticContentURL') || currSite.getCustomPreferenceValue('yotpoSwellStaticContentURL') || '',
        domainAddress: URLUtils.home()
    };

    if (isCartridgeEnabled()) {
        // This will return 'default' if we dont have a locale.
        var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
        var currentLocaleID = yotpoUtils.getCurrentLocaleSFRA(locale);
        var localeConfigObject = getYotpoConfigurationCOForCurrentLocale(currentLocaleID);

        // No config found for our specific locale, try the default.
        if (!localeConfigObject && currentLocaleID !== 'default') {
            localeConfigObject = getYotpoConfigurationCOForCurrentLocale('default');
            yotpoLogger.logMessage('Yotpo configuration not found for locale, falling back to default.', 'debug', logLocation);
        }

        if (!localeConfigObject) {
            yotpoLogger.logMessage('Yotpo configuration not found. Using site prefs as defaults.', 'debug', logLocation);
        } else {
            if ('localeID' in localeConfigObject.custom) {
                yotpoConfig.localeID = localeConfigObject.custom.localeID;
            }
            if ('appKey' in localeConfigObject.custom) {
                yotpoConfig.appKey = localeConfigObject.custom.appKey;
            }
            if ('clientSecretKey' in localeConfigObject.custom) {
                yotpoConfig.clientSecretKey = localeConfigObject.custom.clientSecretKey;
            }
            if ('utokenAuthCode' in localeConfigObject.custom) {
                yotpoConfig.utokenAuthCode = localeConfigObject.custom.utokenAuthCode;
            }
            if ('enableReviews' in localeConfigObject.custom) {
                yotpoConfig.enableReviews = yotpoConfig.isReviewsEnabled = localeConfigObject.custom.enableReviews;
            }
            if ('enableRatings' in localeConfigObject.custom) {
                yotpoConfig.enableRatings = yotpoConfig.isRatingsEnabled = localeConfigObject.custom.enableRatings;
            }
            if ('enablePurchaseFeed' in localeConfigObject.custom) {
                yotpoConfig.enablePurchaseFeed = localeConfigObject.custom.enablePurchaseFeed;
            }
            if ('productInformationFromMaster' in localeConfigObject.custom) {
                yotpoConfig.productInformationFromMaster = localeConfigObject.custom.productInformationFromMaster;
            }
            if ('yotpoLoyaltyEnabled' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyEnabled = yotpoConfig.isLoyaltyEnabled = localeConfigObject.custom.yotpoLoyaltyEnabled;
            }
            if ('yotpoLoyaltyEnableOrderFeed' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyEnableOrderFeed = yotpoConfig.isLoyaltyOrderFeedEnabled = localeConfigObject.custom.yotpoLoyaltyEnableOrderFeed;
            }
            if ('yotpoLoyaltyEnableCustomerFeed' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyEnableCustomerFeed = yotpoConfig.isLoyaltyCustomerFeedEnabled = localeConfigObject.custom.yotpoLoyaltyEnableCustomerFeed;
            }
            if ('yotpoLoyaltyGUID' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyGUID = localeConfigObject.custom.yotpoLoyaltyGUID;
            }
            if ('yotpoLoyaltyAPIKey' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyAPIKey = localeConfigObject.custom.yotpoLoyaltyAPIKey;
            }
            // Fallback to previous cartridge attribute names
            if (empty(yotpoConfig.yotpoLoyaltyGUID) && 'swellGUID' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyGUID = localeConfigObject.custom.swellGUID;
            }
            if (empty(yotpoConfig.yotpoLoyaltyAPIKey) && 'swellAPIKey' in localeConfigObject.custom) {
                yotpoConfig.yotpoLoyaltyAPIKey = localeConfigObject.custom.swellAPIKey;
            }
        }
    }

    session.privacy.yotpoConfigOverrides = JSON.stringify(yotpoConfig);
    return yotpoConfig;
}

/**
 * It loads configuration data for Yotpo module based on locale.
 * If the config cannot be found in the session it will build it
 * and then save it to the session
 * @param {string} locale - current locale id
 * @returns {Object} a JSON object of the yotpo configurations.
 */
function getYotpoConfig(locale) {
    if (!session || !session.privacy || !session.privacy.yotpoConfig) {
        return setYotpoConfigOverrides(locale);
    }
    return JSON.parse(session.privacy.yotpoConfigOverrides);
}

/** legacy versions of this module used different names for some prefs.  Map those to our newer names
 * @param {string} pref - The preference to check for legacy names
 * @returns {string} - the name that matches current standards.
*/
function lookupLegacyPref(pref) {
    if (pref === 'isReviewsEnabled') {
        return 'enableReviews';
    }
    if (pref === 'isRatingsEnabled') {
        return 'enableRatings';
    }
    return pref;
}

/**
 * Get a preference value using yotpo override options.  Yotpo allows some site preference values
 * to be overridden via a site scoped custom object.
 * @param {string} pref - Preference to be queried.
 * @param {string} locale - current locale id
 * @returns {Object} Site pref value
 */
function getYotpoPref(pref, locale) {
    var Site = require('dw/system/Site');
    if (!isCartridgeEnabled()) { return null; }

    var overrides = getYotpoConfig(locale);
    var safePref = lookupLegacyPref(pref);
    if (overrides[safePref] != null) {
        return overrides[safePref];
    }
    return Site.getCurrent().getCustomPreferenceValue(safePref);
}

/**
 * Validates the mandatory data related to order feed job configuration
 * @param {Object} orderFeedJobLastExecutionDateTime - last job execution time
 * @returns {boolean} boolean true if required job configurations are present
 */
function validateOrderFeedJobConfiguration(orderFeedJobLastExecutionDateTime) {
    if (empty(orderFeedJobLastExecutionDateTime)) {
        return false;
    }
    return true;
}


/**
 * Gets locale from current request and retrieves app key from config object
 *
 * @param {dw.system.Request} request - current request object
 *
 * @returns {string} appKey - App key from locale configuration
 */
function getAppKeyForCurrentLocaleFromRequest(request) {
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var currentLocaleID = yotpoUtils.getCurrentLocaleFromRequest(request);
    var appKey = getYotpoPref('appKey', currentLocaleID);
    return appKey;
}

/**
 * This function is used to validate that the api key of the incoming request
 * to the custom endpoints matches the api key stored in the Yotpo configuration
 *
 * @param {string} loyaltyApiKey : The Loyalty API key to be validated
 * @param {string} locale : The locale
 *
 * @return {boolean} valid - Returns true if matching API Key is found otherwise false
 */
function validateLoyaltyApiKey(loyaltyApiKey, locale) {
    var valid = false;
    if (!empty(loyaltyApiKey)) {
        var yotpoLoyaltyApiKey = getYotpoPref('yotpoLoyaltyAPIKey', locale);
        valid = !empty(yotpoLoyaltyApiKey) && yotpoLoyaltyApiKey === loyaltyApiKey;
    }
    return valid;
}

/**
 * Fetch and validate loyalty API keys
 * @param {*} locale locale to use for possible config override object lookup
 * @returns {Object} Object containing api key and guid for given locale/site.
 */
function getLoyaltyAPIKeys(locale) {
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'yotpoConfigurationModel~getLoyaltyAPIKeys';
    var keyLocale = locale || 'default';

    var key = getYotpoPref('yotpoLoyaltyAPIKey', keyLocale);
    if (!key) {
        YotpoLogger.logMessage('Failed to load Yotpo Loyalty API Key', 'error', logLocation);
        return null;
    }
    var guid = getYotpoPref('yotpoLoyaltyGUID', keyLocale);
    if (!guid) {
        YotpoLogger.logMessage('Failed to load Yotpo Loyalty Guid', 'error', logLocation);
        return null;
    }
    return {
        key: key,
        guid: guid
    };
}


/**
 * Validates the mandatory configs in yotpoConfiguration, it returns false required fields are missing.
 * @param {Object} yotpoConfiguration - yotpo configuration object
 * @returns {boolean} True if required configuration keys are present in the config object
 */
function validateMandatoryConfigData(yotpoConfiguration) {
    var appKey = yotpoConfiguration.custom.appKey;
    var clientSecretKey = yotpoConfiguration.custom.clientSecretKey;

    if (empty(appKey) || empty(clientSecretKey)) {
        return false;
    }

    return true;
}

/**
 * Reads the Yotpo configurations from Custom Objects.
 * @returns {dw.util.List} YotpoConfigurationList - The list of CustomObject holding Yotpo configurations.
 */
function loadAllYotpoConfigurations() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var constants = require('*/cartridge/scripts/utils/constants');

    var logLocation = 'yotpoConfigurationModel~loadAllYotpoConfigurations';

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

    var logLocation = 'yotpoConfigurationModel~loadYotpoConfigurationsByLocale';
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

    var logLocation = 'yotpoConfigurationModel~loadYotpoJobConfigurations';

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


exports.getAppKeyForCurrentLocaleFromRequest = getAppKeyForCurrentLocaleFromRequest;
exports.isCartridgeEnabled = isCartridgeEnabled;
exports.validateMandatoryConfigData = validateMandatoryConfigData;
exports.validateOrderFeedJobConfiguration = validateOrderFeedJobConfiguration;
exports.validateLoyaltyApiKey = validateLoyaltyApiKey;
exports.getYotpoPref = getYotpoPref;
exports.getLoyaltyAPIKeys = getLoyaltyAPIKeys;
exports.getYotpoConfig = getYotpoConfig;
exports.loadAllYotpoConfigurations = loadAllYotpoConfigurations;
exports.loadYotpoJobConfigurations = loadYotpoJobConfigurations;
exports.loadYotpoConfigurationsByLocale = loadYotpoConfigurationsByLocale;
