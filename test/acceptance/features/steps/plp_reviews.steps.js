
const { I, homePage, productLandingPage, uriUtils } = inject();

When('shopper selects yes or no for tracking consent', () => {
    // From "test/acceptance/features/productLandingPage/plpRatings.feature" {"line":5,"column":9}
    I.amOnPage(uriUtils.uri.homePage);
    homePage.accept();
});

Given('shopper searches for {string}', (searchString) => {
    // From "test/acceptance/features/productLandingPage/plpRatings.feature" {"line":6,"column":9}
    homePage.search(searchString);
});

Then('shopper sees the product rating', () => {
    // From "test/acceptance/features/productLandingPage/plpRatings.feature" {"line":7,"column":9}
    I.seeElement(productLandingPage.locators.ratings);
});
