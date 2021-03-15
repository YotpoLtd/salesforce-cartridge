'use strict';

/**
 * @module models/orderexport/exportOrderModel
 *
 * The model is used to export order to Yotpo.
 */

/**
 * Returns Order Export config object
 *
 * @returns {Object} - Order Export config object
 */
function getExportOrderConfig() {
    var Site = require('dw/system/Site');
    return {
        productInformationFromMaster: Site.getCurrent().getPreferences().custom.yotpoProductInformationFromMaster,
        exportGroupIdInOrder: Site.getCurrent().getPreferences().custom.yotpoExportGroupIdInOrder
    };
}

/**
 * It validates that the orders are exportable for current locale in Yotop Configuration object.
 * It returns error if the mandatory data is missing. It will also indicate skipping orders for current
 * locale if the flag in configuration indicate so.
 *
 * @param {Object} yotpoConfiguration - The Yotpo configuration object all necessary configuration data.
 * @param {Date} orderFeedJobLastExecutionTime - The time when the order feed job last executed.
 *
 * @returns {boolean} - The flag to indicate if the orders export should be skipped for current locale.
 */
function validateOrderFeedConfigData(yotpoConfiguration, orderFeedJobLastExecutionTime) {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrderModel~validateOrderFeedConfigData';
    var currentLocaleID = yotpoConfiguration.custom.localeID;
    var processCurrentLocale = false;

    yotpoLogger.logMessage('Processing Locale ID - ' + currentLocaleID +
                '\n Order Feed Configuration', 'debug', logLocation);

    if (!yotpoConfiguration.custom.enablePurchaseFeed) {
        yotpoLogger.logMessage('Skipping orders for current Locale ID - ' + currentLocaleID + ' Purchase Feed Flag - ' + yotpoConfiguration.custom.enablePurchaseFeed, 'debug', logLocation);
    } else {
        // Check if data in Custom Objects for locale and job is valid and contains required data
        var configValidationResult = YotpoConfigurationModel.validateMandatoryConfigData(yotpoConfiguration);
        var jobValidationResult = YotpoConfigurationModel.validateOrderFeedJobConfiguration(orderFeedJobLastExecutionTime);
        if (!configValidationResult || !jobValidationResult) {
            if (!configValidationResult) {
                yotpoLogger.logMessage('The current locale missing mandatory data therefore aborting the process.', 'error', logLocation);
            }
            if (!jobValidationResult) {
                yotpoLogger.logMessage('The yotpo job configuration missing mandatory configuration data, cannot proceed.', 'error', logLocation);
            }
        } else {
            processCurrentLocale = true;
        }
    }

    return processCurrentLocale;
}

/**
 * Used for pre-export validation of locale yotpo configuration
 *
 * @param {dw.util.List} yotpoConfigurations - List of yotpo configurations
 * @param {Object} yotpoJobConfiguration - Yotpo Job configuration
 *
 * @returns {Object} localesToProcess - List of locales to export orders for
 */
function validateLocaleConfigData(yotpoConfigurations, yotpoJobConfiguration) {
    var Site = require('dw/system/Site');
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrderModel~validateLocaleConfigData';
    var logHeader = '\n\n------- Yotpo Purchase Feed Configuration Validation ---------\n' +
        'Current Site ID: ' + Site.getCurrent().getName() + '\n';
    var logFooter = '\n--------------------------------------------------------------\n\n';

    var totalConfigs = yotpoConfigurations.size();
    var siteLocales = Site.getCurrent().getAllowedLocales();
    var localesToProcess = [];
    var skippedLocales = siteLocales;

    var configurationCount = yotpoConfigurations.size();

    for (var i = 0; i < configurationCount; i++) {
        var config = yotpoConfigurations[i];
        var processLocale = validateOrderFeedConfigData(config, yotpoJobConfiguration.orderFeedJobLastExecutionTime);
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
            constants.EXPORT_ORDER_NO_ENABLED_CONFIG_ERROR + ': Exiting Yotpo Purchase Feed job. No locales have the Yotpo Purchase Feed enabled' +
            logFooter);
    } else if (localesToProcess.length < totalConfigs) {
        // Output message to error log for skipped locales
        yotpoLogger.logMessage(logHeader +
            'The following locales have been skipped in this order export job execution because either the Purchase Feed is disabled or the configuration is invalid: \n - ' +
            skippedLocales.join('\n - ') + '\n' +
            'Current orders in these locales will not be exported to Yotpo in the future because they will no longer meet the job last executed date criteria \n\n' +
            'Continuing with processing the following locales: \n - ' +
            localesToProcess.join('\n - ') + '\n' +
            logFooter, 'error', logLocation);
    }

    return localesToProcess;
}

