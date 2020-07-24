Feature: Order Confirmation Page Template Tracking
    As a shopper, I want the tracking pixel to be generated on the Order Confirmation page

    Scenario: Tracking Url is generated on the Order Confirmation Page
        Given shopper is viewing the confirmation page
        Then the tracking pixel is rendered

