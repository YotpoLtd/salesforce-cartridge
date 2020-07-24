const { I, homePage, productPage, uriUtils } = inject();

When('shopper goes to the Product Detail Page', () => {
    // From "test/acceptance/features/productDetailPage/pdpRatingsAndReviews.feature" {"line":5,"column":9}
    I.amOnPage(uriUtils.uri.simpleProductDetailPage);
    homePage.accept()
});

Then('shopper sees the product ratings', () => {
    // From "test/acceptance/features/productDetailPage/pdpRatingsAndReviews.feature" {"line":9,"column":9}
    I.seeElement(productPage.locators.ratings);
});

Then('shopper sees the product reviews', () => {
    // From "test/acceptance/features/productDetailPage/pdpRatingsAndReviews.feature" {"line":13,"column":9}
    I.seeElement(productPage.locators.reviewsWidget);
    I.seeElement(productPage.locators.writeReviewButton);
});