/**
 * This script searches the order based on delta starting from last execution time
 * of export job to current time. It only export orders which are in following state
 * Order.EXPORT_STATUS_READY, Order.EXPORT_STATUS_EXPORTED and customer Locale ID
 * matches with current Locale in processing.
 *
 * @param {Date} orderFeedJobLastExecutionTime - Date and time when the order feed job last executed
 * @param {Date} currentDateTime - Current Date and time
 * @param {Object} localesToProcess - List of locales to export orders for
 *
 * @returns {Iterator} ordersIterator - The order list to be exported
 */
function searchOrders(orderFeedJobLastExecutionTime, currentDateTime, localesToProcess) {
    var Order = require('dw/order/Order');
    var OrderMgr = require('dw/order/OrderMgr');

    var queryString = 'creationDate >= {0} AND creationDate <= {1} AND (exportStatus = {2} OR exportStatus = {3}) AND ';
    var totalLocales = localesToProcess.length;

    var stringSwapNumber = 4;
    queryString += '(';
    for (var i = 0; i < totalLocales; i++) {
        queryString += 'customerLocaleID = {' + stringSwapNumber + '}';
        if (i + 1 !== totalLocales) {
            queryString += ' OR ';
        }
        stringSwapNumber++;
    }
    queryString += ')';

    var sortString = 'orderNo ASC';

    var queryArgs = [
        queryString,
        sortString,
        orderFeedJobLastExecutionTime,
        currentDateTime,
        Order.EXPORT_STATUS_READY,
        Order.EXPORT_STATUS_EXPORTED
    ].concat(localesToProcess);

    var ordersIterator = OrderMgr.searchOrders.apply(OrderMgr.searchOrders, queryArgs);

    return ordersIterator;
}

/**
 * Builds start of the export orders request object
 *
 * @param {string} utokenAuthCode - Service Auth Token
 *
 * @returns {Object} - Start of the object used for locale based order export request
 */
function prepareRequestParamsData(utokenAuthCode) {
    var constants = require('*/cartridge/scripts/utils/constants');
    return {
        validate_data: true,
        platform: constants.PLATFORM_FOR_YOTPO_DATA,
        plugin_version: constants.YOTPO_CARTRIDGE_VERSION,
        utoken: utokenAuthCode,
        orders: []
    };
}

/**
 * Make an authorization request to Yotpo and returns token
 *
 * @param {Object} yotpoConfiguration - Locale specific service configuration from Custom Object
 *
 * @returns {string} - Either returns auth token or empty string on error
 */
function getServiceAuthToken(yotpoConfiguration) {
    var authenticationModel = require('*/cartridge/models/authentication/authenticationModel');
    var authenticationResult = authenticationModel.authenticate(
        yotpoConfiguration.custom.appKey,
        yotpoConfiguration.custom.clientSecretKey
    );

    return !authenticationResult.errorResult ?
        authenticationResult.updatedUTokenAuthCode :
        '';
}

/**
 * Saves values to custom object
 *
 * @param {dw.object.CustomObject} customObject - SFCC Custom Object
 * @param {string} fieldId - Custom Object attribute ID
 * @param {Object} value - Value to save in Custom Object
 */
function saveCustomObjectData(customObject, fieldId, value) {
    var updatedCustomObject = customObject;
    if (Object.prototype.hasOwnProperty.call(updatedCustomObject, 'custom')) {
        require('dw/system/Transaction').wrap(function () {
            updatedCustomObject.custom[fieldId] = value;
        });
    }
}

/**
 * Builds object to store configuration and order export request object keyed by locale
 *
 * @param {Object} yotpoConfigurations - Yotpo locale based configurations retrieved from Custom Objects
 * @param {Date} orderFeedJobLastExecutionTime - Date and time when the order feed job last executed
 *
 * @returns {Object} - Contains objects keyed by locale for appKeysAndTokens & requestsData
 */
