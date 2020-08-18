'use strict';

/**
 * This function is used to check the order status which is passed from API end point
 * The purpose of this function is to get the constant on the base of integer value
 * Then the constant pass to the orderMgr to query the orders
 *
 * @param {string} orderState : The order state from API
 *
 * @return {Integer} orderStatus : The order status constant if exist other wise return null.
 */
function getOrderState(orderState) {
    var Order = require('dw/order/Order');

    var orderStatus = null;

    switch (orderState) {
        case '0':
            orderStatus = Order.ORDER_STATUS_CREATED;
            break;
        case '3':
            orderStatus = Order.ORDER_STATUS_NEW;
            break;
        case '4':
            orderStatus = Order.ORDER_STATUS_OPEN;
            break;
        case '5':
            orderStatus = Order.ORDER_STATUS_COMPLETED;
            break;
        case '6':
            orderStatus = Order.ORDER_STATUS_CANCELLED;
            break;
        case '7':
            orderStatus = Order.ORDER_STATUS_REPLACED;
            break;
        case '8':
            orderStatus = Order.ORDER_STATUS_FAILED;
            break;
        default:
            orderStatus = null;
    }
    return orderStatus;
}

/**
 * This function is used to get order count by its state
 *
 * @param {Integer} orderState : The order state which request form API end point.
 *
 * @return {Object} payload : The order count JSON
 */
