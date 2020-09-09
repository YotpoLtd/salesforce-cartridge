'use strict';

const assert = require('chai').assert;
const request = require('request-promise');
const config = require('../sandbox-configuration');

const debug = false;

if (debug) {
    require('request').debug = true;
    require('request-debug')(request);
}

describe('Yotpo Loyalty Controller', function () {
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
    describe('getCustomer', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetCustomer`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The api key is missing');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetCustomer`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 401, 'Expected statusCode to be 401.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'Invalid Loyalty API key provided');
            myRequest.ds = null;
        });
    });

    describe('getCustomers', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetCustomers`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetCustomers`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
            myRequest.ds = null;
        });
    });

    describe('GetOrderCountByState', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrderCountByState`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrderCountByState`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
            myRequest.ds = null;
        });
    });

    describe('GetOrderCountByVolume', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrderCountByVolume`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 401, 'Expected statusCode to be 401.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'Invalid Loyalty API key provided');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrderCountByVolume`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 401, 'Expected statusCode to be 401.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'Invalid Loyalty API key provided');
            myRequest.ds = null;
        });
    });

    describe('GetOrder', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrder`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrder`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
            myRequest.ds = null;
        });
    });

    describe('GetOrders', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrders`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetOrders`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 400, 'Expected statusCode to be 400.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'The request parameters are missing');
            myRequest.ds = null;
        });
    });

    describe.skip('CreateGiftCertificate', function () {
        // Cannot run the giftcard creation code in any testable manner without a valid key and a paid live account.
    });

    describe('GetCouponCode', function () {
        it('Should fail without an api key ', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetCouponCode`;
            myRequest.method = 'GET';

            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 401, 'Expected statusCode to be 401.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'Invalid Loyalty API key provided');
        });
        it('Should get an invalid api error back from the yotpo api', async function () {
            myRequest.url = `${config.baseURL}YotpoLoyalty-GetCouponCode`;
            myRequest.method = 'GET';

            myRequest.qs = {
                api_key: 'noRealApiKey',
                customerNo: 'testCustomerNo',
                email: 'customer@emailaddress.com',
                singleCustomer: true,
                locale: 'default'
            };
            let response;

            try {
                response = await request(myRequest);
            } catch (e) {
                response = e.response;
            }

            assert.equal(response.statusCode, 401, 'Expected statusCode to be 401.');
            assert.equal(response.headers['content-type'], 'application/json');

            const body = JSON.parse(response.body);
            assert.equal(body.errorDescription, 'Invalid Loyalty API key provided');
            myRequest.ds = null;
        });
    });
});
