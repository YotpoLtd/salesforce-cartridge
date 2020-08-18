'use strict';
/**
 * This function is used to prepare customer JSON
 * @param {Object} profile : The customer profile to be exported
 *
 * @returns {Object} payload : The customer JSON
 */
function prepareCustomerJSON(profile) {
    var Constants = require('*/cartridge/scripts/utils/constants');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var YotpoUtils = require('*/cartridge/scripts/utils/yotpoUtils');
    var logLocation = 'LoyaltyCustomerModel~prepareCustomerJSON';
    var customerJSON;

    try {
        var customerEmail = YotpoUtils.escape(profile.email, Constants.REGEX_FOR_YOTPO_DATA, '');

        if (!customerEmail) {
            throw new Error(Constants.EXPORT_CUSTOMER_MISSING_MANDATORY_FIELDS_ERROR);
        }

        var customerGroupArray = new Array();
        var customerGroupIt = profile.getCustomer().getCustomerGroups().iterator();
        while (customerGroupIt.hasNext()) {
            var customerGroup = customerGroupIt.next();
            customerGroupArray.push(customerGroup.ID);
        }
        var customerGroups = customerGroupArray.join();

        customerJSON = {
            created_at: profile.creationDate.toISOString(),
            id: profile.customerNo,
            sfcc_id: profile.getCustomer().ID,
            email: customerEmail,
            first_name: YotpoUtils.escape(profile.firstName, Constants.REGEX_FOR_YOTPO_DATA, ''),
            last_name: YotpoUtils.escape(profile.lastName, Constants.REGEX_FOR_YOTPO_DATA, ''),
            tags: customerGroups
        };
    } catch (e) {
        YotpoLogger.logMessage('Some error occurred while preparing customer JSON for customer number: ' +
            profile.customerNo + '\nException is: ' + e, 'error', logLocation);
        throw new Error(Constants.EXPORT_LOYALTY_CUSTOMER_ERROR);
    }

    return customerJSON;
}

/**
 * This function is used to prepare JSON for multiple customers
 * This is currently what is used to prep data to return to Yotpo via
 * the custom GetCustomers endpoint
 *@param {SeekableIterator} profileIterator - The customer profiles iterator
 *
 * @returns {Object} payload : The customers JSON
 */
function prepareCustomersJSON(profileIterator) {
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var logLocation = 'LoyaltyCustomerModel~prepareCustomersJSON';

    var profileList = new Array();
    var profile;
    var totalCustomers = 0;

    if (profileIterator) {
        var customerJSON;
        totalCustomers = profileIterator.count;

        while (profileIterator.hasNext()) {
            profile = profileIterator.next();
            try {
                customerJSON = prepareCustomerJSON(profile);
                profileList.push(customerJSON);
            } catch (ex) {
                YotpoLogger.logMessage('There was error in preparing JSON for customer, ' +
                        'therefore skipping record.', 'debug', logLocation);
            }
        }
        profileIterator.close();
    }

    var payload = {
        customers: profileList,
        last_page: totalCustomers
    };

    return JSON.parse(JSON.stringify(payload));
}

/**
 * This function is used to search profile of customer based on customer number or email.
 * The function will search customer first by customer number otherwise by email
 *
 * @param {Object} params - The mandatory parameters to search customer
 * @param {string} params.customerNo - The customer number
 * @param {string} params.email - The customer email
 *
 * @returns {Object} iterator : The resultset iterator
 */
function searchCustomer(params) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var customer = null;
    if (params.customerNo) {
        customer = CustomerMgr.getCustomerByCustomerNumber(params.customerNo);
    } else if (params.email) {
        customer = CustomerMgr.getCustomerByLogin(params.email);
    }

    var profile = customer ? customer.profile : null;

    return profile;
}

/**
 * This function is used to search profiles of customer and limit the
 * search result using parameters passed.
 *
 * @param {Object} params - The mandatory parameters to search customers
 * @param {string} params.startIndex - The start index
 * @param {string} params.pageSize - The total number of results
 *
 * @returns {Object} iterator : The resultset iterator
 */
function searchCustomers(params) {
    var CustomerMgr = require('dw/customer/CustomerMgr');

    var profileIterator = CustomerMgr.searchProfiles('', 'customerNo ASC');
    profileIterator.forward(params.startIndex, params.pageSize);

    return profileIterator;
}

/**
 * This function is used to update the isLoyaltyProgramInitialized custom profile flag
 * on profiles that have successfully synced with Yotpo Loyalty but have not had this flag
 * set on their profile, yet.
 *
 * @param {Object} registeredCustomer - The registeredCustomer
 *
 * @returns {boolean} boolean : Update success (true) or failure (false)
 */
function updateLoyaltyInitializedFlag(registeredCustomer) {
    var Transaction = require('dw/system/Transaction');
    var YotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    if (!registeredCustomer) {
        return false;
    }
    var currCustomer = registeredCustomer;
    try {
        if (!('custom' in registeredCustomer.profile) || ('custom' in registeredCustomer.profile && !('isLoyaltyProgramInitialized' in registeredCustomer.profile.custom)) || ('custom' in registeredCustomer.profile && 'isLoyaltyProgramInitialized' in registeredCustomer.profile.custom && !registeredCustomer.profile.custom.isLoyaltyProgramInitialized)) {
            Transaction.wrap(function () {
                currCustomer.profile.custom.isLoyaltyProgramInitialized = true;
            });
        }
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while updating the isLoyaltyProgramInitialized flag on customer: ' + registeredCustomer.profile.customerNo +
        ', Exception is: ' + ex, 'error', 'Account~SubmitRegistration');
        return false;
    }
    return true;
}

exports.prepareCustomerJSON = prepareCustomerJSON;
exports.prepareCustomersJSON = prepareCustomersJSON;
exports.searchCustomer = searchCustomer;
exports.searchCustomers = searchCustomers;
exports.updateLoyaltyInitializedFlag = updateLoyaltyInitializedFlag;
