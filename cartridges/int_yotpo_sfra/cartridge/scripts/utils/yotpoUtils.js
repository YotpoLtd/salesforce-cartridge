'use strict';

/**
 * @module scripts/utils/yotpoUtils
 *
 * This script provides utility functions shared across other Yotpo scripts.
 * Reused script components for Yotpo are contained here.
 */

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
 * Retrieves the appKey based on the current locale
 * @param {string} currentLocaleID - current locale id
 * @returns {string} yotpo appKey
 */
function getAppKeyForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('./constants');
    var yotpoLogger = require('./yotpoLogger');

    var logLocation = 'yotpoUtils~getAppKeyForCurrentLocale';

    if (empty(currentLocaleID)) {
        yotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return '';
    }

    yotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        yotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return '';
    }

    var appKey = yotpoConfiguration.custom.appKey;

    if (empty(appKey)) {
        yotpoLogger.logMessage('The app key couldnt found for current locale.', 'error', logLocation);
    }

    return appKey;
}

/**
 * Retrieves the current locale from request, if not found then revert to 'default' locale.
 * @param {Object} request - request object
 * @returns {string} current locale id
 */
function getCurrentLocale(request) {
    var currentLocaleID = request.getLocale();

    if (empty(currentLocaleID)) {
        currentLocaleID = request.getHttpLocale();
    }

    if (empty(currentLocaleID)) {
        currentLocaleID = 'default';
    }

    return currentLocaleID;
}

/**
 * Gets locale from current request and retrieves app key from config object
 *
 * @param {dw.system.Request} request - current request object
 *
 * @returns {string} appKey - App key from locale configuration
 */
function getAppKeyForCurrentLocaleFromRequest(request) {
    var currentLocaleID = getCurrentLocale(request);
    var appKey = getAppKeyForCurrentLocale(currentLocaleID);
    return appKey;
}

/**
 * Retrieves the current locale from request for SFRA sites, if not found then revert to 'default' locale.
 * @param {string} currentLocaleID - current locale id
 * @returns {string} localeID
 */
function getCurrentLocaleSFRA(currentLocaleID) {
    var localeID = currentLocaleID;

    if (empty(localeID) || localeID === 'undefined') {
        localeID = 'default';
    }

    return localeID;
}

/**
 * Retrieves if the reviews are enabled for current locale.
 * @param {string} currentLocaleID - current locale id
 * @returns {boolean} true if reviews are enabled for the locale
 */
function isReviewsEnabledForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('./constants');
    var yotpoLogger = require('./yotpoLogger');

    var logLocation = 'yotpoUtils~isReviewsEnabledForCurrentLocale';

    if (empty(currentLocaleID)) {
        yotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return false;
    }

    yotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        yotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return false;
    }

    var reviewsEnabled = yotpoConfiguration.custom.enableReviews;
    return reviewsEnabled;
}

/**
 * Retrieves if the ratings are enabled for current locale.
 * @param {string} currentLocaleID - current locale id
 * @returns {boolean} true if ratings are enabled for the locale
 */
function isRatingEnabledForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('./constants');
    var yotpoLogger = require('./yotpoLogger');

    var logLocation = 'yotpoUtils~isRatingsEnabledForCurrentLocale';

    if (empty(currentLocaleID)) {
        yotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return false;
    }

    yotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        yotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return false;
    }

    return yotpoConfiguration.custom.enableRatings;
}

/**
 * This function escapes specific characters from the text based on the regular expression.
 * @param {string} text - string to be escaped
 * @param {string} regex - regular expression
 * @param {string} replacement - replacement character
 * @returns {string} escapedText
 */
function escape(text, regex, replacement) {
    if (!text) {
        return text;
    }

    var regExp = new RegExp(regex, 'gi');
    var escapedText = text.replace(regExp, replacement);
    return escapedText;
}

/**
 * Validates given email address based on RFC 5322 Official Standard regex
 * @param {string} emailAddress email address to validate
 * @returns {boolean} true if email is valid based on regex
 */
function validateEmailAddress(emailAddress) {
    return require('./constants').EMAIL_VALIDATION_REGEX_FOR_YOTPO_DATA.test(emailAddress);
}

/**
* This functions return the large image of a product.
* @param {dw.catalog.Product} product - SFCC API Product object to retrieve image from.
* @returns {string} imageURL
*/
function getImageLink(product) {
    var imageURL = '';

    if (!empty(product)) {
        var image = product.getImage('large', 0);
        if (!empty(image)) {
            imageURL = image.getAbsURL();
        }
    }

    return imageURL;
}

/**
 * Retrieves given product's large image and encodes the URI.
 * Returns 'Image not available' is image URL is empty
 *
 * @param {dw.catalog.Product} product - SFCC API Product object to retrive image url from
 * @returns {string} imageURL
 */
function getProductImageUrl(product) {
    var imageURL = encodeURI(getImageLink(product));
    imageURL = empty(imageURL) ? 'Image not available' : imageURL;
    return imageURL;
}

/**
 * Trims and replaces chars in a given string based on passed 'type' which
 * either points to a predefined set of safe chars & chars to replace or is the regex to use
 * @param {string} text - string to be cleaned
 * @param {string} type - type of regex to use defined in constants or custom regex string
 * @param {string} replacement - Optional string to replace cleaned chars with
 * @param {string} safeChars - Optional additional charters to be allowed
 * @returns {string} input test after cleaning
 */
