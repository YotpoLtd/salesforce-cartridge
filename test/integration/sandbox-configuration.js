'use strict';

/**
 * Translate the dw.json configuration for executing Integration Tests
 */

const path = require('path');
const dwJSONFileName = path.join(__dirname, '../..', 'dw.json');

/**
 * Generate Configuration from the local dw.json file
 *
 * @return Object
 */
function generateConfig() {
    const dwJSONConfig = require(dwJSONFileName);

    /* eslint-disable no-prototype-builtins */
    if (!dwJSONConfig.hasOwnProperty('hostname')) throw new Error('hostname attribute must exist in configuration!');
    if (!dwJSONConfig.hasOwnProperty('storefront-username')) throw new Error('storefront-username attribute must exist in configuration!');
    if (!dwJSONConfig.hasOwnProperty('storefront-password')) throw new Error('storefront-password attribute must exist in configuration!');
    if (!dwJSONConfig.hasOwnProperty('username')) throw new Error('username attribute must exist in configuration!');
    if (!dwJSONConfig.hasOwnProperty('password')) throw new Error('password attribute must exist in configuration!');
    /* eslint-enable no-prototype-builtins */

    return {
        baseURL: `https://${dwJSONConfig.hostname}/on/demandware.store/Sites-RefArch-Site/default/`,
        hostname: dwJSONConfig.hostname,
        user: dwJSONConfig['storefront-username'],
        pass: dwJSONConfig['storefront-password'],
        bmuser: dwJSONConfig.username,
        bmpass: dwJSONConfig.password
    };
}

module.exports = generateConfig();
