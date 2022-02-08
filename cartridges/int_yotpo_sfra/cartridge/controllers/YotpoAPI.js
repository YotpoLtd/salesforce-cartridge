var HTTP_ERROR_STATUS = 422;

/**
 * AddProductToCart : Helps the creation of new cart item via the Yotpo JavaScript toolset. 
 * Currently, OCAPI cannot create an item if the user's cart doesn't exist yet. 
 * This is a workaround. Moments later, an OCAPI call from Yotpo updates the price of the newly created item.
 * 
 * Expects a querystring parameter "sku" cooresponding to the productID of the "free" product being added.
 * 
 * @name AddProductToCart
 * @function
 * @param {middleware} - server.middleware.include
 * @param {middleware} - cache.applyDefaultCache
 * @param {category} - non-sensitive
 * @param {renders} - json
 * @param {serverfunction} - get
 */
server.get('AddProductToCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to add a free product to the cart',
        'debug', 'YotpoLoyalty~FreeProduct~AddProductToCart');    
    var sku = req.querystring.sku;    

    if (empty(sku)) {
        // bail out if no sku presnt
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({error_message: 'expecting "sku" parameter in querystring'});
        next();
        return;
    }

    if (ProductMgr.getProduct(sku)) {
        var Transaction = require('dw/system/Transaction');
        var ProductMgr = require('dw/catalog/ProductMgr');
        var calculator = require('app_storefront_base/cartridge/scripts/hooks/cart/calculate');
        Transaction.wrap(function() {
            try {                                
                var basket = BasketMgr.getCurrentOrNewBasket();
                var lineitem = basket.createProductLineItem(sku, basket.shipments[0]);
                lineitem.setQuantityValue(1);
                calculator.calculate(basket);

                res.setStatusCode(200);
                res.json({basket_id: basket.UUID});
               
            } catch (e) {
                res.setStatusCode(HTTP_ERROR_STATUS);
                res.json({error_message: e.message});
            }
        });
    } else {
        res.setStatusCode(HTTP_ERROR_STATUS);
        res.json({error_message: 'product does not exist'});
    }

    next();
});

server.get('RemoveProductFromCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch single customer',
        'debug', 'YotpoLoyalty~GetCustomer');
    var Transaction = require('dw/system/Transaction');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var basketCalculationHelpers = require('app_storefront_base/cartridge/scripts/helpers/basketCalculationHelpers');
    var basket = BasketMgr.getCurrentBasket();
    var sku = req.querystring.sku

    if (!basket) {
        res.setStatusCode(500);
        res.json({});
        return next();
    }

    if (ProductMgr.getProduct(sku)) {
        Transaction.wrap(function (){
            try {
                var lineitems = basket.getAllProductLineItems(sku);

                for (var i = 0; i < lineitems.length; i++) {
                    basket.removeProductLineItem(lineitems[i]);
                }

                basketCalculationHelpers.calculateTotals(basket);
                res.setStatusCode(200);
                res.json({});
            } catch (e) {
                res.setStatusCode(422);
                res.json({error_message: e.message});
            }
        });
    } else {
        res.setStatusCode(422);
        res.json({error_message: 'product does not exist'});
    }

    next();
});