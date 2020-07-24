const { I, homePage, confirmationPage, uriUtils } = inject();

Given('shopper is viewing the confirmation page', () => {
    // From "test/acceptance/features/orderConfirmationPage/orderConfirmationTracking.feature" {"line":5,"column":9}
    I.amOnPage(uriUtils.uri.confirmationPage);
    homePage.accept();
});

Then('the tracking pixel is rendered', () => {
    // From "test/acceptance/features/orderConfirmationPage/orderConfirmationTracking.feature" {"line":6,"column":9}
    I.seeElement(confirmationPage.locators.conversion);
});
