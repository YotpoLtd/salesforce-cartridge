Feature: Product Detail Page Ratings and Reviews
    As a shopper, I want to see ratings and reviews sections for a Simple Product

    Background: shopper is on product details page
        When shopper goes to the Product Detail Page

    @ratingsAndReviews
    Scenario: Shopper sees the product ratings on the Simple product page
        Then shopper sees the product ratings

    @ratingsAndReviews
    Scenario: Shopper sees the product reviews on the Simple product page
        Then shopper sees the product reviews
