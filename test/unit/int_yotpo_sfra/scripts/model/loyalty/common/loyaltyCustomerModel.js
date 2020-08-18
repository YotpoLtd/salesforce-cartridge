'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyCustomerModel', () => {
    let loggerSpy = {
        logMessage: sinon.spy()
    };

    const loyaltyCustomerModel = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/models/loyalty/common/loyaltyCustomerModel.js', {
        '*/cartridge/scripts/utils/constants': constants,
        '~/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        'dw/customer/CustomerMgr': {
            getCustomerByCustomerNumber: () => {
                return { profile: 'byNumber' };
            },
            getCustomerByLogin: () => {
                return { profile: 'byLogin' };
            },
            searchProfiles: () => {
                return { status: true, forward: () => {} };
            }
        },
        '~/cartridge/scripts/utils/yotpoUtils': {
            escape: (param) => {
                return param;
            }
        }
    });

    let profile = {
        getCustomer: () => {
            return {
                getCustomerGroups: () => {
                    return {
                        iterator: () => {
                            return {
                                hasNext: () => false
                            };
                        }
                    };
                }
            };
        },
        creationDate: {
            toISOString: () => {}
        },
        email: 'testing',
        customerNo: 'cust123',
        firstName: 'first',
        lastName: 'last'

    };

    describe('prepareCustomerJSON', () => {
        it('should throw an error for missing data.', () => {
            assert.throws(() => loyaltyCustomerModel.prepareCustomerJSON({}), /EXPORT_LOYALTY_CUSTOMER_ERROR/);
        });
        it('should return some customer json .', () => {
            let custJson = loyaltyCustomerModel.prepareCustomerJSON(profile);
            assert.equal(custJson.id, 'cust123');
        });
    });
    describe('searchCustomer', () => {
        it('return a customer.', () => {
            let p = loyaltyCustomerModel.searchCustomer({ customerNo: 'cust123' });
            assert.equal(p, 'byNumber');
        });
        it('return a customer by login.', () => {
            let p = loyaltyCustomerModel.searchCustomer({ email: 'cust123' });
            assert.equal(p, 'byLogin');
        });
    });

    describe('searchCustomers', () => {
        it('return a profile Iterator.', () => {
            let p = loyaltyCustomerModel.searchCustomers({ customerNo: 'cust123' });
            assert.equal(p.status, true);
        });
    });

    describe('prepareCustomersJSON', () => {
        it('return customer json.', () => {
            let iterator = {
                hasNext: () => { if (!this.iterator) { this.iterator = true; return true; } return false; },
                next: () => { return profile; },
                close: () => {},
                count: 5
            };
            let result = loyaltyCustomerModel.prepareCustomersJSON(iterator);
            assert.equal(result.last_page, 5);
        });
        it('log an error for missing data.', () => {
            let iterator = {
                hasNext: () => { if (!this.iterator) { this.iterator = true; return true; } return false; },
                next: () => { return profile; },
                close: () => {},
                count: 5
            };
            delete profile.email;
            loyaltyCustomerModel.prepareCustomersJSON(iterator);
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Some error occurred while preparing customer JSON for customer number/), 'error', 'LoyaltyCustomerModel~prepareCustomerJSON');
            profile.email = 'testing';
        });
    });
});