function getConfigAndRequestsByLocale(yotpoConfigurations, orderFeedJobLastExecutionTime) {
    var requestsDataByLocale = {};
    var appKeysAndTokensByLocale = {};
    var configurationCount = yotpoConfigurations.size();

    for (var i = 0; i < configurationCount; i++) {
        var yotpoConfiguration = yotpoConfigurations[i];
        var processCurrentLocale = this.validateOrderFeedConfigData(yotpoConfiguration, orderFeedJobLastExecutionTime);

        if (processCurrentLocale) {
            var currentLocaleID = yotpoConfiguration.custom.localeID;

            // Check for auth token in Custom Object. If it doesn't exist
            // request a new one from the service and save in the Custom Object
            var utokenAuthCode;
            if (!empty(yotpoConfiguration.custom.utokenAuthCode)) {
                utokenAuthCode = yotpoConfiguration.custom.utokenAuthCode;
            } else {
                utokenAuthCode = this.getServiceAuthToken(yotpoConfiguration);
                if (!empty(utokenAuthCode)) {
                    this.saveCustomObjectData(yotpoConfiguration, 'utokenAuthCode', utokenAuthCode);
                }
            }

            appKeysAndTokensByLocale[currentLocaleID] = {
                utokenAuthCode: utokenAuthCode,
                appKey: yotpoConfiguration.custom.appKey
            };

            requestsDataByLocale[currentLocaleID] = this.prepareRequestParamsData(utokenAuthCode);
        }
    }

    return {
        appKeysAndTokensByLocale: appKeysAndTokensByLocale,
        requestsDataByLocale: requestsDataByLocale
    };
}

/**
 * Loads all locale based yotpo configurations stored in Custom Objects
 *
 * @returns {dw.util.List} - List of all loaded configuration Custom Objects
 */
function loadAllYotpoConfigurations() {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    return YotpoConfigurationModel.loadAllYotpoConfigurations();
}

/**
 * Loads yotpo job configurations stored in Custom Objects
 *
 * @returns {Object} - Contains the last execution and current date time.
 */
function loadYotpoJobConfigurations() {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    return YotpoConfigurationModel.loadYotpoJobConfigurations();
}

/**
 * This script will extract customer information from an order and will
 * prepare an object to be converted into JSON to be submitted to Yotpo.
 *
 * @param {dw.order.Order} order - The order to process
 * @param {string} currentLocaleID - locale ID of order being processed
 * @param {Object} dateTimes - current and last executed dates
 *
 * @returns {Object} customerData - Contains data retrieved about the customer used to build request object
 */
function prepareCustomerData(order) {
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var constants = require('*/cartridge/scripts/utils/constants');

    var customer = order.customer;

    if (empty(customer)) {
        throw new Error(constants.EXPORT_ORDER_MISSING_CUSTOMER_ERROR);
    }

    var firstName;
    var lastName;
    var customerName;
    var customerEmail;
    var customerData = {};

    if (customer.isRegistered()) {
        firstName = empty(customer.profile.firstName) ? '' : customer.profile.firstName;
        lastName = empty(customer.profile.lastName) ? '' : customer.profile.lastName;
        customerName = firstName + ' ' + lastName;
        customerEmail = customer.profile.email;
    } else {
        customerName = empty(order.customerName) ? '' : order.customerName;
        customerEmail = empty(order.customerEmail) ? '' : order.customerEmail;
    }

    customerData.customer_name = yotpoUtils.cleanDataForExport(customerName, 'order');
    customerData.email = yotpoUtils.cleanDataForExport(customerEmail, 'email');

    return customerData;
}

/**
 * Checks to see if a product line item has price adjustments and if they were applied with a coupon
 *
 * @param {dw.order.ProductLineItem} productLineItem - A product line item from an order
 *
 * @return {boolean} couponWasUsed - Returns true id a coupon was applied, false otherwise
 */
function getIfCouponWasApplied(productLineItem) {
    var priceAdjustmentsIt = productLineItem.getPriceAdjustments().iterator();
    var couponWasUsed = false;
    while (priceAdjustmentsIt.hasNext()) {
        var priceAdjustment = priceAdjustmentsIt.next();
        if (priceAdjustment.isBasedOnCoupon()) {
            couponWasUsed = true;
            break;
        }
    }
    return couponWasUsed;
}

/**
 * This script will extract optional product information from a product and product line item
 * and will prepare an object to be converted into JSON to be submitted to Yotpo.
 *
 * @param {dw.catalog.Product} product - Ordered product
 * @param {dw.order.ProductLineItem} productLineItem - Ordered product lineitem
 *
 * @returns {Object} productData - Contains optional product data to build order export request
 */
