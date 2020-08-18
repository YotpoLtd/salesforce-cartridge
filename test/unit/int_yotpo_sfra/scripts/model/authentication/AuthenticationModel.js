'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('authenticationModel', () => {
    // Sinon Spies
    let sinonErrorSpy = sinon.spy();
    let sinonDebugSpy = sinon.spy();
    let sinonInfoSpy = sinon.spy();
    const yotpoAppKey = '1234';
    const yotpoClientSecretKey = 'abcd';

    const authenticationServiceRegistry = {};
    const yotpoAuthenticationSvc = {
        call: function (authenticationJSON) {
            var authObject = JSON.parse(authenticationJSON);
            var mockYotpoResponse = {
                error: true,
                errorMessage: '',
                mockResult: true,
                msg: 'ERROR',
                ok: false,
                status: 'ERROR',
                unavailableReason: null
            };
            mockYotpoResponse.object = JSON.stringify({
                error: true,
                access_token: ''
            });
            if (authObject.client_id && authObject.client_secret) {
                mockYotpoResponse = {
                    error: false,
                    errorMessage: '',
                    mockResult: true,
                    msg: 'OK',
                    ok: true,
                    status: 'OK',
                    unavailableReason: null
                };
                mockYotpoResponse.object = JSON.stringify({
                    access_token: '1234',
                    token_type: 'bearer'
                });
            }
            return mockYotpoResponse;
        }
    };
    authenticationServiceRegistry.yotpoAuthenticationSvc = yotpoAuthenticationSvc;

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

    var yotpoLogger = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoLogger', {
        'dw/system/Site': SiteForLogger,
        'dw/system/Logger': Logger
    });
    var constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

    const authenticationModel = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/models/authentication/authenticationModel', {
        'dw/svc/Result': {
            OK: 'OK',
            ERROR: 'ERROR'
        },
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': yotpoLogger,
        '*/cartridge/scripts/serviceregistry/authenticationServiceRegistry': authenticationServiceRegistry
    });

    describe('authenticate', function () {
        it('should receive an error', function () {
            try {
                authenticationModel.authenticate(null, null);
            } catch (e) {
                assert.equal(e, 'AUTH_ERROR');
            }
        });

        it('should receive an updated UTokenAuthCode', function () {
            var result = authenticationModel.authenticate(yotpoAppKey, yotpoClientSecretKey);
            assert.equal(result.errorResult, false);
            assert.notEqual(result.updatedUTokenAuthCode, null);
        });
    });
});