function getOrderCountByState(orderState) {
    var OrderMgr = require('dw/order/OrderMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var Constants = require('*/cartridge/scripts/utils/constants');

    var logLocation = 'LoyaltyOrderModel~orderCountByState';
    var orderCount;
    var orderItrator;
    try {
        orderItrator = OrderMgr.queryOrders('status = {0}', null, orderState);
        orderCount = orderItrator.count;
        orderItrator.close();
    } catch (ex) {
        YotpoLogger.logMessage('There was error in order count by state, ' +
                'therefore skipping record. ' + ex.message, 'error', logLocation);
        throw new Error(Constants.EXPORT_LOYALTY_ORDER_ERROR);
    }

    var payload = {
        orders: [orderCount]
    };

    return JSON.parse(JSON.stringify(payload));
}

/**
 * This function is used to get the order count by number of orders placed in specific time period.
 * By default it is 30 days but numberOfDays parameter is used to determine that
 *
 * @param {Integer} numberOfDays : The number of days which we want to get count
 *
 * @return {Object} payload : The JSON object of order counter
 */
function getOrderCountByVolume(numberOfDays) {
    var OrderMgr = require('dw/order/OrderMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var Constants = require('*/cartridge/scripts/utils/constants');

    var logLocation = 'LoyaltyOrderModel~orderCountByVolume';
    var queryDate = YotpoUtils.getPastDateFromDays(numberOfDays);
    var orderCount;
    var orderItrator;
    try {
        orderItrator = OrderMgr.queryOrders('creationDate >= {0}', null, queryDate);
        orderCount = orderItrator.count;
        orderItrator.close();
    } catch (ex) {
        YotpoLogger.logMessage('There was error in order count by volume, ' +
                'therefore skipping record. ' + ex.message, 'error', logLocation);
        throw new Error(Constants.EXPORT_LOYALTY_ORDER_ERROR);
    }
    var payload = {
        orders: [orderCount]
    };

    return JSON.parse(JSON.stringify(payload));
}

/**
 * This script calculates order discounts and applied coupons
 *
 * @param {dw.order.Order} order : The order object
 *
 * @returns {Object} discounts : The order discounts, coupon codes and gift certificate codes
 */
function getOrderDiscounts(order) {
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');

    var discounts = {
        orderDiscount: 0,
        couponCodes: '',
        giftCertificates: ''
    };

    var orderDiscount = 0;
    var priceAjustmentAmount = 0;

    var priceAdjustmentsIt = order.getPriceAdjustments().iterator();
    while (priceAdjustmentsIt.hasNext()) {
        var priceAdjustment = priceAdjustmentsIt.next();
        priceAjustmentAmount += priceAdjustment.getBasePrice().getValue();
    }

    orderDiscount = priceAjustmentAmount * -1;

    var giftCertificates = new Array();
    var giftCertificatePaymentInstrumentIt = order.getGiftCertificatePaymentInstruments().iterator();

    while (giftCertificatePaymentInstrumentIt.hasNext()) {
        var giftCertificatePayemntInstrument = giftCertificatePaymentInstrumentIt.next();
        giftCertificates.push(giftCertificatePayemntInstrument.getGiftCertificateCode());

        var paymentTransaction = giftCertificatePayemntInstrument.getPaymentTransaction();
        orderDiscount += paymentTransaction.getAmount().getValue();
    }

    var couponCodes = new Array();
    var couponLineItemIt = order.getCouponLineItems().iterator();
    while (couponLineItemIt.hasNext()) {
        var couponLineItem = couponLineItemIt.next();
        couponCodes.push(couponLineItem.couponCode);
    }

    discounts.orderDiscount = YotpoUtils.convertPriceIntoCents(orderDiscount);
    discounts.couponCodes = couponCodes;
    discounts.giftCertificates = giftCertificates;

    return discounts;
}

/**
 * This script prepares JSON for order line items.
 *
 * @param {dw.order.Order} order : The order object
 *
 * @returns {Object} lineItemsArray : The order line items in JSON format array
 */
function prepareOrderLineItemsJSON(order) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');

    var product;
    var productLineItem;
    var productID;
    var productName;
    var productPrice;
    var productCategory;
    var productType;
    var swellRedemptionID;
    var swellPointsUsed;
    var item;
    var lineItems = new Array();
    var productBasePrice;
    var productAdjustedTax;
    var productTax;
    var productTaxBasis;

    var prodLineItemIt = order.getAllProductLineItems().iterator();
    while (prodLineItemIt.hasNext()) {
        productLineItem = prodLineItemIt.next();
        product = ProductMgr.getProduct(productLineItem.productID);

        if (productLineItem.optionProductLineItem || !product) {
            continue; // eslint-disable-line no-continue
            // Skip the option product line item or product not found
        }

        productID = YotpoUtils.escape(product.ID, Constants.PRODUCT_REGEX_FOR_YOTPO_DATA, '-');
        productName = empty(product.name) ? ' ' : YotpoUtils.escape(product.name, Constants.REGEX_FOR_YOTPO_DATA, '');
        productPrice = YotpoUtils.convertPriceIntoCents(productLineItem.getGrossPrice().getValueOrNull());
        productBasePrice = YotpoUtils.convertPriceIntoCents(productLineItem.getBasePrice().getValueOrNull());
        productCategory = YotpoUtils.getCategoryPath(product);
        if (productLineItem.custom) {
            if ('swellRedemptionId' in productLineItem.custom) {
                swellRedemptionID = productLineItem.custom.swellRedemptionId;
            }
            if ('swellPointsUsed' in productLineItem.custom) {
                swellPointsUsed = productLineItem.custom.swellPointsUsed;
            }
        }
        productAdjustedTax = YotpoUtils.convertPriceIntoCents(productLineItem.getAdjustedTax().getValueOrNull());
        productTax = YotpoUtils.convertPriceIntoCents(productLineItem.getTax().getValueOrNull());
        productTaxBasis = YotpoUtils.convertPriceIntoCents(productLineItem.getTaxBasis().getValueOrNull());

        if (product.productSet) {
            productType = 'productSet';
        } else if (product.bundle) {
            productType = 'bundle';
        } else if (product.optionProduct) {
            productType = 'optionProduct';
        } else if (product.master) {
            productType = 'master';
        } else if (product.variant) {
            productType = 'variant';
        } else {
            productType = 'simple';
        }

        var productPriceAdjustmentsArray = new Array();
        var productPriceAdjustmentsIt = productLineItem.getPriceAdjustments().iterator();

        while (productPriceAdjustmentsIt.hasNext()) {
            var productPriceAjustment = productPriceAdjustmentsIt.next();
            var priceAjustment = {
                swell_redemption_id: productPriceAjustment.custom.swellRedemptionId ? productPriceAjustment.custom.swellRedemptionId : null,
                swell_points_used: productPriceAjustment.custom.swellPointsUsed ? productPriceAjustment.custom.swellPointsUsed : 0,
                reason_code: productPriceAjustment.reasonCode ? productPriceAjustment.reasonCode : null
            };
            productPriceAdjustmentsArray.push(priceAjustment);
        }

        item = {
            id: productID,
            name: productName,
            base_price_cents: productBasePrice,
            price_cents: productPrice,
            adjusted_tax_cents: productAdjustedTax,
            tax_cents: productTax,
            tax_basis_cents: productTaxBasis,
            quantity: productLineItem.quantityValue,
            type: productType,
            collections: productCategory,
            swell_redemption_id: swellRedemptionID,
            swell_points_used: swellPointsUsed,
            vendor: null,
            price_adjustments: productPriceAdjustmentsArray
        };

        lineItems.push(item);
    }

    return lineItems;
}
/**
 * This script will extract all order information
 * and will prepare the JSON for order.
 *
 * @param {dw.order.Order} order : The order object
 *
 * @returns {Object} orderJSON : The order JSON
 */
function prepareOrderJSON(order) {
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var logLocation = 'loyaltyOrderModel~prepareOrderJSON';

    if (!order) {
        throw Constants.YOTPO_ORDER_MISSING_ERROR;
    }
    var orderJSON;

    try {
        var orderCreationDate = order.creationDate.toISOString();
        var orderTotalPrice = YotpoUtils.convertPriceIntoCents(order.totalGrossPrice.value);

        var customerProfile = order.customer.profile;
        var customerEmail = null;

        if (!empty(customerProfile)) {
            customerEmail = empty(customerProfile.email) ? null : YotpoUtils.escape(customerProfile.email, Constants.REGEX_FOR_YOTPO_DATA, '');
        } else {
            customerEmail = empty(order.customerEmail) ? null : YotpoUtils.escape(order.customerEmail, Constants.REGEX_FOR_YOTPO_DATA, '');
        }

        if (!order.orderNo || !customerEmail || !order.currencyCode || !orderTotalPrice) {
            throw Constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR;
        }

        var discounts = getOrderDiscounts(order);
        var lineItemsJSONArray = prepareOrderLineItemsJSON(order);

        var shippingAddress = {
            address1: YotpoUtils.escape(order.defaultShipment.shippingAddress.address1, Constants.REGEX_FOR_YOTPO_DATA, ''),
            address2: YotpoUtils.escape(order.defaultShipment.shippingAddress.address2, Constants.REGEX_FOR_YOTPO_DATA, ''),
            first_name: YotpoUtils.escape(order.defaultShipment.shippingAddress.firstName, Constants.REGEX_FOR_YOTPO_DATA, ''),
            last_name: YotpoUtils.escape(order.defaultShipment.shippingAddress.lastName, Constants.REGEX_FOR_YOTPO_DATA, ''),
            phone: order.defaultShipment.shippingAddress.phone,
            zip: order.defaultShipment.shippingAddress.postalCode,
            country_code: order.defaultShipment.shippingAddress.countryCode.value
        };

        var billingAddress = {
            address1: YotpoUtils.escape(order.billingAddress.address1, Constants.REGEX_FOR_YOTPO_DATA, ''),
            address2: YotpoUtils.escape(order.billingAddress.address2, Constants.REGEX_FOR_YOTPO_DATA, ''),
            first_name: YotpoUtils.escape(order.billingAddress.firstName, Constants.REGEX_FOR_YOTPO_DATA, ''),
            last_name: YotpoUtils.escape(order.billingAddress.lastName, Constants.REGEX_FOR_YOTPO_DATA, ''),
            phone: order.billingAddress.phone,
            zip: order.billingAddress.postalCode,
            country_code: order.billingAddress.countryCode.value
        };

        var customerTags = new Array();
        var customerGroupIterator = order.customer.getCustomerGroups().iterator();

        while (customerGroupIterator.hasNext()) {
            var customerGroup = customerGroupIterator.next();
            customerTags.push(customerGroup.ID);
        }

        var customerJSON = {
            id: order.getCustomerNo(),
            first_name: null,
            last_name: null,
            email: null,
            tags: customerTags
        };

        if (empty(customerProfile)) {
            // is this a registered user checking out as a guest user? If so, send their registered user customer number
            var LoyaltyCustomerModel = require('*/cartridge/models/loyalty/common/loyaltyCustomerModel');
            var params = {
                email: customerEmail,
                singleCustomer: true
            };
            customerProfile = LoyaltyCustomerModel.searchCustomer(params);
        }

        if (!empty(customerProfile)) {
            customerJSON.id = customerProfile.customerNo;
            customerJSON.first_name = YotpoUtils.escape(customerProfile.firstName, Constants.REGEX_FOR_YOTPO_DATA, '');
            customerJSON.last_name = YotpoUtils.escape(customerProfile.lastName, Constants.REGEX_FOR_YOTPO_DATA, '');
            customerJSON.email = YotpoUtils.escape(customerProfile.email, Constants.REGEX_FOR_YOTPO_DATA, '');
        }

        var orderPriceAjustments = new Array();
        var orderPriceAjustmentsIt = order.getPriceAdjustments().iterator();

        while (orderPriceAjustmentsIt.hasNext()) {
            var orderPriceAjustment = orderPriceAjustmentsIt.next();
            var priceAjustment = {
                swell_redemption_id: orderPriceAjustment.custom.swellRedemptionId ? orderPriceAjustment.custom.swellRedemptionId : null,
                swell_points_used: orderPriceAjustment.custom.swellPointsUsed ? orderPriceAjustment.custom.swellPointsUsed : 0,
                reason_code: orderPriceAjustment.reasonCode ? orderPriceAjustment.reasonCode : null
            };
            orderPriceAjustments.push(priceAjustment);
        }

        var adjustedMerchandizeTotalTax = YotpoUtils.convertPriceIntoCents(order.getAdjustedMerchandizeTotalTax().getValueOrNull());
        var adjustedShippingTotalTax = YotpoUtils.convertPriceIntoCents(order.getAdjustedShippingTotalTax().getValueOrNull());
        var merchandizeTotalTax = YotpoUtils.convertPriceIntoCents(order.getMerchandizeTotalTax().getValueOrNull());
        var shippingTotal = YotpoUtils.convertPriceIntoCents(order.getShippingTotalPrice().getValueOrNull());
        var shippingTotalTax = YotpoUtils.convertPriceIntoCents(order.getShippingTotalTax().getValueOrNull());
        var shippingStatus = order.getShippingStatus().getDisplayValue();
        var paymentStatus = order.getPaymentStatus().getDisplayValue();
        var giftCertificateTotalTax = YotpoUtils.convertPriceIntoCents(order.getGiftCertificateTotalTax().getValueOrNull());
        var taxTotal = YotpoUtils.convertPriceIntoCents(order.getTotalTax().getValueOrNull());
        var productSubTotal = 0;
        var productTotal = 0;

        var orderProductsLineItemsIt = order.getAllProductLineItems().iterator();
        while (orderProductsLineItemsIt.hasNext()) {
            var productLineItem = orderProductsLineItemsIt.next();
            productSubTotal += YotpoUtils.convertPriceIntoCents(productLineItem.getBasePrice().getValueOrNull());
            productTotal += YotpoUtils.convertPriceIntoCents(productLineItem.getGrossPrice().getValueOrNull());
        }

        orderJSON = {
            user_agent: order.custom.userAgent,
            ip_address: order.custom.userIPAddress,
            order_id: order.orderNo,
            created_at: orderCreationDate,
            status: order.status.value,
            discount_amount_cents: discounts.orderDiscount,
            coupon_code: discounts.couponCodes,
            gift_certificates: discounts.giftCertificates,
            currency_code: order.currencyCode,
            total_amount_cents: orderTotalPrice,
            adjusted_merchandize_total_tax_cents: adjustedMerchandizeTotalTax,
            adjusted_shipping_total_tax_cents: adjustedShippingTotalTax,
            merchandize_total_tax_cents: merchandizeTotalTax,
            payment_status: paymentStatus,
            product_sub_total_cents: productSubTotal,
            product_total_cents: productTotal,
            shipping_status: shippingStatus,
            shipping_total_cents: shippingTotal,
            shipping_total_tax_cents: shippingTotalTax,
            gift_certificate_total_tax_cents: giftCertificateTotalTax,
            tax_total_cents: taxTotal,
            order_price_adjustments: orderPriceAjustments,
            customer_email: customerEmail,
            customer_id: order.getCustomerNo(),
            shipping_address: shippingAddress,
            billing_address: billingAddress,
            customer: customerJSON,
            items: lineItemsJSONArray
        };
    } catch (e) {
        YotpoLogger.logMessage('Some error occurred while preparing order JSON for order number: ' +
            order.orderNo + '\nException is: ' + e, 'error', logLocation);
        throw Constants.EXPORT_LOYALTY_ORDER_ERROR;
    }

    return orderJSON;
}

/**
 * This function used to prepare orders JSON for multiple orders
 *
 * @param {SeekableIterator} orderIterator : The orderIterator from query frame work
 *
 * @return {Object} payload : The payload for response
 */
function prepareOrdersJSON(orderIterator) {
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'loyaltyOrderModel~prepareOrdersJSON';

    var orderList = new Array();
    var order;
    var totalOrders = 0;

    if (orderIterator) {
        var orderJSON;
        totalOrders = orderIterator.count;

        while (orderIterator.hasNext()) {
            order = orderIterator.next();
            try {
                orderJSON = prepareOrderJSON(order);
                orderList.push(orderJSON);
            } catch (ex) {
                YotpoLogger.logMessage('There was error in preparing JSON for order, ' +
                        'therefore skipping record.', 'debug', logLocation);
            }
        }
        orderIterator.close();
    }

    var payload = {
        orders: orderList,
        last_page: totalOrders
    };

    return JSON.parse(JSON.stringify(payload));
}

/**
 * This function is used to set order custom attributes
 * @param {dw.order.Order} order : The order which needs to set the custom attributes
 *
 * @return {Object} currentOrder : The order which have custom attributes
 */
function saveUserInfoInOrder(order) {
    var Transaction = require('dw/system/Transaction');

    var userAgent = request.httpUserAgent || '';
    var userIPAddress = request.httpRemoteAddress || '';

    var currentOrder = order;
    Transaction.wrap(function () {
        if (currentOrder) {
            currentOrder.custom.userAgent = userAgent;
            currentOrder.custom.userIPAddress = userIPAddress;
        }
    });

    return currentOrder;
}
/**
 * This function is used to search orders using query frame work on the bases of order state
 *
 * @param {Integer} orderState : The order state which is a integer value
 * @param {Integer} page : The starting index of orders
 * @param {Integer} pageSize : The ending index of orders
 *
 * @return {Object} orderIterator : The order iterator of orders
 */
function searchOrders(orderState, page, pageSize) {
    var OrderMgr = require('dw/order/OrderMgr');
    var orderIterator;
    orderIterator = OrderMgr.queryOrders('status = {0}', 'orderNo ASC', orderState);
    orderIterator.forward(page, pageSize);

    return orderIterator;
}

exports.getOrderState = getOrderState;
exports.getOrderCountByState = getOrderCountByState;
exports.getOrderCountByVolume = getOrderCountByVolume;
exports.prepareOrderJSON = prepareOrderJSON;
exports.prepareOrdersJSON = prepareOrdersJSON;
exports.searchOrders = searchOrders;
exports.saveUserInfoInOrder = saveUserInfoInOrder;