function prepareOrderProductsOptionalData(product, productLineItem) {
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');

    var productData;
    var imageURL = yotpoUtils.getProductImageUrl(product);
    var description = yotpoUtils.cleanDataForExport(product.shortDescription.getMarkup(), 'product');
    var price = productLineItem.getBasePrice().decimalValue.toString();
    var exportOrderConfig = this.getExportOrderConfig();

    var productGroupId;
    if (exportOrderConfig.exportGroupIdInOrder && product.variant) {
        productGroupId = product.getVariationModel().master.ID;
    }

    // Properties in API spec that are common but, not initially setup in SFCC
    var color;
    var size;
    var material;
    var model;

    var vendor = yotpoUtils.cleanDataForExport(product.brand, 'product');
    var couponWasUsed = this.getIfCouponWasApplied(productLineItem);

    if (!empty(imageURL) || !empty(description) ||
        !empty(price) || !empty(productGroupId) ||
        !empty(color) || !empty(size) ||
        !empty(material) || !empty(model) ||
        !empty(vendor) || !empty(couponWasUsed)) {
        productData = {};

        // The large image for the product
        if (!empty(imageURL)) {
            productData.image = imageURL;
        }
        // The description of the product
        if (!empty(description)) {
            productData.description = description;
        }
        // The price of the product
        if (!empty(price)) {
            productData.price = price;
        }
        // The ID of the product's master product
        if (!empty(productGroupId)) {
            productData.productGroupId = productGroupId;
        }

        // Properties in API spec that are common but, not initially setup in SFCC
        // The color of the product e.g. "Midnight black"
        if (!empty(color)) {
            productData.color = color;
        }
        // The size of the product e.g. "Large"
        if (!empty(size)) {
            productData.size = size;
        }
        // The material the product is made of e.g. "cotton"
        if (!empty(material)) {
            productData.material = material;
        }
        // The model of the product e.g. "f-150"
        if (!empty(model)) {
            productData.model = model;
        }

        // The product vendor
        if (!empty(vendor)) {
            productData.vendor = vendor;
        }
        // Indicates whether a coupon was applied to this product at time of purchase
        if (!empty(couponWasUsed)) {
            productData.coupon_used = couponWasUsed;
        }
    }

    return productData;
}

/**
 * This script will extract optional product spec information from a product and
 * will prepare an object to be converted into JSON to be submitted to Yotpo.
 *
 * @param {dw.catalog.Product} product - Product to extract data from
 *
 * @returns {Object} specs - Contains optional product spec data to build order export request
 */
function prepareOrderProductsSpecsData(product) {
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');

    // Optional product data specs
    var specs;

    var upc = yotpoUtils.cleanDataForExport(product.UPC, 'product');
    // Property in API spec that are common but, not initially setup in SFCC
    var isbn;

    if (!empty(upc) || !empty(isbn)) {
        specs = {};

        // The product UPC
        if (!empty(upc)) {
            specs.upc = upc;
        }

        // Property in API spec that are common but, not initially setup in SFCC
        // The product ISBN number
        if (!empty(isbn)) {
            specs.isbn = isbn;
        }
    }

    return specs;
}

/**
 * This script will extract products information from an order and will
 * prepare an object to be converted into JSON to be submitted to Yotpo.
 *
 * @param {dw.order.Order} order - The order to process
 *
 * @returns {Object} productsData - Contains order products information to be used to build order export request
 */
