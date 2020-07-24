Feature: Product Landing Page Ratings
    As a shopper, I want to see ratings on the Product Landing Page

    Scenario: Shopper sees the product ratings on the product landing page
        When shopper selects yes or no for tracking consent
        Given shopper searches for "Bootleg"
        Then shopper sees the product rating

