'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('commonModel', () => {
    // Sinon Spies
    let sinonErrorSpy = sinon.spy();
    let sinonDebugSpy = sinon.spy();
    let sinonInfoSpy = sinon.spy();

    // Sinon Stubs
    let sinonYotpoConfig = sinon.stub();
    let sinonGetAllCustomObjectsStub = sinon.stub();
    let sinonGetCustomerByCustomerNumberStub = sinon.stub();

    var customConfigValues = {
        localeID: 'default',
        appKey: '1234',
        clientSecretKey: 'abcd',
        enableRatings: true,
        enableReviews: true,
        enablePurchaseFeed: true
    };
    var mockConfig = {
        custom: customConfigValues
    };

    function loadAllYotpoConfigurationsMock() {
        var mockYotpoConfigurations = [];
        mockYotpoConfigurations.push(mockConfig);
        return mockYotpoConfigurations;
    }

    const CustomObjectMgr = {
        getCustomObject: sinonYotpoConfig,
        getAllCustomObjects: sinonGetAllCustomObjectsStub
    };

    const CustomerMgr = {
        getCustomerByCustomerNumber: sinonGetCustomerByCustomerNumberStub
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

    var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

    var yotpoLogger = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoLogger', {
        'dw/system/Site': SiteForLogger,
        'dw/system/Logger': Logger
    });
    const commonModel = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/model/common/commonModel', {
        '~/cartridge/scripts/utils/constants': constants,
        'dw/object/CustomObjectMgr': CustomObjectMgr,
        'dw/customer/CustomerMgr': CustomerMgr,
        '~/cartridge/scripts/utils/yotpoLogger': yotpoLogger,
        'dw/util/Calendar': Date
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
                    return loadAllYotpoConfigurationsMock();
                },
                close: sinon.spy()
            });

            const configurations = commonModel.loadAllYotpoConfigurations();

            assert(sinonGetAllCustomObjectsStub.calledWith('yotpoConfiguration'));
            assert.isTrue(configurations[0].custom.clientSecretKey === 'abcd');
        });
    });

    describe('loadYotpoConfigurationsByLocale', () => {
        beforeEach(function () {
            sinonYotpoConfig.reset();
        });

        it('Should return true because getCustomObject should be called with the correct params', () => {
            sinonYotpoConfig.returns(mockConfig, { close: sinon.spy() });

            const configuration = commonModel.loadYotpoConfigurationsByLocale('default');

            assert(sinonYotpoConfig.calledWith('yotpoConfiguration', 'default'));
            assert.isTrue(configuration.custom.clientSecretKey === 'abcd');
        });
    });

    describe('loadYotpoJobConfigurations', () => {
        beforeEach(function () {
            sinonYotpoConfig.reset();
        });

        it('Should return true because getCustomObject should be called with the correct params', () => {
            sinonYotpoConfig.returns(
                {
                    custom: {
                        orderFeedJobLastExecutionDateTime: '08/11/2019'
                    }
                }, { close: sinon.spy() }
            );

            const configuration = commonModel.loadYotpoJobConfigurations();
            assert(sinonYotpoConfig.calledWith('yotpoJobsConfiguration', '1'));
            assert.isTrue(configuration.orderFeedJobLastExecutionTime === '08/11/2019');
        });
    });
});