function prepareOrderProductsData(order) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var URLUtils = require('dw/web/URLUtils');
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var exportOrderConfig = this.getExportOrderConfig();
    var logLocation = 'exportOrderModel~prepareOrderProductsData';

    var productsData = {};

    var orderShipmentIt = order.getShipments().iterator();
    // Go through shipments
    while (orderShipmentIt.hasNext()) {
        var shipment = orderShipmentIt.next();
        var prodLineItemIts = shipment.getProductLineItems().iterator();

        // Get product lineItems
        while (prodLineItemIts.hasNext()) {
            var productLineItem = prodLineItemIts.next();
            var currentProduct = ProductMgr.getProduct(productLineItem.productID);

            if (empty(currentProduct)) {
                throw new Error(constants.EXPORT_ORDER_MISSING_PRODUCT_ERROR + ' Product ID: ' + productLineItem.productID);
            }

            if (exportOrderConfig.productInformationFromMaster && currentProduct.variant) {
                currentProduct = currentProduct.getVariationModel().master;
            }

            // Required product data
            var productID = yotpoUtils.cleanDataForExport(currentProduct.ID, 'product', '-');
            var productName = yotpoUtils.cleanDataForExport(currentProduct.name, 'product');
            var productURL = URLUtils.abs('Product-Show', 'pid', currentProduct.ID).toString();

            // Skipping the order if any of the following fields empty of product
            if (empty(productID) || empty(productName) || empty(productURL)) {
                var errorMsgs = [];
                if (empty(productID)) {
                    errorMsgs.push('productID [EMPTY]');
                }
                if (empty(productName)) {
                    errorMsgs.push('productName [EMPTY]');
                }
                if (empty(productURL)) {
                    errorMsgs.push('productURL [EMPTY]');
                }
                throw new Error(constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR +
                    ': ' + errorMsgs.join(', ') + ' - Product ID: ' + productID);
            }

            var productData = {
                url: productURL,
                name: productName
            };

            // Add Optional product data if it exists
            var optionalProductData;
            try {
                optionalProductData = this.prepareOrderProductsOptionalData(currentProduct, productLineItem);
            } catch (e) {
                yotpoLogger.logMessage(constants.EXPORT_ORDER_OPTIONAL_PRODUCT_DATA_ERROR +
                    ': ' + e + ' - Product ID: ' + productID, 'error', logLocation);
            }

            if (!empty(optionalProductData)) {
                productData = yotpoUtils.extendObject(productData, optionalProductData);
            }

            // Add Optional product data specs if they exist
            var specs;
            try {
                specs = this.prepareOrderProductsSpecsData(currentProduct);
            } catch (e) {
                yotpoLogger.logMessage(constants.EXPORT_ORDER_OPTIONAL_PRODUCT_SPECS_DATA_ERROR +
                    ': ' + e + ' - Product ID: ' + productID, 'error', logLocation);
            }

            if (!empty(specs)) {
                productData.specs = specs;
            }

            // SFCC does not allow object keys to start with '0,' so adding a prefix to the key.
            productsData[constants.PRODUCT_ID_TOKEN + productID] = productData;
        }
    }

    return productsData;
}

/**
 * This script will extract order information and will prepare an
 * object to be converted into JSON to be submitted to Yotpo.
 *
 * @param {dw.order.Order} order : The order to process
 * @param {Object} dateTimes : current and last executed dates
 *
 * @returns {Object} Object
 */
function prepareOrderData(order, dateTimes) {
    var Site = require('dw/system/Site');
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrderModel~prepareOrderData';
    var logHeader = '\n\n------------ Yotpo Purchase Feed Data Preparation ------------\n' +
        'Current Site ID: ' + Site.getCurrent().getName() + '\n';
    var logFooter = '\n--------------------------------------------------------------\n\n';
    var exportOrderConfig = this.getExportOrderConfig();
    var orderData;
    var errorMsgs = [];

    yotpoLogger.logMessage(logHeader +
    'Date format for the Yotpo data: ' + constants.DATE_FORMAT_FOR_YOTPO_DATA + '\n' +
    'Site preference productInformationFromMaster: ' + exportOrderConfig.productInformationFromMaster + '\n' +
    'Site preference exportGroupIdInOrder: ' + exportOrderConfig.exportGroupIdInOrder + '\n' +
    'Order Locale ID: ' + order.customerLocaleID + '\n' +
    logFooter, 'debug', logLocation);

    var orderNo = order.orderNo;
    var customerData;
    try {
        customerData = this.prepareCustomerData(order);
    } catch (e) {
        throw new Error('Skipping order ' + orderNo + ' in the export due to: ' +
        constants.EXPORT_ORDER_CUSTOMER_DATA_ERROR + ': ' + e, 'error', logLocation);
    }

    var customerName = customerData.customer_name;
    var customerEmail = customerData.email;

    var hasLastExecutedDate = Object.prototype.hasOwnProperty.call(dateTimes, 'orderFeedJobLastExecutionTime');
    var hasLastCurrentDate = Object.prototype.hasOwnProperty.call(dateTimes, 'currentDateTime');

    // Skipping the order if any of the following information is missing
    if (empty(customerName) ||
        empty(customerEmail) ||
        empty(orderNo) ||
        empty(dateTimes) ||
        !hasLastExecutedDate ||
        !hasLastCurrentDate) {
        if (empty(customerName)) {
            errorMsgs.push('customerName: [EMPTY]');
        }
        if (empty(customerEmail)) {
            errorMsgs.push('customerEmail: [EMPTY]');
        }
        if (empty(orderNo)) {
            errorMsgs.push('orderId: [EMPTY]');
        }
        if (empty(dateTimes)) {
            errorMsgs.push('dateTimes parameter: [EMPTY]');
        }
        if (!hasLastExecutedDate) {
            errorMsgs.push('dateTimes parameter orderFeedJobLastExecutionTime: [EMPTY]');
        }
        if (!hasLastCurrentDate) {
            errorMsgs.push('dateTimes parameter currentDateTime: [EMPTY]');
        }

        throw new Error('Skipping order ' + orderNo + ' in the export due to: ' +
            constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR + ': ' + errorMsgs.join(', '));
    }

    yotpoLogger.logMessage('Mandatory data present continuing with export of order' + orderNo + '\n' +
        ' Last Execution Time: ' + dateTimes.orderFeedJobLastExecutionTime + '\n' +
        ' Current Execution Time: ' + dateTimes.currentDateTime, 'debug', logLocation);

    // Check email for validity and skip order if invalid
    if (!yotpoUtils.validateEmailAddress(customerEmail)) {
        throw new Error('Skipping order ' + orderNo + ' in the export due to: ' +
            constants.EXPORT_ORDER_INVALID_EMAIL_ADDRESS_ERROR + ' - ' + customerEmail);
    }

    // Retrieve product data and skip order if invalid
    var products;
    try {
        products = this.prepareOrderProductsData(order);
    } catch (e) {
        throw new Error('Skipping order ' + orderNo +
        ' in the export due to Error retrieving product information: ' + e);
    }

    // Skipping order if there are no products
    if (!empty(products)) {
        orderData = yotpoUtils.extendObject(customerData,
            {
                order_id: orderNo,
                order_date: yotpoUtils.formatDateTime(order.creationDate),
                currency_iso: order.currencyCode,
                products: products
            });
    }

    return orderData;
}

