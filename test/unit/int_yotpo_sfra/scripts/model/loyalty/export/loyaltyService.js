'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constants = require('../../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

describe('loyaltyService', () => {
    let loggerSpy = { logMessage: sinon.spy() };
    let serviceSpy = sinon.stub();

    const yotpoConfigurationModel = {
        getYotpoConfig: () => { return { yotpoLoyaltyGUID: 'guid', yotpoLoyaltyAPIKey: 'apikey' }; }
    };

    const loyaltyService = proxyquire('../../../../../../../cartridges/int_yotpo_sfra/cartridge/models/loyalty/export/loyaltyService.js', {
        '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
        'dw/svc/LocalServiceRegistry': {
            createService: () => true
        },
        '*/cartridge/scripts/serviceregistry/loyalty/loyaltyAPIServiceRegistry': {
            loyaltyAPIService: {
                call: serviceSpy,
                addHeader: () => {},
                setRequestMethod: () => {},
                setURL: () => {},
                getConfiguration: () => {
                    return {
                        getCredential: () => {
                            return {
                                getURL: () => {
                                    return 'theUrl';
                                }
                            };
                        }
                    };
                }
            }
        },
        '*/cartridge/scripts/serviceregistry/loyalty/loyaltyExportServiceRegistry': {
            loyaltyService: {
                call: serviceSpy,
                addHeader: () => {},
                setURL: () => {},
                getConfiguration: () => {
                    return {
                        getCredential: () => {
                            return {
                                getURL: () => { return 'theUrl'; }
                            };
                        }
                    };
                }
            }
        },
        'dw/svc/Result': {
            OK: 'OK',
            ERROR: 'ERROR'
        },
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': loggerSpy,
        '*/cartridge/scripts/utils/yotpoUtils': {
            appendParamsToUrl: () => { return 'http://unittesting'; }
        }
    });

    beforeEach(function () {
        loggerSpy.logMessage.reset();
        serviceSpy.reset();
    });

    describe('exportData', () => {
        it('Should log Throw an error on invalid params', () => {
            serviceSpy.throws('AnyError');
            assert.throws(() =>loyaltyService.exportData({}, 'fake', 'throwaway endpoint'), 'EXPORT_LOYALTY_SERVICE_ERROR');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*Error occured while trying to export data./), 'error', 'loyaltyService~exportData');
        });
        it('Should export the data and log', () => {
            serviceSpy.returns({ status: 'OK' });
            loyaltyService.exportData({}, 'fake', 'throwaway endpoint');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*The data sumbitted successfully to Yotpo./), 'debug', 'loyaltyService~exportData');
            sinon.assert.calledOnce(serviceSpy);
        });
    });
    /**
    describe.skip('getCustomerDetails', () => {
        it('Should log fetch customer details', () => {
            serviceSpy.returns({ status: 'OK' });
            loyaltyService.getCustomerDetails('spam@here.com', 'default');
            sinon.assert.calledWithMatch(loggerSpy.logMessage, sinon.match(/.*The data sumbitted retrieved from Yotpo./), 'debug', 'loyaltyService~loyaltyServiceFacade');
            sinon.assert.calledOnce(serviceSpy);
        });
    });

    describe.skip('getRedemptionOptions', () => {
        it('Should log fetch redemption options', () => {
            let options = loyaltyService.getRedemptionOptions('default');
            assert.equal(options.status, 'OK');
        });
    });
    */
});
