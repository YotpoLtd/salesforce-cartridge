'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const cartridgeDebugEnabledCustomPreferences = {
    custom: {
        yotpoDebugLogEnabled: true,
        yotpoInfoLogEnabled: false
    }
};

const cartridgeInfoEnabledCustomPreferences = {
    custom: {
        yotpoDebugLogEnabled: false,
        yotpoInfoLogEnabled: true
    }
};

const cartridgeBothDisabledCustomPreferences = {
    custom: {
        yotpoDebugLogEnabled: true,
        yotpoInfoLogEnabled: true
    }
};

describe('yotpoLogger', () => {
    let sinonErrorSpy = sinon.spy();
    let sinonDebugSpy = sinon.spy();
    let sinonInfoSpy = sinon.spy();
    let sinonPreferences = sinon.stub();

    const yotpoLogger = proxyquire('../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoLogger', {
        'dw/system/Site': {
            getCurrent: () => {
                return {
                    getPreferences: sinonPreferences
                };
            }
        },
        'dw/system/Logger': {
            getLogger: () => {
                return {
                    error: sinonErrorSpy,
                    debug: sinonDebugSpy,
                    info: sinonInfoSpy
                };
            }
        }
    });

    describe('logMessage', () => {
        afterEach(function () {
            sinonErrorSpy.reset();
            sinonDebugSpy.reset();
            sinonInfoSpy.reset();
        });

        it('Should add debug log entries if debug logging is enabled', () => {
            sinonPreferences.returns(cartridgeDebugEnabledCustomPreferences);

            const severityLevel = 'debug';
            const message = 'Unit Test log message';
            const logLocation = 'Unit-Test~yotpoLogger';

            yotpoLogger.logMessage(message, severityLevel, logLocation);

            assert.isTrue(sinonDebugSpy.calledWith(logLocation + ' : ' + message));
            assert.isTrue(sinonInfoSpy.notCalled);
            assert.isTrue(sinonErrorSpy.notCalled);
        });

        it('Should not add debug log entries if debug logging is disabled', () => {
            sinonPreferences.returns(cartridgeInfoEnabledCustomPreferences);

            const severityLevel = 'debug';
            const message = 'Unit Test log message';
            const logLocation = 'Unit-Test~yotpoLogger';

            yotpoLogger.logMessage(message, severityLevel, logLocation);

            assert.isTrue(sinonDebugSpy.notCalled);
            assert.isTrue(sinonErrorSpy.notCalled);
        });

        it('Should add info log entries if info logging is enabled', () => {
            sinonPreferences.returns(cartridgeInfoEnabledCustomPreferences);

            const severityLevel = 'info';
            const message = 'Unit Test log message';
            const logLocation = 'Unit-Test~yotpoLogger';

            yotpoLogger.logMessage(message, severityLevel, logLocation);

            assert.isTrue(sinonInfoSpy.calledWith(logLocation + ' : ' + message));
            assert.isTrue(sinonDebugSpy.notCalled);
        });

        it('Should not add info log entries if info logging is disabled', () => {
            sinonPreferences.returns(cartridgeDebugEnabledCustomPreferences);

            const severityLevel = 'info';
            const message = 'Unit Test log message';
            const logLocation = 'Unit-Test~yotpoLogger';

            yotpoLogger.logMessage(message, severityLevel, logLocation);

            assert.isTrue(sinonInfoSpy.notCalled);
        });

        it('Should add error log entries', () => {
            sinonPreferences.returns(cartridgeBothDisabledCustomPreferences);

            const severityLevel = 'error';
            const message = 'Unit Test log message';
            const logLocation = 'Unit-Test~yotpoLogger';

            yotpoLogger.logMessage(message, severityLevel, logLocation);

            assert.isTrue(sinonErrorSpy.calledWith(logLocation + ' : ' + message));
        });
    });
});
