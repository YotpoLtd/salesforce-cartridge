'use strict';

const assert = require('chai').assert;
const request = require('request-promise');
const config = require('../sandbox-configuration');

const debug = false;

if (debug) {
    require('request').debug = true;
    require('request-debug')(request);
}

describe.skip('Yotpo Loyalty Controller', function () {
    this.timeout(120000); // Slow sandboxen....
    const cookieJar = request.jar();

    const myRequest = {
        url: '',
        auth: {
            user: config.user,
            pass: config.pass,
            sendImmediately: true
        },
        method: 'GET',
        rejectUnauthorized: false,
        resolveWithFullResponse: true, // Important
        jar: cookieJar,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': config.hostname
        }
    };
    it('Should get customer data back', async function () {
        myRequest.url = `${config.baseURL}YotpoLoyalty-GetCustomer`;
        myRequest.method = 'GET';

        myRequest.qs = {
            apiKey: 'apiKey',
            customerNo: 'testCustomerNo',
            email: 'customer@emailaddress.com',
            singleCustomer: true,
            locale: 'default'
        };

        const response = await request(myRequest);

        assert.equal(response.statusCode, 200, 'Expected statusCode to be 200.');

        assert.equal(response.headers['content-type'], 'application/json');

        const body = JSON.parse(response.body).scriptAssets;
        assert.operator(body.length, '>', 0);
    });
});
