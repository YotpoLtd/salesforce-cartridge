'use strict';

/**
 * It retrieves the product reviews for the current product. In case of variant product,
 * it might retrieve reviews for master product depending on the site preference.
 * @param {string} currentLocale - the users locale
 * @param {string} productId - the current product-id
 * @returns {Object} a JSON object of the yotpo ratings and reviews.
 */
function getRatingsOrReviewsData(currentLocale, productId) {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var yotpoConfig = YotpoConfigurationModel.getYotpoConfig(currentLocale);

    if (isCartridgeEnabled && (yotpoConfig.isReviewsEnabled || yotpoConfig.isRatingsEnabled)) {
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
            isReviewsEnabled: yotpoConfig.isReviewsEnabled,
            isRatingsEnabled: yotpoConfig.isRatingsEnabled,
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
        isReviewsEnabled: yotpoConfig.isReviewsEnabled,
        isRatingsEnabled: yotpoConfig.isRatingsEnabled
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
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoConfig = YotpoConfigurationModel.getYotpoConfig(currentLocale);
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var conversionTrkURL = '';

    if (isCartridgeEnabled && (yotpoConfig.isReviewsEnabled || yotpoConfig.isRatingsEnabled)) {
        var orderTotalValue;

        if (!empty(order)) {
            if (order.totalGrossPrice.available) {
                orderTotalValue = order.totalGrossPrice.value;
            } else {
                orderTotalValue = order.getAdjustedMerchandizeTotalPrice(true).add(order.giftCertificateTotalPrice.value);
            }
        }

        var Site = require('dw/system/Site');
        var yotpoAppKey = yotpoConfig.yotpoAppKey;
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
 * Error logger for retrieving ratings/reviews and conversion tracking data
 * @param {Object} ex - Exception object
 * @param {*} controllerName - Controller + action name to be placed in the log (EX: 'Search-Show')
 */
function log(ex, controllerName) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    yotpoLogger.logMessage('Something went wrong while retrieving ratings and reviews data, Exception code is: ' + ex, 'error', 'Yotpo~' + controllerName);
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

module.exports = {
    getRatingsOrReviewsData: getRatingsOrReviewsData,
    getConversionTrackingData: getConversionTrackingData,
    addRatingsOrReviewsToViewData: addRatingsOrReviewsToViewData,
    addConversionTrackingToViewData: addConversionTrackingToViewData
};
