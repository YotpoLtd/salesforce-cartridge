'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

require.extensions['.ds'] = require.extensions['.js'];
require('dw-api-mock/demandware-globals');

const constants = require('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

const yotpoUtils = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoUtils', {
    '*/cartridge/scripts/utils/constants': constants,
    '*/cartridge/scripts/utils/yotpoLogger': {
        logMessage: () => { }
    }
});

const stubSystemPrefs = {
    yotpoCartridgeEnabled: true
};

const subCustomObject = {
    yotpoAppKey: '1234',
    isReviewsEnabled: true
};
const mockConfigModel = {
    isCartridgeEnabled: sinon.stub().returns(true),
    getYotpoConfig: sinon.stub().returns(subCustomObject)
};
const yotpoConfigurationModel = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/models/common/yotpoConfigurationModel', {
    '*/cartridge/scripts/utils/yotpoUtils.js': yotpoUtils,
    '*/cartridge/scripts/utils/constants': constants,
    '*/cartridge/scripts/utils/yotpoUtils': yotpoUtils,
    '*/cartridge/scripts/utils/yotpoLogger': {
        logMessage: () => { }
    },
    'dw/system/Site': {
        getCurrent: () => {
            return {
                getCustomPreferenceValue: (pref) => {
                    return stubSystemPrefs[pref];
                }
            };
        }
    }
});

const integrationHelper = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/common/integrationHelper', {
    '*/cartridge/scripts/utils/yotpoUtils.js': yotpoUtils,
    '*/cartridge/models/common/yotpoConfigurationModel': mockConfigModel,
    '*/cartridge/scripts/utils/yotpoLogger': {},
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

describe('integrationHelper', () => {
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

        it('should return conversion tracking url with parameters', () => {
            // Remove cached config from previoius test.
            let stub = sinon.stub(yotpoConfigurationModel, 'isCartridgeEnabled').returns(true);

            const trackingUrl = integrationHelper.getConversionTrackingData(order, locale).conversionTrackingURL;

            assert.equal(trackingUrl, 'conversionUrl?order_amount=123.1&order_id=0001234&order_currency=USD&app_key=undefined');

            stub.restore();
        });

        it('should return empty conversion tracking url if cartridge disabled', () => {
            // jsubCustomObject.isCartridgeEnabled = false;
            mockConfigModel.isCartridgeEnabled = sinon.stub().returns(false);
            const trackingUrl = integrationHelper.getConversionTrackingData(order, locale).conversionTrackingURL;

            assert.equal(trackingUrl, '');
            mockConfigModel.isCartridgeEnabled = sinon.stub().returns(true);
            // subCustomObject.isCartridgeEnabled = true;
        });
    });
});