/**
 * Parses Yotpo Export Orders service response and sets appropriate log entries
 *
 * @param {dw.svc.Result} result - Service request response
 *
 * @returns {Object} - Contains success, authenticationError, serviceError, & unknownError flags
 */
function parseYotpoResponse(result) {
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrderModel~parseYotpoResponse';
    var responseStatusCode = !empty(result.object) ? JSON.parse(result.object).code : result.error;

    var status = {
        success: false,
        authenticationError: false,
        serviceError: false,
        unknownError: false
    };

    switch (String(responseStatusCode)) {
        case constants.STATUS_200 :
            yotpoLogger.logMessage('Yotpo Order Feed submitted successfully.', 'debug', logLocation);
            status.success = true;
            break;
        case constants.STATUS_401 :
            yotpoLogger.logMessage('The request to export order failed authentication. ' +
            ' Error code: ' + result.error + '\n' +
            ' Error Text is: ' + result.msg + ': ' + result.errorMessage.error, 'error', logLocation);
            status.authenticationError = true;
            break;
        case constants.STATUS_500 :
            yotpoLogger.logMessage('The request to export order encountered an Internal Server Error e.g. Timeout. ' +
            ' Error code: ' + result.error + '\n' +
            ' Error Text is: ' + result.errorMessage.error, 'error', logLocation);
            status.serviceError = true;
            break;
        default :
            yotpoLogger.logMessage('The request to export order failed for an unknown reason. Error: ' + result.error + '\n' +
            ' Error Text is: ' + result.errorMessage, 'error', logLocation);
            status.unknownError = true;
    }

    return status;
}

/**
 * This function updates the utokenAuthCode in an order request object. The utokenAuthCode is retrieved
 * from authentication and should be updated in existing order request object to retry the order submission.
 *
 * @param {string} utokenAuthCode : The u-token authentication code
 * @param {Object} requestData : The order order request object to be used to build a JSON request
 *
 * @returns {Object} updatedRequestData : The updated order request object to be used to build a JSON request
 */
function updateUTokenInRequestData(utokenAuthCode, requestData) {
    var updatedRequestData = requestData;
    updatedRequestData.utoken = utokenAuthCode; // Update utoken
    return updatedRequestData;
}


