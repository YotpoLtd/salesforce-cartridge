'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyOrderModel', () => {
    let loggerSpy = { logMessage: sinon.spy() };
    let orderMgr = {
        queryOrders: () => {
            return {
                count: 25,
                close: () => {}
            };
        }
    };
    let fakeProduct = {
        ID: 'fakeProductId',
        name: 'fake product name',
        productSet: 'simple',
        isVariant: () => { return false; },
        getPrimaryCategory: () => {
            return {
                parent: {},
                online: true,
                getDisplayName: () => { return 'Fake Category Name'; }
            };
        }
    };
    let fakeCurrency = {
        currencyCode: 'USD',
        getCurrency: () => {
            return fakeCurrency;
        },
        getDefaultFractionDigits: () => {
            return 2;
        }
    }

    const yotpoUtils = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoUtils', {
        'dw/system/Logger': loggerSpy,
        'dw/util/StringUtils': sinon.stub(),
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        'dw/util/Currency': fakeCurrency
    });

    const loyaltyOrderModel = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/models/loyalty/common/loyaltyOrderModel.js', {
        'dw/order/Order': {
            ORDER_STATUS_CREATED: 0,
            ORDER_STATUS_NEW: 3,
            ORDER_STATUS_OPEN: 4,
            ORDER_STATUS_COMPLETED: 5,
            ORDER_STATUS_CANCELLED: 6,
            ORDER_STATUS_REPLACED: 7,
            ORDER_STATUS_FAILED: 8
        },
        'dw/order/OrderMgr': orderMgr,
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoUtils': yotpoUtils,
        'dw/catalog/ProductMgr': { getProduct: () => { return fakeProduct; } }
    });

    beforeEach(function () {
        loggerSpy.logMessage.reset();
    });
    describe('getOrderState', () => {
        it('should return null for an invalid state.', () => {
            assert.isNull(loyaltyOrderModel.getOrderState('porkchop'));
        });
        it('should get an ID for each state.', () => {
            assert.equal(loyaltyOrderModel.getOrderState('0'), 0);
            assert.equal(loyaltyOrderModel.getOrderState('3'), 3);
            assert.equal(loyaltyOrderModel.getOrderState('4'), 4);
            assert.equal(loyaltyOrderModel.getOrderState('5'), 5);
            assert.equal(loyaltyOrderModel.getOrderState('6'), 6);
            assert.equal(loyaltyOrderModel.getOrderState('7'), 7);
            assert.equal(loyaltyOrderModel.getOrderState('8'), 8);
        });
    });
    describe('getOrderCountByState', () => {
        it('Should return an empty array containing length of number of matched orders', () => {
            let orderArray = loyaltyOrderModel.getOrderCountByState('QUEUED');
            assert.equal(orderArray.orders[0], 25);
        });
        it('Should log if the iterator throws', () => {
            let queryOrders = sinon.stub(orderMgr, 'queryOrders');
            queryOrders.throws(new Error());
            assert.throws(() => loyaltyOrderModel.getOrderCountByState({}), /EXPORT_LOYALTY_ORDER_ERROR/);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/There was error in order count by state, therefore skipping record./), 'error', 'LoyaltyOrderModel~orderCountByState');
            queryOrders.restore();
        });
    });
    describe('getOrderCountByVolume', () => {
        it('Should return an empty array containing length of number of matched orders', () => {
            let orderArray = loyaltyOrderModel.getOrderCountByVolume('QUEUED');
            assert.equal(orderArray.orders[0], 25);
        });
        it('Should log if the iterator throws', () => {
            let queryOrders = sinon.stub(orderMgr, 'queryOrders');
            queryOrders.throws(new Error());
            assert.throws(() => loyaltyOrderModel.getOrderCountByVolume({}), /EXPORT_LOYALTY_ORDER_ERROR/);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/There was error in order count by volume, therefore skipping record./), 'error', 'LoyaltyOrderModel~orderCountByVolume');
            queryOrders.restore();
        });
    });

    describe('prepareOrderJSON', () => {
        let order = {
            orderNo: 123,
            currencyCode: 'USD',
            orderTotalPrice: 99.99,
            creationDate: new Date(),
            totalGrossPrice: { value: 99.99 },
            customerEmail: 'test@email.com',
            defaultShipment: {
                shippingAddress: {
                    address1: '123 test st',
                    address2: '',
                    firstName: 'first',
                    lastName: 'last',
                    phone: '3135551212',
                    postalCode: '12345',
                    countryCode: { value: 'US' }
                }
            },
            billingAddress: {
                address1: '123 test st',
                address2: '',
                firstName: 'first',
                lastName: 'last',
                phone: '3135551212',
                postalCode: '12345',
                countryCode: { value: 'US' }
            },
            custom: {
                userAgent: 'unitTest',
                userIPAddress: '172.21.2.235'
            },
            status: {
                value: 'OPEN'
            },
            getCustomerNo: () => { return 'Cust123'; },
            getAdjustedMerchandizeTotalTax: () => { return { getValueOrNull: () => { return '5'; } }; },
            getAdjustedShippingTotalTax: () => { return { getValueOrNull: () => { return '5'; } }; },
            getMerchandizeTotalTax: () => { return { getValueOrNull: () => { return '5'; } }; },
            getShippingTotalPrice: () => { return { getValueOrNull: () => { return '5'; } }; },
            getShippingTotalTax: () => { return { getValueOrNull: () => { return '5'; } }; },
            getShippingStatus: () => { return { getDisplayValue: () => { return 'shipped'; } }; },
            getPaymentStatus: () => { return { getDisplayValue: () => { return 'paid'; } }; },
            getGiftCertificateTotalTax: () => { return { getValueOrNull: () => { return '0'; } }; },
            getTotalTax: () => { return { getValueOrNull: () => { return '0'; } }; },
            customer: {
                profile: {
                    customerNo: 'Cust123',
                    firstName: 'first',
                    lastName: 'last',
                    email: 'spam@test.com'
                },
                getCustomerGroups: () => {
                    return {
                        iterator: () => {
                            return {
                                hasNext: () => { if (!this.getCustomerGroupsNext) { this.getCustomerGroupsNext = true; return true; } return false; },
                                next: () => {
                                    return {
                                        ID: 'GroupId'
                                    };
                                }
                            };
                        }
                    };
                }
            },
            getPriceAdjustments: () => {
                return {
                    iterator: () => {
                        return {
                            hasNext: () => { return this.getPriceAdjustmentsNext = !this.getPriceAdjustmentsNext; },  //eslint-disable-line
                            next: () => {
                                return {
                                    getBasePrice: () => { return { getValue: () => { return 100; } }; },
                                    custom: {
                                        swellPointsUsed: 25,
                                        swellRedemptionId: 'redemption id'
                                    },
                                    reasonCode: 'just cause'
                                };
                            }
                        };
                    }
                };
            },
            getGiftCertificatePaymentInstruments: () => {
                return {
                    iterator: () => {
                        return {
                            hasNext: () => { if (!this.getGiftCertificatePaymentInstrumentsNext) { this.getGiftCertificatePaymentInstrumentsNext = true; return true; } return false; },
                            next: () => {
                                return {
                                    getGiftCertificateCode: () => { return 'some Gift Cert Code'; },
                                    getPaymentTransaction: () => {
                                        return {
                                            getAmount: () => {
                                                return {
                                                    getValue: () => {
                                                        return 25;
                                                    }
                                                };
                                            }
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            },
            getCouponLineItems: () => {
                return {
                    iterator: () => {
                        return {
                            hasNext: () => { if (!this.getCouponLineItemsNext) { this.getCouponLineItemsNext = true; return true; } return false; },
                            next: () => { return { couponCode: 'CouponCode' }; }
                        };
                    }
                };
            },
            getAllProductLineItems: () => {
                return {
                    iterator: () => {
                        return {
                            hasNext: () => { return this.getAllProductLineItemsNext = !this.getAllProductLineItemsNext; }, //eslint-disable-line
                            next: () => {
                                return {
                                    productID: 'fakeProductId',
                                    getGrossPrice: () => { return { getValueOrNull: () => { return '29.99'; } }; },
                                    getBasePrice: () => { return { getValueOrNull: () => { return '29.99'; } }; },
                                    getAdjustedTax: () => { return { getValueOrNull: () => { return '2'; } }; },
                                    getTax: () => { return { getValueOrNull: () => { return '5'; } }; },
                                    getTaxBasis: () => { return { getValueOrNull: () => { return '10'; } }; },
                                    getPriceAdjustments: () => {
                                        return {
                                            iterator: () => {
                                                return {
                                                    hasNext: () => { if (!this.getPriceAdjustments) { this.getPriceAdjustments = true; return true; } return false; },
                                                    next: () => {
                                                        return {
                                                            custom: {
                                                                swellPointsUsed: 25,
                                                                swellRedemptionId: 'redemption id'
                                                            },
                                                            reasonCode: 'just cause'
                                                        };
                                                    }
                                                };
                                            }
                                        };
                                    },
                                    custom: {
                                        swellRedemptionId: '123',
                                        swellPointsUsed: 25
                                    }
                                };
                            }
                        };
                    }
                };
            },
            getCurrencyCode: () => {
                return 'USD';
            }
        };
        it('Should Throw an error if the order is missing', () => {
            assert.throws(() => loyaltyOrderModel.prepareOrderJSON(), /YOTPO_ORDER_MISSING_ERROR/);
        });
        it('Should Throw an error if the orderNo is missing', () => {
            delete order.orderNo;
            assert.throws(() => loyaltyOrderModel.prepareOrderJSON(order), /EXPORT_LOYALTY_ORDER_ERROR/);
            order.orderNo = 123;
        });
        it('Should format an order', () => {
            let orderJson = loyaltyOrderModel.prepareOrderJSON(order);
            let orderResult = {
                'adjusted_merchandize_total_tax_cents': 500,
                'adjusted_shipping_total_tax_cents': 500,
                'billing_address': {
                    'address1': '123 test st',
                    'address2': '',
                    'country_code': 'US',
                    'first_name': 'first',
                    'last_name': 'last',
                    'phone': '3135551212',
                    'zip': '12345'
                },
                'coupon_code': [
                    'CouponCode'
                ],
                'currency_code': 'USD',
                'customer': {
                    'email': 'spam@test.com',
                    'first_name': 'first',
                    'id': 'Cust123',
                    'last_name': 'last',
                    'tags': [
                        'GroupId'
                    ]
                },
                'customer_email': 'spam@test.com',
                'customer_id': 'Cust123',
                'discount_amount_cents': -7500,
                'gift_certificate_total_tax_cents': 0,
                'gift_certificates': [
                    'some Gift Cert Code'
                ],
                'ip_address': '172.21.2.235',
                'items': [
                    {
                        'adjusted_tax_cents': 200,
                        'base_price_cents': 2999,
                        'collections': 'Fake Category Name',
                        'id': 'fakeProductId',
                        'name': 'fake product name',
                        'price_adjustments': [
                            {
                                'reason_code': 'just cause',
                                'swell_points_used': 25,
                                'swell_redemption_id': 'redemption id'
                            }
                        ],
                        'price_cents': 2999,
                        'quantity': undefined,
                        'swell_points_used': 25,
                        'swell_redemption_id': '123',
                        'tax_basis_cents': 1000,
                        'tax_cents': 500,
                        'type': 'productSet',
                        'vendor': null
                    }
                ],
                'merchandize_total_tax_cents': 500,
                'order_id': 123,
                'order_price_adjustments': [
                    {
                        'reason_code': 'just cause',
                        'swell_points_used': 25,
                        'swell_redemption_id': 'redemption id'
                    }
                ],
                'payment_status': 'paid',
                'product_sub_total_cents': 2999,
                'product_total_cents': 2999,
                'shipping_address': {
                    'address1': '123 test st',
                    'address2': '',
                    'country_code': 'US',
                    'first_name': 'first',
                    'last_name': 'last',
                    'phone': '3135551212',
                    'zip': '12345'
                },
                'shipping_status': 'shipped',
                'shipping_total_cents': 500,
                'shipping_total_tax_cents': 500,
                'status': 'OPEN',
                'tax_total_cents': 0,
                'total_amount_cents': 9999,
                'user_agent': 'unitTest'
            };
            delete orderJson.created_at;
            assert.deepEqual(orderJson, orderResult);
        });
    });
});
