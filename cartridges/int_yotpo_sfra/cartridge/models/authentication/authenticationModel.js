'use strict';

/**
 * @module models/authentication/authenticationModel
 *
 * This model is used for authentication purpose in Yotpo, It reads the site preferences to get the Yotpo connection
 * details and authentication parameters and sends the HTTP request. It reads the response and returns the
 * authentication data. It returns error in case of any problems during authentication.
 */

/**
* This method prepares authentication JSON to call the Yotpo authentication service.
* @param {string} yotpoAppKey - yotpoAppKey application key for the current locale
* @param {string} yotpoClientSecretKey - yotpoClientSecretKey client secret key for the current locale
*
* @returns {Object} authenticationJSON
*/
function prepareAuthenticationJSON(yotpoAppKey, yotpoClientSecretKey) {
    return JSON.stringify({
        client_id: yotpoAppKey,
        client_secret: yotpoClientSecretKey,
        grant_type: 'client_credentials'
    });
}

/**
* This method parses Yotpo response and retrieves the u-token.
* @param {Object} result - result object
* @returns {Object} JSON object
*/
function parseYotpoResponse(result) {
    var Result = require('dw/svc/Result');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'authenticationModel~parseYotpoResponse';
    var yotpoResponse = JSON.parse(result.object);

    var errorResult = true;

    switch (result.status) {
        case Result.OK :
            if (yotpoResponse.error) {
                yotpoLogger.logMessage('Yotpo service authentication could not be performed. \n' +
                ' Error Message: ' + yotpoResponse.error, 'error', logLocation);
            } else {
                yotpoLogger.logMessage('Yotpo service authenticated successfully', 'debug', logLocation);
                errorResult = false;
            }
            break;
        case Result.ERROR :
            yotpoLogger.logMessage('The request to authenticate failed authentication. ' +
            ' Error code: ' + result.error + '\n' +
            ' Error Text is: ' + result.msg + ': ' + result.errorMessage.error, 'error', logLocation);
            break;
        default :
            yotpoLogger.logMessage('The request to authenticate failed for an unknown reason. Error: ' + result.error + '\n' +
                ' Error Text is: ' + result.errorMessage, 'error', logLocation);
    }

    return {
        errorResult: errorResult,
        updatedUTokenAuthCode: yotpoResponse.access_token
    };
}

/**
 * This is the main function used to authenticate Yotpo. This function calls the Yotpo authentication service.
 * It prepares authentication json to call the service and then parses the Yotpo response.
 * @param {string} yotpoAppKey - application key for the current locale
 * @param {string} yotpoClientSecretKey - client secret key for the current locale
 * @returns {boolean} Boolean
 */
function authenticate(yotpoAppKey, yotpoClientSecretKey) {
    var authenticationServiceRegistry = require('*/cartridge/scripts/serviceregistry/authenticationServiceRegistry');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var constants = require('*/cartridge/scripts/utils/constants');
    var logLocation = 'authenticationModel~authenticate';
    var yotpoResponse = {};
    var result = {};

    var authenticationJSON = prepareAuthenticationJSON(yotpoAppKey, yotpoClientSecretKey);
    yotpoLogger.logMessage('Sending request to Yotpo', 'debug', logLocation);
    try {
        result = authenticationServiceRegistry.yotpoAuthenticationSvc.call(authenticationJSON);
        yotpoResponse = parseYotpoResponse(result);
    } catch (e) {
        yotpoLogger.logMessage('There was a error during the authentication request to Yotpo \n' +
        ' Error code: ' + result.error + '\n' +
        ' Error Text is: ' + result.msg + ': ' + result.errorMessage.error, 'error', logLocation);
        throw constants.AUTH_ERROR;
    }

    if (yotpoResponse.errorResult) {
        throw constants.AUTH_ERROR;
    }

    return yotpoResponse;
}

exports.authenticate = authenticate;