/**
 * This function submits the order to Yotpo. It makes HTTPS request, reads the response, and logs it.
 * It returns an error in case of some problem in order submission.
 *
 * @param {Object} requestData - Object structure for order export request. Gets converted to JSON
 * @param {string} yotpoAppKey - The appKey to connect to Yotpo.
 * @param {string} locale - Locale ID of orders to be sent
 * @param {boolean} shouldGetNewToken - Optional flag to retry auth request and save new token in Custom Object
 *
 * @returns {boolean} authenticationError : The flag to indicate if the error was due to Authentication failure.
 */
function sendOrdersToYotpo(requestData, yotpoAppKey, locale, shouldGetNewToken) {
    var makeRequestForNewToken = shouldGetNewToken || false;

    var constants = require('*/cartridge/scripts/utils/constants');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var exportOrderServiceRegistry = require('*/cartridge/scripts/serviceregistry/exportOrderServiceRegistry');
    var logLocation = 'exportOrderModel~sendOrdersToYotpo';

    var authenticationError = false;

    try {
        // Get api url from service definition
        var yotpoURL = exportOrderServiceRegistry.yotpoExportOrdersSvc.getConfiguration().getCredential().getURL();
        // Replace string token with appkey saved in Custom Object
        yotpoURL = yotpoURL.replace(':app_key', yotpoAppKey.toString());

        if (empty(yotpoURL)) {
            yotpoLogger.logMessage('The URL is empty for int_yotpo_sfra.https.post.export.purchase.api service.', 'error', logLocation);
            throw constants.EXPORT_ORDER_CONFIG_ERROR;
        } else {
            yotpoLogger.logMessage('Yotpo web path to pass order feed: ' + yotpoURL, 'debug', logLocation);
        }

        exportOrderServiceRegistry.yotpoExportOrdersSvc.setURL(yotpoURL);

        // Removing the prefix that was added earlier to workaround SFCC not allowing object keys to start with '0.'
        var requestJson = JSON.stringify(requestData).replace(constants.PRODUCT_ID_TOKEN, '', 'g');
        var result = exportOrderServiceRegistry.yotpoExportOrdersSvc.call(requestJson);
        var responseStatus = this.parseYotpoResponse(result);
        authenticationError = responseStatus.authenticationError;

        if (!responseStatus.success) {
            if (responseStatus.serviceError) {
                this.serviceTimeouts++;

                if (this.serviceTimeouts <= constants.SERVICE_MAX_TIMEOUTS) {
                    yotpoLogger.logMessage('Retrying Order Feed submission due to service error \n' +
                    ' Error code: ' + result.error + '\n' +
                    ' Error Text is: ' + result.errorMessage.error, 'error', logLocation);
                    this.sendOrdersToYotpo(requestData, yotpoAppKey, locale, false);
                } else {
                    var serviceErrorMsg = constants.EXPORT_ORDER_RETRY_ERROR + ': Order Feed submission aborted due to repeated service errors \n' +
                    ' Number of attempts: ' + this.serviceTimeouts;
                    yotpoLogger.logMessage(serviceErrorMsg, 'error', logLocation);
                    // If the error persist then we should terminate here
                    throw new Error(serviceErrorMsg);
                }
            } else if (responseStatus.authenticationError && makeRequestForNewToken) {
                yotpoLogger.logMessage('Retrying Order Feed submission due to service authentication error', 'error', logLocation);
                var yotpoConfiguration = YotpoConfigurationModel.loadYotpoConfigurationsByLocale(locale);
                var utokenAuthCode = this.getServiceAuthToken(yotpoConfiguration);
                var retryAuthenticationError = true;
                if (!empty(utokenAuthCode)) {
                    this.saveCustomObjectData(yotpoConfiguration, 'utokenAuthCode', utokenAuthCode);
                    var updatedRequestData = this.updateUTokenInRequestData(utokenAuthCode, requestData);
                    // retry export
                    retryAuthenticationError = this.sendOrdersToYotpo(updatedRequestData, yotpoAppKey, locale, false);
                }

                // If the error persist then we should terminate here
                if (retryAuthenticationError) {
                    var authErrorMsg = constants.EXPORT_ORDER_RETRY_ERROR + ': Order Feed submission aborted due to repeated authorization errors \n' +
                    ' Number of attempts: 2';
                    yotpoLogger.logMessage(authErrorMsg, 'error', logLocation);
                    throw new Error(authErrorMsg);
                }
            } else if (responseStatus.unknownError) {
                // Some other error occurred we should terminate here
                throw new Error(constants.EXPORT_ORDER_SERVICE_ERROR + ': An unknown error occurred while attempting to communicate with the Yotpo service');
            }
        }
    } catch (e) {
        yotpoLogger.logMessage('Error occurred while trying to upload feed - ' + e, 'error', logLocation);
        throw e;
    }

    return authenticationError;
}


