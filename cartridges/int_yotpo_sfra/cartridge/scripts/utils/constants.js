'use strict';

/**
 * @module scripts/utils/Contants
 *
 * This is a file used to put all constants here which will be reused in Yotpo cartridge.
 */

// Export Orders
/**
 * Trailing spaces are automatically stripped in the product specification.
 * Any combination of leading zeros (“0”), leading spaces and leading dashes (“-“) are automatically stripped in the product specification.
 * The product specification only supports alphanumeric (a...z, A...Z, 0...9), "_" and "-" characters.
 * The product specification value is case-sensitive.
 * The product specification value “N/A” is invalid in any case and is ignored.
 * The product ID only supports alphanumeric (a...z, A...Z, 0...9), "_" and "-" characters without spaces.
 * Sending an invalid character in the product ID will cause the transaction to be ignored with no indication of failure.
 */
exports.YOTPO_JOB_CONFIG_ID = '1';
exports.YOTPO_CONFIGURATION_OBJECT = 'yotpoConfiguration';
exports.YOTPO_JOBS_CONFIGURATION_OBJECT = 'yotpoJobsConfiguration';
exports.DATE_FORMAT_FOR_YOTPO_DATA = 'yyyy-MM-dd';
exports.PLATFORM_FOR_YOTPO_DATA = 'commerce_cloud';
exports.YOTPO_CARTRIDGE_VERSION = '21.6.0';
exports.REGEX_BASE_FOR_YOTPO_DATA = '^0-9a-zA-Z';
exports.PRODUCT_REGEX_FOR_YOTPO_DATA = '[^0-9a-zA-Z\\_\\-]+';
exports.REGEX_FOR_YOTPO_DATA = '[^0-9a-zA-Z\\s\\_\\-]+'; // allowing whitespace in this one
exports.REGEX_FOR_YOTPO_DATA_SAFE_SPECIAL_CHARS = ':,\\.\\?\\!\\|\\+\\_\\-=\\$\\*#%& ';
exports.REGEX_FOR_YOTPO_PRODUCT_ID_DATA_SAFE_SPECIAL_CHARS = '\\_\\- ';
// The email validation regex that the Yotpo API is using (PCRE2 flavor): /\A\s*([#-\\p{L}\\d+._" : "^@\\s]{1,64})@((?:[-\p{L}\d]+\.)+\p{L}{2,})\s*\z/i
// The below email regex is that regex converted to work with JavaScript
// The regex that the API uses may not be RFC-compliant, but it seems like it covers the majority of good/bad email cases correctly.
// Previously an RFC-spec regex was used, but it allowed some emails through that the Yotpo API rejected, so this was updated to match the
// regex used by the Yotpo API as close as possible.
// Note that this regex will filter out potentially valid email addresses if they use certain special unicode characters.
exports.EMAIL_VALIDATION_REGEX_FOR_YOTPO_DATA = /^\s*([#-\u002D\u002E\u003A-\u0040a-zA-Z0-9_" /\[\\^\{\}]{1,63}[#-\u002D\u003A-\u0040a-zA-Z0-9_" /\[\\^\{\}])@((?:[-a-zA-Z0-9\u00AA\u00B5\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u0100]+\.)+[a-zA-Z\u00AA\u00B5\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u0100]{2,})\s*$/i;  // eslint-disable-line
exports.EMAIL_REGEX_FOR_YOTPO_DATA = ' ';
exports.SERVICE_MAX_TIMEOUTS = 5;
exports.PRODUCT_ID_TOKEN = 'PRODUCT_ID__';
// use this regex to remove above prefix, as passing the global flag into .replace() is deprecated on newer compatibility modes
exports.PRODUCT_ID_PREFIX_REGEX = /PRODUCT_ID__/g;
// Used to calculate % threshold of skipped orders. Once reached the
// job is flagged with an ERROR status that is displayed in the BM
exports.EXPORT_ORDER_ERROR_COUNT_THRESHOLD = 0.03;

// Error Codes
exports.CARTRIDGE_DISABLED_ERROR = 'CARTRIDGE_DISABLED_ERROR';
exports.AUTH_ERROR = 'AUTH_ERROR';
exports.YOTPO_CONFIGURATION_LOAD_ERROR = 'YOTPO_CONFIGURATION_LOAD_ERROR';
exports.EXPORT_CARTRIDGE_CONFIG_ERROR = 'EXPORT_CARTRIDGE_CONFIG_ERROR';
exports.EXPORT_CARTRIDGE_CONFIG_RETRY_ERROR = 'EXPORT_CARTRIDGE_CONFIG_RETRY_ERROR';
exports.EXPORT_CARTRIDGE_CONFIG_NO_ENABLED_CONFIG_ERROR = 'EXPORT_CARTRIDGE_CONFIG_NO_ENABLED_CONFIG_ERROR';
exports.YOTPO_ORDER_MISSING_ERROR = 'YOTPO_ORDER_MISSING_ERROR';
exports.EXPORT_ORDER_CONFIG_ERROR = 'EXPORT_ORDER_CONFIG_ERROR';
exports.EXPORT_ORDER_SERVICE_ERROR = 'EXPORT_ORDER_SERVICE_ERROR';
exports.EXPORT_ORDER_RETRY_ERROR = 'EXPORT_ORDER_RETRY_ERROR';
exports.EXPORT_ORDER_INVALID_EMAIL_ADDRESS_ERROR = 'EXPORT_ORDER_INVALID_EMAIL_ADDRESS_ERROR';
exports.EXPORT_ORDER_JOB_FAILED_ERROR = 'EXPORT_ORDER_JOB_FAILED_ERROR';
exports.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR = 'EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR';
exports.EXPORT_ORDER_NO_ENABLED_CONFIG_ERROR = 'EXPORT_ORDER_NO_ENABLED_CONFIG_ERROR';
exports.EXPORT_ORDER_OPTIONAL_PRODUCT_DATA_ERROR = 'EXPORT_ORDER_OPTIONAL_PRODUCT_DATA_ERROR';
exports.EXPORT_ORDER_OPTIONAL_PRODUCT_SPECS_DATA_ERROR = 'EXPORT_ORDER_OPTIONAL_PRODUCT_SPECS_DATA_ERROR';
exports.EXPORT_ORDER_MISSING_PRODUCT_ERROR = 'EXPORT_ORDER_MISSING_PRODUCT_ERROR';
exports.EXPORT_ORDER_MISSING_CUSTOMER_ERROR = 'EXPORT_ORDER_MISSING_CUSTOMER_ERROR';
exports.EXPORT_ORDER_CUSTOMER_DATA_ERROR = 'EXPORT_ORDER_CUSTOMER_DATA_ERROR';
exports.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR = 'EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR';
exports.EXPORT_CUSTOMER_MISSING_MANDATORY_FIELDS_ERROR = 'EXPORT_CUSTOMER_MISSING_MANDATORY_FIELDS_ERROR';

exports.EXPORT_LOYALTY_ORDER_ERROR = 'EXPORT_LOYALTY_ORDER_ERROR';
exports.EXPORT_LOYALTY_CUSTOMER_ERROR = 'EXPORT_LOYALTY_CUSTOMER_ERROR';
exports.YOTPO_CUSTOMER_MISSING_ERROR = 'YOTPO_CUSTOMER_MISSING_ERROR';
exports.EXPORT_LOYALTY_SERVICE_ERROR = 'EXPORT_LOYALTY_SERVICE_ERROR';
exports.LOYALTY_API_SERVICE_ERROR = 'LOYALTY_API_SERVICE_ERROR';

// API HTTP STATUS CODES
exports.STATUS_200 = '200';
exports.STATUS_401 = '401';
exports.STATUS_400 = '400';
exports.STATUS_404 = '404';
exports.STATUS_500 = '500';

// Order Volume by days
exports.ORDER_VOLUME_DAYS = 30;

// Loyalty Module Constants
exports.YOTPO_LOYALTY_CUSTOMER_EXPORT_OBJECT = 'yotpoLoyaltyCustomer';
exports.YOTPO_LOYALTY_ORDER_EXPORT_OBJECT = 'yotpoLoyaltyOrder';
