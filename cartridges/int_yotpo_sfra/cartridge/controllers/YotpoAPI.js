'use strict';

var HTTP_ERROR_STATUS = 422;
var server = require('server');

/**
 * AddProductToCart : Helps the creation of new cart item via the Yotpo JavaScript toolset.
 * Currently, OCAPI cannot create an item if the user's cart doesn't exist yet.
 * This is a workaround. Moments later, an OCAPI call from Yotpo updates the price of the newly created item.
 *
 * Expects a querystring parameter "sku" cooresponding to the productID of the "free" product being added.
 *
 * @name AddProductToCart
 * @function
 * @param {category} - non-sensitive
 * @param {renders} - json
 * @param {serverfunction} - get
 */
server.get('AddProductToCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to add a free product to the cart',
        'debug', 'YotpoAPI~AddProductToCart');
    var sku = req.querystring.sku;

    if (empty(sku)) {
        // bail out if no sku presnt
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({ error_message: 'expecting "sku" parameter in querystring' });
        next();
        return;
    }

    if (ProductMgr.getProduct(sku)) {
        var Transaction = require('dw/system/Transaction');
        var HookMgr = require('dw/system/HookMgr');

        Transaction.wrap(function () {
            try {
                var basket = BasketMgr.getCurrentOrNewBasket();
                var lineitem = basket.createProductLineItem(sku, basket.shipments[0]);
                lineitem.setQuantityValue(1);
                HookMgr.callHook('dw.order.calculate', 'calculate', basket);

                res.setStatusCode(200);
                res.json({ basket_id: basket.UUID });
            } catch (e) {
                res.setStatusCode(HTTP_ERROR_STATUS);
                res.json({ error_message: e.message });
            }
        });
    } else {
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({ error_message: 'product does not exist' });
    }

    next();
});

/**
 * RemoveProductFromCart : Called by the Yotpo JavaScript toolset. Remove all products matching the incoming sku.
 *
 * Expects a querystring parameter "sku" cooresponding to the productID of the product being removed.
 * Used closely in tandem with the concept of "free" product and its removal if some failure occurs.
 * Basket must be present.
 *
 * @name RemoveProductToCart
 * @function
 * @param {category} - non-sensitive
 * @param {renders} - json
 * @param {serverfunction} - get
 */
server.get('RemoveProductFromCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to remove product from basket',
        'debug', 'YotpoAPI~RemoveProductFromCart');
    var sku = req.querystring.sku;

    if (empty(sku)) {
        // bail out if no sku presnt
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({ error_message: 'expecting "sku" parameter in querystring' });
        next();
        return;
    }

    var basket = BasketMgr.getCurrentBasket();
    if (empty(basket)) {
        // bail out if no basket presnt
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({ error_message: 'expecting session contains currentBasket. None present. Aborting.' });
        next();
        return;
    }

    if (ProductMgr.getProduct(sku)) {
        var Transaction = require('dw/system/Transaction');
        var HookMgr = require('dw/system/HookMgr');

        Transaction.wrap(function () {
            try {
                var lineitems = basket.getAllProductLineItems(sku);

                for (var i = 0; i < lineitems.length; i++) {
                    basket.removeProductLineItem(lineitems[i]);
                }

                HookMgr.callHook('dw.order.calculate', 'calculate', basket);
                res.setStatusCode(200);
                res.json({});
            } catch (e) {
                res.setStatusCode(HTTP_ERROR_STATUS);
                res.json({ error_message: e.message });
            }
        });
    } else {
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({ error_message: 'product does not exist in catalog, so it cannot be removed.' });
    }

    next();
});

module.exports = server.exports();
