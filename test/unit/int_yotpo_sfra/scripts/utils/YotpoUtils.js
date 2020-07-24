'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const constants = require('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('yotpoUtils', () => {
    // Sinon Spies
    let sinonErrorSpy = sinon.spy();
    let sinonDebugSpy = sinon.spy();
    let sinonInfoSpy = sinon.spy();
    let sinonFormatCalendarSpy = sinon.spy();

    // Sinon Stubs
    let sinonYotpoConfig = sinon.stub();
    let sinonCalendar = sinon.stub().returnsArg(0);

    // Sinon Stub Returns
    const enabledYotpoConfig = {
        custom: {
            clientSecretKey: 'clientSecretKey',
            appKey: 'appKey',
            enableReviews: true,
            enableRatings: true,
            yotpoCartridgeEnabled: true,
            yotpoDebugLogEnabled: true,
            yotpoInfoLogEnabled: true
        }
    };

    const disabledYotpoConfig = {
        custom: {
            clientSecretKey: null,
            appKey: null,
            enableReviews: false,
            enableRatings: false,
            yotpoCartridgeEnabled: false,
            yotpoDebugLogEnabled: false,
            yotpoInfoLogEnabled: false
        }
    };

    const nullYotpoConfig = null;

    // Mock Objects and Getters
    const CustomObjectMgr = {
        getCustomObject: sinonYotpoConfig
    };

    const Site = {
        getCurrent: () => {
            return {
                getPreferences: sinonYotpoConfig
            };
        }
    };

    const SiteForLogger = {
        getCurrent: () => {
            return {
                getPreferences: () => {
                    return {
                        custom: {
                            yotpoCartridgeEnabled: true,
                            yotpoDebugLogEnabled: true,
                            yotpoInfoLogEnabled: true
                        }
                    };
                }
            };
        }
    };

    const Logger = {
        getLogger: () => {
            return {
                error: sinonErrorSpy,
                debug: sinonDebugSpy,
                info: sinonInfoSpy
            };
        }
    };

    const yotpoLogger = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoLogger', {
        'dw/system/Site': SiteForLogger,
        'dw/system/Logger': Logger
    });

    const imageURL = 'imageURL';

    const productMockDefault = {
        isVariant: () => true,
        getVariationModel: () => {
            // master: null;
        },
        getPrimaryCategory: () => null,
        getImage: () => {
            return {
                getAbsURL: () => imageURL
            };
        },
        categories: []
    };

    const getProductMock = () => productMockDefault;

    const getProductAndSetImageUrl = (productImageURL) => {
        let product = getProductMock();
        product.getImage = () => {
            return {
                getAbsURL: () => productImageURL
            };
        };

        return product;
    };

    const categoryMockDefault = {
        parent: null,
        online: true,
        getDisplayName: () => 'Category Name'
    };

    const StringUtils = {
        formatCalendar: sinonFormatCalendarSpy
    };

    // Reset spies & stubs
    afterEach(function () {
        sinonErrorSpy.reset();
        sinonDebugSpy.reset();
        sinonInfoSpy.reset();
        sinonFormatCalendarSpy.reset();

        sinonYotpoConfig.reset();
        sinonCalendar.reset();
    });

    const yotpoUtils = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoUtils', {
        'dw/object/CustomObjectMgr': CustomObjectMgr,
        'dw/system/Site': Site,
        'dw/system/Logger': Logger,
        'dw/util/Calendar': sinonCalendar,
        'dw/util/StringUtils': StringUtils,
        './yotpoLogger': yotpoLogger
    });

    const getCategoryMock = () => categoryMockDefault;

    const getCategoryAndSetData = (data) => yotpoUtils.extendObject(Object.assign({}, getCategoryMock()), data);

    describe('validateMandatoryConfigData', () => {
        it('should return true with clientSecretKey & appKey in config', () => {
            let yotpoConfiguration = sinonYotpoConfig.returns(enabledYotpoConfig)();
            const result = yotpoUtils.validateMandatoryConfigData(yotpoConfiguration);
            assert.equal(result, true);
        });

        it('should return false without clientSecretKey & appKey in config', () => {
            let yotpoConfiguration = sinonYotpoConfig.returns(disabledYotpoConfig)();
            const result = yotpoUtils.validateMandatoryConfigData(yotpoConfiguration);
            assert.equal(result, false);
        });
    });

    describe('validateOrderFeedJobConfiguration', () => {
        it('should return true with orderFeedJobLastExecutionDateTime being passed', () => {
            const orderFeedJobLastExecutionDateTime = new Date();
            const result = yotpoUtils.validateOrderFeedJobConfiguration(orderFeedJobLastExecutionDateTime);
            assert.equal(result, true);
        });

        it('should return false with orderFeedJobLastExecutionDateTime being passed', () => {
            const orderFeedJobLastExecutionDateTime = null;
            const result = yotpoUtils.validateOrderFeedJobConfiguration(orderFeedJobLastExecutionDateTime);
            assert.equal(result, false);
        });
    });

    describe('getAppKeyForCurrentLocale', () => {
        it('should return appKey', () => {
            const yotpoConfiguration = sinonYotpoConfig.returns(enabledYotpoConfig)();
            const currentLocaleID = 'default';
            const result = yotpoUtils.getAppKeyForCurrentLocale(currentLocaleID);
            assert.equal(result, yotpoConfiguration.custom.appKey);
        });

        it('should return empty string when currentLocaleID is missing', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);
            const currentLocaleID = null;
            const result = yotpoUtils.getAppKeyForCurrentLocale(currentLocaleID);
            assert.equal(result, '');
        });

        it('should return empty string when yotpoConfiguration is empty', () => {
            sinonYotpoConfig.returns(nullYotpoConfig);
            const currentLocaleID = 'badLocale';
            const result = yotpoUtils.getAppKeyForCurrentLocale(currentLocaleID);
            assert.equal(result, '');
        });
    });

    describe('getCurrentLocale', () => {
        let request = {
            getLocale: () => 'locale',
            getHttpLocale: () => 'httpLocale'
        };

        it('should return locale', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);
            const result = yotpoUtils.getCurrentLocale(request);
            assert.equal(result, 'locale');
        });

        it('should return httpLocale', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);
            request.getLocale = () => null;
            const result = yotpoUtils.getCurrentLocale(request);
            assert.equal(result, 'httpLocale');
        });

        it('should return default', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);
            request.getLocale = () => null;
            request.getHttpLocale = () => null;
            const result = yotpoUtils.getCurrentLocale(request);
            assert.equal(result, 'default');
        });
    });

    describe('getCurrentLocaleSFRA', () => {
        it('should return locale', () => {
            const currentLocaleID = 'locale';
            const result = yotpoUtils.getCurrentLocaleSFRA(currentLocaleID);
            assert.equal(result, currentLocaleID);
        });

        it('should return default when currentLocaleID is empty', () => {
            const currentLocaleID = null;
            const result = yotpoUtils.getCurrentLocaleSFRA(currentLocaleID);
            assert.equal(result, 'default');
        });

        it('should return default when currentLocaleID is undefined', () => {
            let currentLocaleID;
            const result = yotpoUtils.getCurrentLocaleSFRA(currentLocaleID);
            assert.equal(result, 'default');
        });
    });

    describe('isReviewsEnabledForCurrentLocale', () => {
        it('should return false when currentLocaleID is empty', () => {
            const currentLocaleID = null;
            const result = yotpoUtils.isReviewsEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, false);
        });

        it('should return false when yotpoConfiguration is null', () => {
            sinonYotpoConfig.returns(nullYotpoConfig);
            const currentLocaleID = 'default';
            const result = yotpoUtils.isReviewsEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, false);
        });

        it('should return false because reviews are disabled', () => {
            sinonYotpoConfig.returns(disabledYotpoConfig);
            const currentLocaleID = 'default';
            const result = yotpoUtils.isReviewsEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, false);
        });

        it('should return true because reviews are enabled', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);
            const currentLocaleID = 'default';
            const result = yotpoUtils.isReviewsEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, true);
        });
    });

    describe('isRatingEnabledForCurrentLocale', () => {
        it('should return false when currentLocaleID is empty', () => {
            const currentLocaleID = null;
            const result = yotpoUtils.isRatingEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, false);
        });

        it('should return false when yotpoConfiguration is null', () => {
            sinonYotpoConfig.returns(nullYotpoConfig);
            const currentLocaleID = 'default';
            const result = yotpoUtils.isRatingEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, false);
        });

        it('should return false because ratings are disabled', () => {
            sinonYotpoConfig.returns(disabledYotpoConfig);
            const currentLocaleID = 'default';
            const result = yotpoUtils.isRatingEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, false);
        });

        it('should return true because ratings are enabled', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);
            const currentLocaleID = 'default';
            const result = yotpoUtils.isRatingEnabledForCurrentLocale(currentLocaleID);
            assert.equal(result, true);
        });
    });

    describe('escape', () => {
        let text;
        let regex = '\\s';
        let replacement = '-';

        it('should return undefined when text is undefined', () => {
            const result = yotpoUtils.escape(text, regex, replacement);
            assert.equal(result, text);
        });

        it('should return null when text is null', () => {
            text = null;
            const result = yotpoUtils.escape(text, regex, replacement);
            assert.equal(result, text);
        });

        it('should return false when text is false', () => {
            text = false;
            const result = yotpoUtils.escape(text, regex, replacement);
            assert.equal(result, text);
        });

        it('should return "" when text is ""', () => {
            text = '';
            const result = yotpoUtils.escape(text, regex, replacement);
            assert.equal(result, text);
        });

        it('should return Put-Dashes-In-the-Spaces', () => {
            text = 'Put Dashes In the Spaces';
            const result = yotpoUtils.escape(text, regex, replacement);
            assert.equal(result, 'Put-Dashes-In-the-Spaces');
        });
    });

    describe('validateEmailAddress', () => {
        it('should return true when email address is valid', () => {
            const result = yotpoUtils.validateEmailAddress('valid.email@address.com');
            assert.equal(result, true);
        });

        it('should return false when email address is invalid', () => {
            const result = yotpoUtils.validateEmailAddress('invalid.email_address.com');
            assert.equal(result, false);
        });
    });

    describe('getImageLink', () => {
        it('should return "" when product is empty', () => {
            const result = yotpoUtils.getImageLink(null);
            assert.equal(result, '');
        });

        it('should return "" when return from getImage method is empty', () => {
            const result = yotpoUtils.getImageLink({
                getImage: () => null
            });
            assert.equal(result, '');
        });

        it('should return ' + imageURL, () => {
            const product = getProductAndSetImageUrl(imageURL);
            const result = yotpoUtils.getImageLink(product);
            assert.equal(result, imageURL);
        });
    });

    describe('getProductImageUrl', () => {
        it('should return Image not available when product image url is empty', () => {
            const product = getProductAndSetImageUrl('');
            const result = yotpoUtils.getProductImageUrl(product);
            assert.equal(result, 'Image not available');
        });

        it('should return ' + imageURL, () => {
            const product = getProductAndSetImageUrl(imageURL);
            const result = yotpoUtils.getProductImageUrl(product);
            assert.equal(result, imageURL);
        });
    });

    describe('cleanDataForExport', () => {
        const baseText = 'abcdefghijklmnopqrstuvwxyz0123456789:,.?!|+_-=$*#%& ';
        const badChars = '@^(){}[]\\/<>~`';

        it('should return "" when text is empty', () => {
            const result = yotpoUtils.cleanDataForExport('', 'product');
            assert.equal(result, '');
        });

        it('should return ' + baseText, () => {
            const result = yotpoUtils.cleanDataForExport(baseText + badChars, 'product');
            assert.equal(result, baseText);
        });

        it('should return abcdefghijklmnopqrstuvwxyz0123456789-_--', () => {
            const result = yotpoUtils.cleanDataForExport(baseText, 'product-id', '-');
            assert.equal(result, 'abcdefghijklmnopqrstuvwxyz0123456789-_--');
        });

        it('should return ' + baseText, () => {
            const result = yotpoUtils.cleanDataForExport(baseText + badChars, 'order');
            assert.equal(result, baseText);
        });

        it('should return ' + baseText, () => {
            const result = yotpoUtils.cleanDataForExport('email@address .com', 'email');
            assert.equal(result, 'email@address.com');
        });

        it('should return 0123456789', () => {
            const result = yotpoUtils.cleanDataForExport(baseText, '^0-9');
            assert.equal(result, '0123456789');
        });

        it('should return *0123456789*', () => {
            const result = yotpoUtils.cleanDataForExport(baseText, '^0-9', '*');
            assert.equal(result, '*0123456789*');
        });
    });

    describe('formatDateTime', () => {
        const date = new Date('July 4, 2019 12:00:00');

        it('should return true when date and correct regex are passed', () => {
            yotpoUtils.formatDateTime(date);
            assert.isTrue(sinonFormatCalendarSpy.calledWith(date, constants.DATE_FORMAT_FOR_YOTPO_DATA));
        });

        it('should return false when incorrect date param is passed', () => {
            yotpoUtils.formatDateTime('June 4, 2019');
            assert.isFalse(sinonFormatCalendarSpy.calledWith(date, constants.DATE_FORMAT_FOR_YOTPO_DATA));
        });
    });

    describe('extendObject', () => {
        it('should return { a: 3, b: 2, c: 4 }', () => {
            const result = yotpoUtils.extendObject({ a: 1, b: 2 }, { a: 3, c: 4 });
            assert.deepEqual(result, { a: 3, b: 2, c: 4 });
        });
    });

    describe('getCategoryPath', () => {
        it('should return Primary Category Name', () => {
            const product = getProductMock();
            const parentCat = getCategoryAndSetData({ getDisplayName: () => 'Parent Category Name' });
            let primaryCat = getCategoryAndSetData({ getDisplayName: () => 'Primary Category Name' });
            primaryCat.parent = parentCat;

            product.isVariant = () => false;
            product.getPrimaryCategory = () => primaryCat;

            const result = yotpoUtils.getCategoryPath(product);
            assert.equal(result, 'Primary Category Name');
        });

        it('should return Master Product Primary Category Name', () => {
            const product = getProductMock();
            const masterProduct = getProductMock();

            const parentCat = getCategoryAndSetData({ getDisplayName: () => 'Parent Category Name' });
            let primaryCat = getCategoryAndSetData({ getDisplayName: () => 'Master Product Primary Category Name' });
            primaryCat.parent = parentCat;

            masterProduct.getPrimaryCategory = () => primaryCat;
            product.getVariationModel = () => {
                return { master: masterProduct };
            };

            const result = yotpoUtils.getCategoryPath(product);
            assert.equal(result, 'Master Product Primary Category Name');
        });

        it('should return Parent Product Primary Category Name', () => {
            const product = getProductMock();
            let parentProduct = getProductMock();

            const parentCat = getCategoryAndSetData({ getDisplayName: () => 'Parent Category Name' });
            let primaryCat = getCategoryAndSetData({ getDisplayName: () => 'Parent Product Primary Category Name' });
            primaryCat.parent = parentCat;

            parentProduct.getPrimaryCategory = () => primaryCat;

            const result = yotpoUtils.getCategoryPath(product);
            assert.equal(result, 'Parent Product Primary Category Name');
        });
    });

    describe('isCartridgeEnabled', () => {
        it('should return true because cartridge is enabled', () => {
            sinonYotpoConfig.returns(enabledYotpoConfig);

            const result = yotpoUtils.isCartridgeEnabled();
            assert.equal(result, true);
        });

        it('should return false because cartridge is disabled', () => {
            sinonYotpoConfig.returns(disabledYotpoConfig);

            const result = yotpoUtils.isCartridgeEnabled();
            assert.equal(result, false);
        });
    });
});
