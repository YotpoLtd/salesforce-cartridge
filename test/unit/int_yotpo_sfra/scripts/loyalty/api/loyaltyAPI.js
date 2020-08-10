'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyAPI', () => {
    let loggerSpy = {
        logMessage: sinon.spy()
    };

    const loyaltyOrderModel = {
        getOrderState: () => {
            return 'pending';
        },
        getOrderCountByState: () => {
            return 5;
        },
        getOrderCountByVolume: () => {
            return 10;
        },
        searchOrders: () => {
            return {};
        },
        prepareOrdersJSON: () => {
            return {
                unitTest: 'fake ResponseJson'
            };
        },
        prepareOrderJSON: () => {
            return {
                unitTest: 'fake ResponseJson'
            };
        }
    };

    const loyaltyCustomerModel = {
        searchCustomer: () => {},
        searchCustomers: () => {},
        prepareCustomersJSON: () => {},
        prepareCustomerJSON: () => {
            return {
                unitTest: 'fake ResponseJson'
            };
        }
    };

    let yotpoConfigurationModel = {
        validateLoyaltyApiKey: sinon.stub()
    };

    const giftCertMgr = {
        createGiftCertificate: () => {
            return {
                getGiftCertificateCode: () => {},
                setSenderName: () => {},
                setRecipientName: () => {},
                setRecipientEmail: () => {},
                setDescription: () => {},
                setMessage: () => {},
                getMerchantID: () => {}
            };
        }
    };

    const CouponMgr = {
        getCoupon: () => {
            return {
                getNextCouponCode: () => true
            };
        }
    };

    const loyaltyAPI = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/loyalty/api/loyaltyAPI.js', {
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/model/common/yotpoConfigurationModel': yotpoConfigurationModel,
        '*/cartridge/scripts/model/loyalty/common/loyaltyCustomerModel': loyaltyCustomerModel,
        '~/cartridge/scripts/model/loyalty/common/loyaltyOrderModel': loyaltyOrderModel,
        'dw/order/GiftCertificateMgr': giftCertMgr,
        'dw/campaign/CouponMgr': CouponMgr
    });

    beforeEach(function () {
        loggerSpy.logMessage.reset();
        yotpoConfigurationModel.validateLoyaltyApiKey.reset();
    });

    describe('fetchCustomers', () => {
        it('return an error when called without a key.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
            let customers = loyaltyAPI.fetchCustomers({});
            assert.equal(customers.status, '400');
        });

        it('return an error when called missing params.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
            let customers = loyaltyAPI.fetchCustomers({
                apiKey: 'theKey'
            });
            assert.equal(customers.status, '400');
        });

        it('return an error when called api validation fails.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(false);
            let result = loyaltyAPI.fetchCustomers({
                apiKey: 'key',
                locale: 'default',
                singleCustomer: true,
                customerNo: '123'
            });
            assert.equal(result.status, '401');
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
        });
        it('returns a 404 for a missing customer customer.', () => {
            let searchStub = sinon.stub(loyaltyCustomerModel, 'searchCustomer');
            searchStub.returns();
            let params = {
                apiKey: 'key',
                locale: 'default',
                singleCustomer: true,
                customerNo: '123'
            };
            let customers = loyaltyAPI.fetchCustomers(params);
            sinon.assert.calledWithMatch(searchStub, params);
            assert.equal(customers.status, '404');
            searchStub.restore();
        });
        it('return a single customer.', () => {
            let searchStub = sinon.stub(loyaltyCustomerModel, 'searchCustomer');
            searchStub.returns({});
            let params = {
                apiKey: 'key',
                locale: 'default',
                singleCustomer: true,
                customerNo: '123'
            };
            let customers = loyaltyAPI.fetchCustomers(params);
            // sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/There was error in order count by state, therefore skipping record./), 'error', 'LoyaltyOrderModel~orderCountByState');
            sinon.assert.calledWithMatch(searchStub, params);
            assert.equal(customers.status, '200');
            searchStub.restore();
        });

        it('return a multi customer call.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
            let searchStub = sinon.stub(loyaltyCustomerModel, 'searchCustomer');
            searchStub.returns({});
            let params = {
                apiKey: 'key',
                locale: 'default',
                singleCustomer: false,
                startIndex: 1,
                pageSize: 1,
                customerNo: '123'
            };
            let customers = loyaltyAPI.fetchCustomers(params);
            assert.equal(customers.status, '200');
            searchStub.restore();
        });

        it('log an error on failure to search.', () => {
            let searchStub = sinon.stub(loyaltyCustomerModel, 'searchCustomer');
            searchStub.throws(Error);
            let params = {
                apiKey: 'key',
                locale: 'default',
                singleCustomer: true,
                customerNo: '123'
            };
            let customers = loyaltyAPI.fetchCustomers(params);
            assert.equal(customers.status, '500');
            searchStub.restore();
        });
    });

    describe('getOrdersCount', () => {
        it('return an error when called without a key.', () => {
            let result = loyaltyAPI.getOrdersCount({});
            assert.equal(result.status, '400');
        });

        it('return an error when called api validation fails.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(false);
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default'
            });
            assert.equal(result.status, '401');
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
        });

        it('return a count by volume.', () => {
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default'
            });
            assert.equal(result.status, '200');
            assert.equal(result.responseJSON, '10');
        });

        it('fail to get count by state without a state.', () => {
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default',
                orderCountByState: true
            });
            assert.equal(result.status, '400');
        });
        it('return a count by state.', () => {
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default',
                orderCountByState: true,
                state: 'pending'
            });
            assert.equal(result.status, '200');
            assert.equal(result.responseJSON, '5');
        });

        it('log an error on failure to search.', () => {
            let searchStub = sinon.stub(loyaltyOrderModel, 'getOrderState');
            searchStub.returns(null);
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default',
                orderCountByState: true,
                state: 'pending'
            });
            assert.equal(result.status, '400');
            searchStub.restore();
        });
        it('log an error on failure to get orders by volume.', () => {
            let searchStub = sinon.stub(loyaltyOrderModel, 'getOrderCountByVolume');
            searchStub.throws(Error);
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default',
                state: 'pending'
            });
            assert.equal(result.status, '500');
            searchStub.restore();
        });
    });

    describe('fetchOrders', () => {
        it('return an error when called without a key.', () => {
            let result = loyaltyAPI.fetchOrders({});
            assert.equal(result.status, '400');
        });

        it('return an error when called api validation fails.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(false);
            let result = loyaltyAPI.fetchOrders({
                apiKey: 'key',
                orderId: 'orderId',
                singleOrder: true
            });
            assert.equal(result.status, '401');
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
        });

        it('log an error on failure to search.', () => {
            let searchStub = sinon.stub(loyaltyOrderModel, 'getOrderState');
            searchStub.returns(null);
            let result = loyaltyAPI.getOrdersCount({
                apiKey: 'key',
                locale: 'default',
                orderCountByState: true,
                state: 'pending'
            });
            assert.equal(result.status, '400');
            searchStub.restore();
        });
        it('return an error when called missing params.', () => {
            let result = loyaltyAPI.fetchOrders({
                apiKey: 'key',
                singleOrder: true
            });
            assert.equal(result.status, '400');
        });
        it('Fetch single Order.', () => {
            let result = loyaltyAPI.fetchOrders({
                apiKey: 'key',
                orderId: 'orderId',
                singleOrder: true
            });
            assert.equal(result.status, '200');
        });

        it('Fetch multiple Orders.', () => {
            let result = loyaltyAPI.fetchOrders({
                apiKey: 'key',
                orderId: 'orderId',
                singleOrder: false,
                page: 1,
                pageSize: 5
            });
            assert.equal(result.status, '200');
        });
        it('log an error on failure to get multiple orders.', () => {
            let searchStub = sinon.stub(loyaltyOrderModel, 'prepareOrdersJSON');
            searchStub.throws(Error);
            let result = loyaltyAPI.fetchOrders({
                apiKey: 'key',
                orderId: 'orderId',
                singleOrder: false,
                page: 1,
                pageSize: 5
            });
            assert.equal(result.status, '500');
            searchStub.restore();
        });
    });


    describe('createGiftCertificate', () => {
        it('return an error when called without a key.', () => {
            let result = loyaltyAPI.createGiftCertificate({});
            assert.equal(result.status, '401');
        });
        it('return an error when called with missing params.', () => {
            let result = loyaltyAPI.createGiftCertificate({
                apiKey: 'theKey'
            });
            assert.equal(result.status, '400');
        });

        it('return an error when called api validation fails.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(false);
            let result = loyaltyAPI.createGiftCertificate({
                apiKey: 'theKey',
                amount: 5
            });
            assert.equal(result.status, '401');
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
        });
        it('Should return a gift cert.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
            let result = loyaltyAPI.createGiftCertificate({
                apiKey: 'theKey',
                amount: 5,
                senderName: 'name',
                recipientName: 'name',
                recipientEmail: 'email',
                description: 'desc',
                message: 'message'
            });
            assert.equal(result.status, '200');
        });

        it('Should an error if it failes to create the cert.', () => {
            let giftSub = sinon.stub(giftCertMgr, 'createGiftCertificate');
            giftSub.throws(Error);
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
            let result = loyaltyAPI.createGiftCertificate({
                apiKey: 'theKey',
                amount: 5,
                senderName: 'name',
                recipientName: 'name',
                recipientEmail: 'email',
                description: 'desc',
                message: 'message'
            });
            assert.equal(result.status, '500');
        });
    });


    describe('getNextCouponCode', () => {
        it('return an error when called without a key.', () => {
            let result = loyaltyAPI.getNextCouponCode({});
            assert.equal(result.status, '400');
        });
        it('return an error when called api validation fails.', () => {
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(false);
            let result = loyaltyAPI.getNextCouponCode({
                apiKey: 'theKey'
            });
            assert.equal(result.status, '401');
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
        });
        it('Should return a gift code.', () => {
            let result = loyaltyAPI.getNextCouponCode({
                apiKey: 'theKey'
            });
            assert.equal(result.status, '200');
        });

        it('Should an error if it failes to get the code.', () => {
            let stub = sinon.stub(CouponMgr, 'getCoupon');
            stub.throws(Error);
            yotpoConfigurationModel.validateLoyaltyApiKey.returns(true);
            let result = loyaltyAPI.getNextCouponCode({
                apiKey: 'theKey'
            });
            assert.equal(result.status, '500');
        });
    });
});
