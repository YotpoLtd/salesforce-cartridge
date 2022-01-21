server.get('AddProductToCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    YotpoLogger.logMessage('Received request to fetch single customer',
        'debug', 'YotpoLoyalty~GetCustomer');
    var calculator = require('app_storefront_base/cartridge/scripts/hooks/cart/calculate');
    var Transaction = require('dw/system/Transaction');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var basket = BasketMgr.getCurrentOrNewBasket();
    var sku = req.querystring.sku

    if (ProductMgr.getProduct(sku)) {
        Transaction.wrap(function() {
            try {
                var lineitem = basket.createProductLineItem(sku, basket.shipments[0]);
                lineitem.setQuantityValue(1);
                calculator.calculate(basket);

                res.setStatusCode(200);
                res.json({basket_id: basket.UUID});
               
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