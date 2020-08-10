'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('yotpoConfigurationModel', () => {
    // Sinon Spies
    let sinonErrorSpy = sinon.spy();
    let sinonDebugSpy = sinon.spy();
    let sinonInfoSpy = sinon.spy();

    // Sinon Stubs
    let sinonYotpoConfig = sinon.stub();
    let sinonGetAllCustomObjectsStub = sinon.stub();
    let sinonCalendar = sinon.stub().returnsArg(0);

    // global.empty = (value) => !(value || false);

    var sitePrefDefaults = {
        yotpoCartridgeEnabled: true,
        yotpoLoyaltyAPIKey: 'secretKeyFromSitePref',
        yotpoLoyaltyGUID: 'guidFromSitePref',
        enableLoyalty: true
    };
    let sitePrefs;
    let CustomObjectStore = {
        default: {
            custom: {
                localeID: 'default',
                appKey: 'onlyExistsInCustomObject',
                clientSecretKey: 'secretKeyFromCustomObject',
                enableRatings: true,
                enableReviews: true,
                enablePurchaseFeed: true
            }
        },
        overrideLocale: {
            custom: {
                appKey: 'overRidden',
                yotpoLoyaltyAPIKey: 'fromoOverrideLocaleLocale',
                clientSecretKey: 'secretKeyFromOverrideLocale'
            }
        }
    };

    // Mock Objects and Getters
    const CustomObjectMgr = {
        getCustomObject: (CoName, locale) => {
            if (CoName === constants.YOTPO_JOBS_CONFIGURATION_OBJECT) {
                return {
                    custom: {
                        orderFeedJobLastExecutionDateTime: '08/11/2019'
                    }
                };
            }
            return CustomObjectStore[locale];
        },
        getAllCustomObjects: sinonGetAllCustomObjectsStub
    };

    const Site = {
        getCurrent: () => {
            return {
                getPreferences: sinonYotpoConfig,
                getCustomPreferenceValue: function (pref) {
                    return sitePrefs[pref] || null;
                }
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

    const yotpoLogger = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoLogger', {
        'dw/system/Site': SiteForLogger,
        'dw/system/Logger': Logger
    });

    const yotpoUtils = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoUtils', {
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': {
            logMessage: () => { }
        }
    });

    beforeEach(function () {
        sitePrefs = Object.assign({}, sitePrefDefaults);
    });

    // Reset spies & stubs
    afterEach(function () {
        sinonErrorSpy.reset();
        sinonDebugSpy.reset();
        sinonInfoSpy.reset();

        sinonYotpoConfig.reset();
        sinonCalendar.reset();
    });

    const yotpoConfigurationModel = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/model/common/yotpoConfigurationModel', {
        'dw/object/CustomObjectMgr': CustomObjectMgr,
        'dw/system/Site': Site,
        'dw/system/Logger': Logger,
        'dw/util/Calendar': Date,
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': yotpoLogger,
        '*/cartridge/scripts/utils/yotpoUtils': yotpoUtils,
        'dw/web/URLUtils': {
            home: () => {
                return 'www.unittest.com';
            }
        }
    });

    describe('Test General Configuration Overrides', () => {
        it('return null if the cartidge is disabled.', () => {
            sitePrefs.yotpoCartridgeEnabled = false;
            assert.isNull(yotpoConfigurationModel.getYotpoPref('yotpoLoyaltyAPIKey', 'someLocale'));
        });
        it('return the site pref value if a locale is defined.', () => {
            assert.equal(yotpoConfigurationModel.getYotpoPref('yotpoLoyaltyAPIKey', 'someLocale'), 'secretKeyFromSitePref');
        });
        it('Should get the value of a configuration that exists only in the custom object.', () => {
            assert.equal(yotpoConfigurationModel.getYotpoPref('appKey', 'default'), 'onlyExistsInCustomObject');
        });
        it('return the site pref from specific locale defined.', () => {
            assert.equal(yotpoConfigurationModel.getYotpoPref('yotpoLoyaltyAPIKey', 'overrideLocale'), 'fromoOverrideLocaleLocale');
        });
        it('return the site pref from default locale if default has a matching pref.', () => {
            CustomObjectStore.default.custom.yotpoLoyaltyAPIKey = 'fromDefaultLocale';
            assert.equal(yotpoConfigurationModel.getYotpoPref('yotpoLoyaltyAPIKey'), 'fromDefaultLocale');
            delete CustomObjectStore.default.custom.yotpoLoyaltyAPIKey;
        });
        it('Should get the value of a configuration that exists overridden by the custom object.', () => {
            assert.equal(yotpoConfigurationModel.getYotpoPref('appKey', 'overrideLocale'), 'overRidden');
        });
    });

    describe('validateOrderFeedJobConfiguration', () => {
        it('should return true with orderFeedJobLastExecutionDateTime being passed', () => {
            const orderFeedJobLastExecutionDateTime = new Date();
            const result = yotpoConfigurationModel.validateOrderFeedJobConfiguration(orderFeedJobLastExecutionDateTime);
            assert.equal(result, true);
        });

        it('should return false with orderFeedJobLastExecutionDateTime being passed', () => {
            const orderFeedJobLastExecutionDateTime = null;
            const result = yotpoConfigurationModel.validateOrderFeedJobConfiguration(orderFeedJobLastExecutionDateTime);
            assert.equal(result, false);
        });
    });

    describe('loadAllYotpoConfigurations', () => {
        beforeEach(function () {
            sinonGetAllCustomObjectsStub.reset();
        });

        it('Should return true because getAllCustomObjects should be called with the correct param', () => {
            sinonGetAllCustomObjectsStub.returns({
                hasNext: function () {
                    return true;
                },
                asList: function () {
                    return Object.values(CustomObjectStore);
                },
                close: sinon.spy()
            });

            const configurations = yotpoConfigurationModel.loadAllYotpoConfigurations();

            assert(sinonGetAllCustomObjectsStub.calledWith('yotpoConfiguration'));
            assert.isTrue(configurations[0].custom.clientSecretKey === 'secretKeyFromCustomObject');
        });
    });

    describe('loadYotpoConfigurationsByLocale', () => {
        it('Should fetch the configuration object for the default locale', () => {
            const configuration = yotpoConfigurationModel.loadYotpoConfigurationsByLocale('default');
            assert.isTrue(configuration.custom.clientSecretKey === 'secretKeyFromCustomObject');
        });
        it('Should fetch the configuration object for the overrideLocale locale', () => {
            const configuration = yotpoConfigurationModel.loadYotpoConfigurationsByLocale('overrideLocale');
            assert.equal(configuration.custom.clientSecretKey, 'secretKeyFromOverrideLocale');
        });
    });

    describe('loadYotpoJobConfigurations', () => {
        it('Should return true because getCustomObject should be called with the correct params', () => {
            const configuration = yotpoConfigurationModel.loadYotpoJobConfigurations();
            assert.isTrue(configuration.orderFeedJobLastExecutionTime === '08/11/2019');
        });
    });

    describe('getLoyaltyAPIKeys', () => {
        it('Should return keys ', () => {
            const keys = yotpoConfigurationModel.getLoyaltyAPIKeys('default');
            assert.equal(keys.key, 'secretKeyFromSitePref');
        });
    });
    describe('validateLoyaltyApiKey', () => {
        it('Should confirm keys ', () => {
            assert.isTrue(yotpoConfigurationModel.validateLoyaltyApiKey('secretKeyFromSitePref', 'default'));
        });
    });
});