/**
 * Loops through passed requests object and sends each locale's orders to Yotpo
 *
 * @param {Object} configAndRequestsByLocale - Object, keyed by locale, containing objects to build order export request JSON
 */
function exportOrdersByLocale(configAndRequestsByLocale) {
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrderModel~exportOrdersByLocale';
    var requestsDataByLocale = configAndRequestsByLocale.requestsDataByLocale;
    var appKeysAndTokensByLocale = configAndRequestsByLocale.appKeysAndTokensByLocale;
    var model = this;

    Object.keys(requestsDataByLocale).forEach(function (locale) {
        var orderRequestData = requestsDataByLocale[locale];
        var localeAppKey = appKeysAndTokensByLocale[locale].appKey;
        if (!empty(orderRequestData.orders)) {
            model.sendOrdersToYotpo(orderRequestData, localeAppKey, locale, true);
        } else {
            yotpoLogger.logMessage('Purchase feed export skipped for Locale ID: ' + locale + 'because there were no orders to process for that locale', 'debug', logLocation);
        }
    });
}

/**
 * Combines order data with request data object
 *
 * @param {dw.util.List} ordersData - List of order data objects
 * @param {Object} configAndRequestsByLocale - Request data object
 *
 * @return {Object} - Combined data for request
 */
function addOrderDataToRequests(ordersData, configAndRequestsByLocale) {
    var combinedData = configAndRequestsByLocale;
    var orderCount = ordersData.size();
    for (var i = 0; i < orderCount; i++) {
        var orderLocale = ordersData[i].orderLocale;
        var orderData = ordersData[i].orderData;
        if (Object.prototype.hasOwnProperty.call(configAndRequestsByLocale.requestsDataByLocale, orderLocale)) {
            combinedData.requestsDataByLocale[orderLocale].orders.push(orderData);
        }
    }
    return combinedData;
}

/**
 * It updates the Yotop Configuration object. It updates the last execution time of order process job with currentDateTime.
 *
 * @param {Date} currentDateTime - The current date time.
 *
 * @returns {boolean} boolean
 */
function updateJobExecutionTime(currentDateTime) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var constants = require('*/cartridge/scripts/utils/constants');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'exportOrderModel~updateJobExecutionTime';

    yotpoLogger.logMessage('Updating job execution time to : ' + currentDateTime, 'debug', logLocation);

    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(constants.YOTPO_JOBS_CONFIGURATION_OBJECT, constants.YOTPO_JOB_CONFIG_ID);

    this.saveCustomObjectData(yotpoJobsConfiguration, 'orderFeedJobLastExecutionDateTime', currentDateTime);

    return true;
}


/**
 * Exports
 */
function ExportOrderModel() {
    this.serviceTimeouts = 0;

    this.getConfigAndRequestsByLocale = getConfigAndRequestsByLocale;
    this.loadAllYotpoConfigurations = loadAllYotpoConfigurations;
    this.loadYotpoJobConfigurations = loadYotpoJobConfigurations;
    this.prepareOrderData = prepareOrderData;
    this.prepareOrderProductsData = prepareOrderProductsData;
    this.prepareRequestParamsData = prepareRequestParamsData;
    this.searchOrders = searchOrders;
    this.sendOrdersToYotpo = sendOrdersToYotpo;
    this.updateJobExecutionTime = updateJobExecutionTime;
    this.updateUTokenInRequestData = updateUTokenInRequestData;
    this.validateOrderFeedConfigData = validateOrderFeedConfigData;
    this.getExportOrderConfig = getExportOrderConfig;
    this.getServiceAuthToken = getServiceAuthToken;
    this.exportOrdersByLocale = exportOrdersByLocale;
    this.saveCustomObjectData = saveCustomObjectData;
    this.prepareCustomerData = prepareCustomerData;
    this.getIfCouponWasApplied = getIfCouponWasApplied;
    this.prepareOrderProductsOptionalData = prepareOrderProductsOptionalData;
    this.prepareOrderProductsSpecsData = prepareOrderProductsSpecsData;
    this.parseYotpoResponse = parseYotpoResponse;
    this.addOrderDataToRequests = addOrderDataToRequests;
    this.validateLocaleConfigData = validateLocaleConfigData;
}

module.exports = ExportOrderModel;
