var path = require('path');

/* global cat, cd, cp, echo, exec, exit, find, ls, mkdir, pwd, rm, target, test */
require('shelljs/make');

var RELATIVE_PATH = './test/acceptance';
var OUTPUT_PATH = RELATIVE_PATH + '/report';
var HOST = getSandboxUrl();

function getSandboxUrl() {
    if (test('-f', path.join(process.cwd(), 'dw.json'))) {
        var config = cat(path.join(process.cwd(), 'dw.json'));
        var parsedConfig = JSON.parse(config);

        return '' + parsedConfig.hostname;
    }
    return '';
}

var webDriver = {
    url: `https://${HOST}`,
    browser: 'chrome',
    smartWait: 10000,
    waitForTimeout: 10000,
    timeouts: {
        script: 60000,
        'page load': 10000
    }
};

exports.config = {
    output: OUTPUT_PATH,
    helpers: {
        WebDriver: webDriver
    },
    plugins: {
        wdio: {
            enabled: true,
            services: ['selenium-standalone']
        },
        allure: {
            enabled: true
        },
        retryFailedStep: {
            enabled: true,
            retries: 5
        }
    },
    include: {
        homePage: RELATIVE_PATH + '/pages/HomePage.js',
        confirmationPage: RELATIVE_PATH + '/pages/ConfirmationPage.js',
        productPage: RELATIVE_PATH + '/pages/ProductPage.js',
        productLandingPage: RELATIVE_PATH + '/pages/ProductLandingPage.js',
        uriUtils: RELATIVE_PATH + '/utils/uriUtils.js'
    },
    gherkin: {
        features: RELATIVE_PATH + '/features/**/*.feature',
        steps: [
            RELATIVE_PATH + '/features/steps/confirmation.steps.js',
            RELATIVE_PATH + '/features/steps/pdp_ratings_and_reviews.steps.js',
            RELATIVE_PATH + '/features/steps/plp_reviews.steps.js'
        ]
    },
    tests: RELATIVE_PATH + '/tests/**/*.test.js',
    name: 'yotpo-link'
};
