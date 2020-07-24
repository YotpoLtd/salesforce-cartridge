'use strict';

/**
 * Utility function to update checked attribute of selector
 * @param {string} elementId DOM Id of element to update
 * @param {boolean} value Checkbox value
 */
function setCheckedValue(elementId, value) {
    var elementSelector = '#' + elementId;
    jQuery(elementSelector).prop('checked', value);
}

/**
 * Updates the apply button disabled attribute
 * @param {string} appKey Current input value for app key
 * @param {string} clientSecret Current input value for client secret
 */
function toggleApplyButton(appKey, clientSecret) {
    var updateDisabled = !appKey || (appKey && appKey.length <= 0) ||
        !clientSecret || (clientSecret && clientSecret.length <= 0);

    jQuery('#update-btn').prop('disabled', updateDisabled);
}

/**
 * Toggles enabled state of apply button dependent on
 * the validity of the form
 */
function checkAndUpdateApplyButton() {
    var appkey = jQuery('#appkey').val();
    var clientsecret = jQuery('#clientsecret').val();
    toggleApplyButton(appkey, clientsecret);
}

/**
 * Clears error messages on the form
 */
function clearErrors() {
    jQuery('.invalid-feedback').each(function () {
        jQuery(this).html('');
    });
}

/**
 * Initializes events for the form
 */
function initEvents() {
    jQuery(window).load(checkAndUpdateApplyButton());
    jQuery('#appkey, #clientsecret').on('keyup keypress blur change', function () {
        checkAndUpdateApplyButton();
    });
}

jQuery(document).ready(function () {
    initEvents();

    jQuery('#locale').change(function () {
        var localeVal = jQuery(this).val();
        var url = jQuery(this).data('action') + '?selectedlocale=' + localeVal;
        clearErrors();
        jQuery.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                if (data.success) {
                    var selectedConfig = data.selectedLocaleConfig;
                    var isAddEnabled = selectedConfig.isAddEnabled;
                    jQuery('#appkey').val(selectedConfig.appkey);
                    jQuery('#clientsecret').val(selectedConfig.clientsecret);
                    jQuery('#utokenauth').val(selectedConfig.utokenauth);
                    var isRatingsEnabled = selectedConfig.ratingsenabled;
                    var isReviewsEnabled = selectedConfig.reviewsenabled;
                    var isFeedEnabled = selectedConfig.purchasefeedenabled;
                    setCheckedValue('ratingsenabled', isRatingsEnabled);
                    setCheckedValue('reviewsenabled', isReviewsEnabled);
                    setCheckedValue('purchasefeedenabled', isFeedEnabled);
                    if (isAddEnabled) {
                        jQuery('#remove-btn').prop('disabled', true);
                    } else {
                        jQuery('#remove-btn').prop('disabled', false);
                    }
                    toggleApplyButton(selectedConfig.appkey, selectedConfig.clientsecret);
                    initEvents();
                }
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
            }
        });
        return false;
    });

    jQuery('#update-btn, #remove-btn').click(function (e) {
        var jQueryform = jQuery(this).closest('form');
        e.preventDefault();
        var url = jQuery(this).data('action');
        jQueryform.attr('action', url);
        clearErrors();
        jQuery('#yotpoconfigform').trigger('yotpoconfigform:submit', e);
        jQuery.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: jQueryform.serialize(),
            success: function (data) {
                if (data.success) {
                    location.href = data.redirectUrl;
                } else if (data.errors) {
                    var numErrors = data.errors.length;
                    for (var i = 0; i < numErrors; i++) {
                        var currentError = data.errors[i];
                        if (currentError.errorElement) {
                            var elementSelector = '#' + currentError.errorElement + '-invalid-feedback';
                            var elementError = currentError.errorMsg;
                            jQuery(elementSelector).html(elementError);
                        }
                    }
                }
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
            }
        });
        return false;
    });
});
