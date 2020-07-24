'use strict';

/**
 * Calculates yotpo config based on custom object settings, and caches
 * this config onto the session, so that the config is nor repeatedly
 * recalculated when a customer is viewing uncached pages.
 * @param {string} locale current locale id
 */
function setYotpoConfig(locale) {
    var Request = require('dw/system/Request');
    var safeLocale = locale || Request.getLocale();

    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');

    var yotpoConfig = {
        isCartridgeEnabled: yotpoUtils.isCartridgeEnabled(),
        isReviewEnabled: false,
        isRatingEnabled: false
    };

    if (yotpoConfig.isCartridgeEnabled) {
        var Site = require('dw/system/Site');
        var URLUtils = require('dw/web/URLUtils');
        var currentLocaleID = yotpoUtils.getCurrentLocaleSFRA(safeLocale);

        yotpoConfig = {
            isCartridgeEnabled: true,
            isReviewEnabled: yotpoUtils.isReviewsEnabledForCurrentLocale(currentLocaleID),
            isRatingEnabled: yotpoUtils.isRatingEnabledForCurrentLocale(currentLocaleID),
            yotpoAppKey: yotpoUtils.getAppKeyForCurrentLocale(currentLocaleID),
            domainAddress: URLUtils.home(),
            productInformationFromMaster: Site.getCurrent().preferences.custom.yotpoProductInformationFromMaster
        };
    }

    session.privacy.yotpoConfig = JSON.stringify(yotpoConfig);
}

/**
 * It loads configuration data for Yotpo module based on locale.
 * If the config cannot be found in the session it will built it
 * and then save it to the session
 * @param {string} locale - current locale id
 * @returns {Object} a JSON object of the yotpo configurations.
 */
function getYotpoConfig(locale) {
    if (!session.privacy.yotpoConfig) {
        setYotpoConfig(locale);
    }
    return JSON.parse(session.privacy.yotpoConfig);
}

/**
 * It retrieves the product reviews for the current product. In case of variant product,
 * it might retrieve reviews for master product depending on the site preference.
 * @param {string} currentLocale - the users locale
 * @param {string} productId - the current product-id
 * @returns {Object} a JSON object of the yotpo ratings and reviews.
 */
function getRatingsOrReviewsData(currentLocale, productId) {
    var yotpoConfig = getYotpoConfig(currentLocale);

    if (yotpoConfig.isCartridgeEnabled && (yotpoConfig.isReviewEnabled || yotpoConfig.isRatingEnabled)) {
        var ProductMgr = require('dw/catalog/ProductMgr');
        var currentProduct = ProductMgr.getProduct(productId);
        var productInformationFromMaster = yotpoConfig.productInformationFromMaster;

        if (currentProduct.variant) {
            if (productInformationFromMaster) {
                currentProduct = currentProduct.getVariationModel().master;
            }
        }

        var URLUtils = require('dw/web/URLUtils');
        var productURL = encodeURI(URLUtils.abs('Product-Show', 'pid', currentProduct.ID));
        productURL = encodeURI(productURL);

        var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
        var imageURL = yotpoUtils.getProductImageUrl(currentProduct);

        return {
            isReviewEnabled: yotpoConfig.isReviewEnabled,
            isRatingEnabled: yotpoConfig.isRatingEnabled,
            yotpoAppKey: yotpoConfig.yotpoAppKey,
            domainAddress: yotpoConfig.domainAddress,
            productID: yotpoUtils.escape(currentProduct.ID, '([\/])', '-'),
            productName: currentProduct.name,
            productDesc: currentProduct.shortDescription,
            productModel: empty(currentProduct.brand) ? '' : currentProduct.brand,
            productURL: productURL,
            imageURL: imageURL,
            productCategory: yotpoUtils.getCategoryPath(currentProduct)
        };
    }

    return {
        isReviewEnabled: yotpoConfig.isReviewEnabled,
        isRatingEnabled: yotpoConfig.isRatingEnabled
    };
}

/**
 * It retrieves the conversion tracking URL for Yotpo,
 * To send it to Yotpo at order confirmation page,
 * @param {Object} order - current processed order
 * @param {string} currentLocale - current locale id
 * @returns {Object} a JSON object containing basic tracking info
 */
function getConversionTrackingData(order, currentLocale) {
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils.js');
    var isCartridgeEnabled = yotpoUtils.isCartridgeEnabled();
    var conversionTrkURL = '';

    if (isCartridgeEnabled) {
        var orderTotalValue;

        if (!empty(order)) {
            if (order.totalGrossPrice.available) {
                orderTotalValue = order.totalGrossPrice.value;
            } else {
                orderTotalValue = order.getAdjustedMerchandizeTotalPrice(true).add(order.giftCertificateTotalPrice.value);
            }
        }

        var Site = require('dw/system/Site');
        var currentLocaleID = yotpoUtils.getCurrentLocaleSFRA(currentLocale);
        var yotpoAppKey = yotpoUtils.getAppKeyForCurrentLocale(currentLocaleID);
        var conversionTrackingURL = Site.getCurrent().preferences.custom.yotpoConversionTrackingPixelURL;
        conversionTrkURL = conversionTrackingURL + '?order_amount=' + orderTotalValue +
            '&order_id=' + order.orderNo + '&order_currency=' + order.currencyCode + '&app_key=' + yotpoAppKey;
    }

    return {
        isCartridgeEnabled: isCartridgeEnabled,
        conversionTrackingURL: conversionTrkURL
    };
}

/**
 * It retrieves viewData JSON object for Yotpo ratings and reviews
 * @param {Object} viewData - current viewData object
 * @returns {Object} updated viewData object containing widget data
 */
function addRatingsOrReviewsToViewData(viewData) {
    var updatedViewData = viewData;

    try {
        updatedViewData.yotpoWidgetData = getRatingsOrReviewsData(viewData.locale, viewData.product.id);
    } catch (ex) {
        log(ex, viewData.action);
    }
    return updatedViewData;
}

/**
 * It retrieves viewData JSON object for Yotpo conversion tracking
 * @param {Object} order - current order object
 * @param {Object} viewData - current viewData object
 * @returns {Object} updated viewData containing conversation tracking property
 */
function addConversionTrackingToViewData(order, viewData) {
    var updatedViewData = viewData;

    try {
        updatedViewData.yotpoConversionTrackingData = getConversionTrackingData(order, viewData.locale);
    } catch (ex) {
        log(ex, viewData.action);
    }
    return updatedViewData;
}

/**
 * Error logger for retrieving ratings/reviews and conversion tracking data
 * @param {Object} ex - Exception object
 * @param {*} controllerName - Controller + action name to be placed in the log (EX: 'Search-Show')
 */
function log(ex, controllerName) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    yotpoLogger.logMessage('Something went wrong while retrieving ratings and reviews data, Exception code is: ' + ex, 'error', 'Yotpo~' + controllerName);
}

module.exports = {
    getRatingsOrReviewsData: getRatingsOrReviewsData,
    getConversionTrackingData: getConversionTrackingData,
    getYotpoConfig: getYotpoConfig,
    addRatingsOrReviewsToViewData: addRatingsOrReviewsToViewData,
    addConversionTrackingToViewData: addConversionTrackingToViewData,
    log: log
};
