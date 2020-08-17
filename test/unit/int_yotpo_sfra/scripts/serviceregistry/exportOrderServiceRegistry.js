'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('exportOrderServiceRegistry', () => {
    const exportOrderServiceRegistry = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/serviceregistry/exportOrderServiceRegistry.js', {
        'dw/svc/LocalServiceRegistry': {
            createService: (service, spec) => { return spec; }
        }
    });

    it('Should create a registry log message .', () => {
        let fakeObj = {
            orders: [
                {
                    other: 'testing',
                    email: 'data',
                    customer_name: 'name'
                }
            ]
        };
        let message = exportOrderServiceRegistry.yotpoExportOrdersSvc.getRequestLogMessage(JSON.stringify(fakeObj));
        let parsed = JSON.parse(message);
        assert.equal(parsed.orders[0].email, '');
        assert.equal(parsed.orders[0].customer_name, '');
    });
    it('Should create a registry object.', () => {
        let service = { addHeader: () => {} };
        let message = exportOrderServiceRegistry.yotpoExportOrdersSvc.createRequest(service, { test: true });
        assert.equal(message.test, true);
    });
});
