'use strict';

/**
 * @module scripts/utils/yotpoUtils
 *
 * This script provides utility functions shared across other Yotpo scripts.
 * Reused script components for Yotpo are contained here.
 */

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
 * Retrieves the current locale from request, if not found then revert to 'default' locale.
 * @param {Object} request - request object
 * @returns {string} current locale id
 */
function getCurrentLocaleFromRequest(request) {
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
 * Validates given email address based on RFC 5322 Official Standard regex
 * @param {string} emailAddress email address to validate
 * @returns {boolean} true if email is valid based on regex
 */
function validateEmailAddress(emailAddress) {
    return require('*/cartridge/scripts/utils/constants').EMAIL_VALIDATION_REGEX_FOR_YOTPO_DATA.test(emailAddress);
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
    var constants = require('*/cartridge/scripts/utils/constants');

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
    var constants = require('*/cartridge/scripts/utils/constants');
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
 * This function is used to get date of past number of days
 * For example 30 days old date is required then method will
 * subtract 30 days form current date and will return past date
 *
 * @param {Integer} numberOfDays : The number of days from current date
 *
 * @return {Object} pastDate :  The Date object date which is subtracted form current date
 */
function getPastDateFromDays(numberOfDays) {
    var Calendar = require('dw/util/Calendar');

    var calendar = new Calendar();
    var currentTimeMilis = calendar.getTime();
    var numberOfDaysMillis = numberOfDays * 24 * 60 * 60 * 1000;
    var pastDate = new Date(currentTimeMilis - numberOfDaysMillis);
    return pastDate;
}

/**
 * @description appends the parameters to the given url and returns the changed url
 * @param {string} url - the URL
 * @param {Object} params - the parameters to append with URL
 *
 * @returns {string} The URL with appended parameters
 */
function appendParamsToUrl(url, params) {
    var ArrayList = require('dw/util/ArrayList');

    var _params = new ArrayList();
    Object.keys(params).forEach(function (key) {
        _params.push(key + '=' + encodeURIComponent(params[key]));
    });
    var _url = url + '?' + _params.join('&');
    return _url;
}

/**
 * This function is used to convert the price into cents
 *
 * @param {number} price : The price which needs to be convert.
 *
 * @return {number} priceCents : The converted price into cents.
 */
function convertPriceIntoCents(price) {
    var priceCents = 0;
    if (price !== null) {
        priceCents = price * 100;
    }
    return priceCents;
}

exports.escape = escape;
exports.getCategoryPath = getCategoryPath;
exports.getCurrentLocaleFromRequest = getCurrentLocaleFromRequest;
exports.getCurrentLocaleSFRA = getCurrentLocaleSFRA;
exports.getImageLink = getImageLink;
exports.getProductImageUrl = getProductImageUrl;
exports.formatDateTime = formatDateTime;
exports.validateEmailAddress = validateEmailAddress;
exports.cleanDataForExport = cleanDataForExport;
exports.extendObject = extendObject;
exports.getPastDateFromDays = getPastDateFromDays;
exports.appendParamsToUrl = appendParamsToUrl;
exports.convertPriceIntoCents = convertPriceIntoCents;