function cleanDataForExport(text, type, replacement, safeChars) {
    var constants = require('./constants');

    var defaultedReplacement = replacement || '';
    var defaultedSafeChars = safeChars || '';
    var regEx;

    var defaultedText = !empty(text) ? text.trim() : '';

    if (type) {
        switch (type) {
            case 'product' :
                regEx = constants.REGEX_BASE_FOR_YOTPO_DATA;
                defaultedSafeChars = constants.REGEX_FOR_YOTPO_DATA_SAFE_SPECIAL_CHARS + defaultedSafeChars;
                break;
            case 'product-id' :
                regEx = constants.REGEX_BASE_FOR_YOTPO_DATA;
                defaultedSafeChars = constants.REGEX_FOR_YOTPO_PRODUCT_ID_DATA_SAFE_SPECIAL_CHARS + defaultedSafeChars;
                break;
            case 'order' :
                regEx = constants.REGEX_BASE_FOR_YOTPO_DATA;
                defaultedSafeChars = constants.REGEX_FOR_YOTPO_DATA_SAFE_SPECIAL_CHARS + defaultedSafeChars;
                break;
            case 'email' :
                regEx = constants.EMAIL_REGEX_FOR_YOTPO_DATA;
                break;
            default :
                regEx = type;
                break;
        }
        regEx = '([' + regEx + defaultedSafeChars + ']+)';
        defaultedText = escape(defaultedText, regEx, defaultedReplacement);
    }

    return defaultedText;
}

/**
 * Applies constants.DATE_FORMAT_FOR_YOTPO_DATA to format passed date time
 * ex: yyyy-MM-dd (2019-7-28)
 * @param {Date} dateTime SFCC date object for formatting
 * @returns {string} formatted date/time
 */
function formatDateTime(dateTime) {
    var constants = require('./constants');
    var Calendar = require('dw/util/Calendar');
    var StringUtils = require('dw/util/StringUtils');

    return StringUtils.formatCalendar(new Calendar(dateTime), constants.DATE_FORMAT_FOR_YOTPO_DATA);
}

/**
 * Takes properties of an object and store them in another object
 * overriding previous values if necessary
 *
 * @param {Object} obj - Object to be merged into
 * @param {Object} src - Object to merge from
 *
 * @return {Object} - Merged object
 */
function extendObject(obj, src) {
    var mergedObj = obj;

    Object.keys(src).forEach(function (key) {
        mergedObj[key] = src[key];
    });

    return mergedObj;
}

/**
* This functions return the primary category path of a product.
* @param {Object} product - product object to get category path from.
* @param {string} separator - category path separator or null
* @returns {string} categoryPath
*/
function getCategoryPath(product, separator) {
    var categoryPath = '';
    var topProduct = product;

    if (topProduct.isVariant()) {
        topProduct = product.getVariationModel().master;
    }

    var theCategory = topProduct.getPrimaryCategory();

    if (empty(theCategory)) {
        var categories = topProduct.categories;
        if (!empty(categories)) {
            theCategory = categories[0];
        }
    }

    var cat = theCategory;
    var path = [];

    while (cat.parent != null) {
        if (cat.online) {
            path[0] = cat.getDisplayName();
        }
        cat = cat.parent;
    }

    categoryPath = separator ? path.join(separator) : path.join();
    return categoryPath;
}

/**
 * This is a common function to check whether the Yotpo cartridge is enabled.
 * @returns {boolean} boolean
 */
function isCartridgeEnabled() {
    var Site = require('dw/system/Site');
    var yotpoLogger = require('./yotpoLogger');

    var logLocation = 'yotpoUtils~isCartridgeEnabled';
    var yotpoCartridgeEnabled = Site.getCurrent().getPreferences().custom.yotpoCartridgeEnabled;

    if (!yotpoCartridgeEnabled) {
        yotpoLogger.logMessage('The Yotpo cartridge is disabled, please check custom preference (yotpoCartridgeEnabled).', 'info', logLocation);
    }

    return yotpoCartridgeEnabled;
}

exports.escape = escape;
exports.getAppKeyForCurrentLocale = getAppKeyForCurrentLocale;
exports.getCategoryPath = getCategoryPath;
exports.getCurrentLocale = getCurrentLocale;
exports.getCurrentLocaleSFRA = getCurrentLocaleSFRA;
exports.getAppKeyForCurrentLocaleFromRequest = getAppKeyForCurrentLocaleFromRequest;
exports.getImageLink = getImageLink;
exports.isCartridgeEnabled = isCartridgeEnabled;
exports.isReviewsEnabledForCurrentLocale = isReviewsEnabledForCurrentLocale;
exports.isRatingEnabledForCurrentLocale = isRatingEnabledForCurrentLocale;
exports.validateMandatoryConfigData = validateMandatoryConfigData;
exports.validateOrderFeedJobConfiguration = validateOrderFeedJobConfiguration;
exports.getProductImageUrl = getProductImageUrl;
exports.formatDateTime = formatDateTime;
exports.validateEmailAddress = validateEmailAddress;
exports.cleanDataForExport = cleanDataForExport;
exports.extendObject = extendObject;
