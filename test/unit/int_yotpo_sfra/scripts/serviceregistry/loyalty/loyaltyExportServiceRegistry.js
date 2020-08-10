'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('loyaltyExportServiceRegistry', () => {
    const loyaltyExportServiceRegistry = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/serviceregistry/loyalty/loyaltyExportServiceRegistry.js', {
        'dw/svc/LocalServiceRegistry': {
            createService: (service, spec) => { return spec; }
        }
    });

    it('Should create a registry object.', () => {
        let fakeObj = {
            ip_address: 'fake',
            id: 5,
            customer_id: 123,
            customer_email: 'spam@here.com',
            remote_ip: '1.1.1.1',
            email: 'fake@spam.com',
            first_name: 'tom',
            last_name: 'smith'
        };
        let message = loyaltyExportServiceRegistry.loyaltyService.getRequestLogMessage(JSON.stringify(fakeObj));
        assert.isUndefined(message.ip_address);
        assert.isUndefined(message.customer_id);
        assert.isUndefined(message.id);
        assert.isUndefined(message.customer_email);
        assert.isUndefined(message.remote_ip);
        assert.isUndefined(message.email);
        assert.isUndefined(message.first_name);
        assert.isUndefined(message.last_name);
    });
});
