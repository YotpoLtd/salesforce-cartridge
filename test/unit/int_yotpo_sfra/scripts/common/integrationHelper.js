'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

let yotpoUtils = require('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoUtils');

describe('integrationHelper', () => {
    const session = {
        custom: {
            yotpoConfig: {
                isCartridgeEnabled: true,
                isReviewEnabled: true,
                isRatingEnabled: true,
                yotpoAppKey: '1234',
                domainAddress: 'aUrl',
                productInformationFromMaster: ''
            }
        }
    };

    global.empty = (value) => !(value || false);
    global.session = sinon.mock(session);

    const integrationHelper = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/common/integrationHelper', {
        '../utils/yotpoUtils.js': yotpoUtils,
        'dw/system/Site': {
            getCurrent: () => {
                return {
                    preferences: {
                        custom: {
                            yotpoConversionTrackingPixelURL: 'conversionUrl'
                        }
                    }
                };
            }
        }
    });

    describe('getConversionTrackingData', () => {
        const order = {
            totalGrossPrice: {
                available: true,
                value: 123.10
            },
            orderNo: '0001234',
            currencyCode: 'USD'
        };
        const locale = 'default';

        sinon.stub(yotpoUtils, 'getCurrentLocaleSFRA').returns('locale');
        sinon.stub(yotpoUtils, 'getAppKeyForCurrentLocale').returns('appKey');

        it('should return conversion tracking url with parameters', () => {
            let stub = sinon.stub(yotpoUtils, 'isCartridgeEnabled').returns(true);

            const trackingUrl = integrationHelper.getConversionTrackingData(order, locale).conversionTrackingURL;

            assert.equal(trackingUrl, 'conversionUrl?order_amount=123.1&order_id=0001234&order_currency=USD&app_key=appKey');

            stub.restore();
        });

        it('should return empty conversion tracking url if cartridge disabled', () => {
            let stub = sinon.stub(yotpoUtils, 'isCartridgeEnabled').returns(false);

            const trackingUrl = integrationHelper.getConversionTrackingData(order, locale).conversionTrackingURL;

            assert.equal(trackingUrl, '');

            stub.restore();
        });
    });

    delete global.session;
});
