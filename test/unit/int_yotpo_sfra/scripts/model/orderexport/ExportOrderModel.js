'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const cloneDeep = require('lodash.clonedeep');

describe('ExportOrderModel', () => {
    const sfccConfigurationScenarios = require('../../../testData/sfccConfigurationScenarios');
    const yotpoExpectedReturnValues = require('../../../testData/yotpoExpectedReturnValues');
    const serviceResponses = require('../../../testData/serviceResponses');

    const productMock = require('../../mocks/catalog/product');
    const shipmentMock = require('../../mocks/order/shipment');
    const orderMock = require('../../mocks/order/order');
    const productLineItemMock = require('../../mocks/catalog/productLineItem');
    const siteMock = require('../../mocks/system/site');
    const customObjectMgrMock = require('../../mocks/object/customObjectMgr');
    const loggerMock = require('../../mocks/system/logger');
    const transactionMock = require('../../mocks/system/transaction');
    const orderMgrMock = require('../../mocks/order/orderMgr');
    const serviceMock = require('../../mocks/svc/service');
    const productMgrMock = require('../../mocks/catalog/productMgr');

    const ApiStubs = {
        'dw/system/Site': siteMock,
        'dw/system/Logger': loggerMock,
        'dw/util/Calendar': function () {
            return {
                getTime: () => ''
            };
        },
        'dw/order/Order': {
            EXPORT_STATUS_READY: 2,
            EXPORT_STATUS_EXPORTED: 1
        },
        'dw/order/OrderMgr': orderMgrMock,
        'dw/system/Transaction': transactionMock,
        'dw/catalog/ProductMgr': productMgrMock,
        'dw/web/URLUtils': {
            abs: () => {
                return 'productUrl';
            }
        },
        'dw/object/CustomObjectMgr': customObjectMgrMock
    };

    const exportOrderServiceRegistry = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/serviceregistry/exportOrderServiceRegistry', {
        'dw/svc/LocalServiceRegistry': {
            createService: () => true
        }
    });

    exportOrderServiceRegistry.yotpoExportOrdersSvc = serviceMock;

    const constants = require('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/constants');

    const yotpoUtils = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/scripts/utils/yotpoUtils', {
        'dw/util/Calendar': function () {},
        'dw/util/StringUtils': {
            formatCalendar: () => { return {}; }
        },
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': {
            logMessage: () => { }
        }
    });

    yotpoUtils.getProductImageUrl = () => {};

    const yotpoConfigurationModel = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/models/common/yotpoConfigurationModel', {
        ...ApiStubs,
        '*/cartridge/scripts/utils/yotpoUtils.js': yotpoUtils,
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoLogger': {
            logMessage: () => { }
        }
    });

    const ExportOrderModel = proxyquire('../../../../../../cartridges/int_yotpo_sfra/cartridge/models/orderexport/exportOrderModel', {
        ...ApiStubs,
        '*/cartridge/scripts/utils/constants': constants,
        '*/cartridge/scripts/utils/yotpoUtils': yotpoUtils,
        '*/cartridge/models/common/yotpoConfigurationModel': yotpoConfigurationModel,
        '*/cartridge/scripts/utils/yotpoLogger': {
            logMessage: () => { }
        },
        '*/cartridge/scripts/serviceregistry/exportOrderServiceRegistry': exportOrderServiceRegistry,
        '*/cartridge/models/authentication/authenticationModel': {
            authenticate: (appKey, clientSecretKey) => {
                if (appKey && clientSecretKey) {
                    return {
                        errorResult: false,
                        updatedUTokenAuthCode: 'utokenAuthCode'
                    };
                }
                return {
                    errorResult: true
                };
            }
        }
    });


    let exportOrderModelInstance = new ExportOrderModel();

    describe('getExportOrderConfig', () => {
        afterEach(function () {
            siteMock.getCurrent().getPreferences.reset();
        });

        it('Should return order export config object with enabled configuration', () => {
            const enabledConfig = sfccConfigurationScenarios.enabledConfig;

            siteMock.getCurrent().getPreferences.returns({
                ...enabledConfig,
                localeID: 'default'
            });

            const exportOrderConfig = exportOrderModelInstance.getExportOrderConfig();

            assert.deepEqual(exportOrderConfig, yotpoExpectedReturnValues.orderExportEnabled);
        });

        it('Should return order export config object with disabled configuration', () => {
            const disabledConfig = sfccConfigurationScenarios.disabledConfig;

            siteMock.getCurrent().getPreferences.returns({
                ...disabledConfig,
                localeID: 'default'
            });

            const exportOrderConfig = exportOrderModelInstance.getExportOrderConfig();

            assert.deepEqual(exportOrderConfig, yotpoExpectedReturnValues.orderExportDisabled);
        });
    });

    describe('validateOrderFeedConfigData', () => {
        it('Should return false because order feed is disabled', () => {
            const result = exportOrderModelInstance.validateOrderFeedConfigData({ ...sfccConfigurationScenarios.disabledConfig, localeID: 'default' }, sfccConfigurationScenarios.lastJobRunInPastDateTimes.orderFeedJobLastExecutionTime);
            assert.equal(result, false);
        });

        it('Should return false because configValidationResult is not valid', () => {
            const result = exportOrderModelInstance.validateOrderFeedConfigData({ ...sfccConfigurationScenarios.enabledConfig, localeID: 'default' }, null);
            assert.equal(result, false);
        });

        it('Should return false because jobValidationResult is not valid', () => {
            const result = exportOrderModelInstance.validateOrderFeedConfigData({ ...sfccConfigurationScenarios.disabledConfig, localeID: 'default' }, sfccConfigurationScenarios.lastJobRunInPastDateTimes.orderFeedJobLastExecutionTime);
            assert.equal(result, false);
        });

        it('Should return true because data is valid', () => {
            const result = exportOrderModelInstance.validateOrderFeedConfigData({ ...sfccConfigurationScenarios.enabledConfig, localeID: 'default' }, sfccConfigurationScenarios.lastJobRunInPastDateTimes.orderFeedJobLastExecutionTime);
            assert.equal(result, true);
        });
    });

    describe('validateLocaleConfigData', () => {
        const yotpoEnabledDefaultLocale = {
            custom: {
                localeID: 'default',
                ...sfccConfigurationScenarios.enabledConfig.custom
            }
        };

        const yotpoEnabledenUSLocale = {
            custom: {
                localeID: 'en_US',
                ...sfccConfigurationScenarios.enabledConfig.custom
            }
        };

        const yotpoDisabledDefaultLocale = {
            custom: {
                localeID: 'default',
                ...sfccConfigurationScenarios.disabledConfig.custom
            }
        };

        const yotpoDisabledenUSLocale = {
            custom: {
                localeID: 'en_US',
                ...sfccConfigurationScenarios.disabledConfig.custom
            }
        };

        const yotpoEnabledConfigurations = {
            0: yotpoEnabledDefaultLocale,
            1: yotpoEnabledenUSLocale,
            size: () => 2
        };

        const yotpoDisabledConfigurations = {
            0: yotpoDisabledDefaultLocale,
            1: yotpoDisabledenUSLocale,
            size: () => 2
        };

        const yotpoEnabledDefaultDisabledUSConfigurations = {
            0: yotpoEnabledDefaultLocale,
            1: yotpoDisabledenUSLocale,
            size: () => 2
        };

        const yotpoEnabledUSDisabledDefaultConfigurations = {
            0: yotpoDisabledDefaultLocale,
            1: yotpoEnabledenUSLocale,
            size: () => 2
        };

        it('Should return array with enabled localeID "default"', () => {
            const result = exportOrderModelInstance.validateLocaleConfigData(yotpoEnabledDefaultDisabledUSConfigurations, sfccConfigurationScenarios.lastJobRunInPastDateTimes);
            assert.deepEqual(result, ['default']);
        });

        it('Should return array with enabled localeID "en_US"', () => {
            const result = exportOrderModelInstance.validateLocaleConfigData(yotpoEnabledUSDisabledDefaultConfigurations, sfccConfigurationScenarios.lastJobRunInPastDateTimes);
            assert.deepEqual(result, ['en_US']);
        });

        it('Should return array with enabled localeID "default" & "en_US"', () => {
            const result = exportOrderModelInstance.validateLocaleConfigData(yotpoEnabledConfigurations, sfccConfigurationScenarios.lastJobRunInPastDateTimes);
            assert.deepEqual(result, ['default', 'en_US']);
        });

        it('Should throw EXPORT_ORDER_NO_ENABLED_CONFIG_ERROR because all locales are disabled', () => {
            const logHeader = '\n\n------- Yotpo Purchase Feed Configuration Validation ---------\n' +
                'Current Site ID: ' + siteMock.getCurrent().getName() + '\n';
            const logFooter = '\n--------------------------------------------------------------\n\n';

            const expectedError = logHeader +
                constants.EXPORT_ORDER_NO_ENABLED_CONFIG_ERROR + ': Exiting Yotpo Purchase Feed job. No locales have the Yotpo Purchase Feed enabled' +
                logFooter;

            assert.throws(
                () => exportOrderModelInstance.validateLocaleConfigData(yotpoDisabledConfigurations, sfccConfigurationScenarios.lastJobRunInPastDateTimes),
                Error,
                expectedError
            );
        });
    });

    describe('searchOrders', () => {
        it('Should return true because searchOrders is called with the parameters we expect', () => {
            const orderFeedJobLastExecutionTime = sfccConfigurationScenarios.lastJobRunInPastDateTimes.orderFeedJobLastExecutionTime;
            const currentDateTime = sfccConfigurationScenarios.lastJobRunInPastDateTimes.currentDateTime;
            const localesToProcess = ['default'];

            exportOrderModelInstance.searchOrders(orderFeedJobLastExecutionTime, currentDateTime, localesToProcess);

            const queryString = 'creationDate >= {0} AND creationDate <= {1} AND (exportStatus = {2} OR exportStatus = {3}) AND (customerLocaleID = {4})';
            const sortString = 'orderNo ASC';

            assert.isTrue(orderMgrMock.searchOrders.calledWith(queryString, sortString, orderFeedJobLastExecutionTime, currentDateTime, 2, 1, 'default'));
        });
    });

    describe('prepareRequestParamsData', () => {
        it('Should return valid request parameters because utokenAuthCode is present', () => {
            const result = exportOrderModelInstance.prepareRequestParamsData(sfccConfigurationScenarios.enabledConfig.custom.utokenAuthCode);
            assert.deepEqual(result, sfccConfigurationScenarios.baseYotpoRequestParams);
        });
    });

    describe('getServiceAuthToken', () => {
        it('Should return utokenAuthCode because appKey & clientSecretKey are present', () => {
            const enabledConfig = sfccConfigurationScenarios.enabledConfig;
            const result = exportOrderModelInstance.getServiceAuthToken(enabledConfig);
            assert.equal(result, enabledConfig.custom.utokenAuthCode);
        });

        it('Should return empty string because appKey & clientSecretKey are not present', () => {
            const disabledConfig = sfccConfigurationScenarios.disabledConfig;
            const result = exportOrderModelInstance.getServiceAuthToken(disabledConfig);
            assert.isFalse(result || false);
        });
    });

    describe('saveCustomObjectData', () => {
        afterEach(() => {
            transactionMock.wrap.reset();
        });

        it('Should return true because customObject key and value are passed correctly', () => {
            exportOrderModelInstance.saveCustomObjectData(sfccConfigurationScenarios.enabledConfig, 'utokenAuthCode', 'utokenAuthCode');
            assert.isTrue(transactionMock.wrap.called);
        });

        it('Should return false because customObject is missing custom property', () => {
            exportOrderModelInstance.saveCustomObjectData({}, 'utokenAuthCode', 'utokenAuthCode');
            assert.isFalse(transactionMock.wrap.called);
        });
    });

    describe('getConfigAndRequestsByLocale', () => {
        const orderFeedJobLastExecutionTime = sfccConfigurationScenarios.lastJobRunInPastDateTimes.orderFeedJobLastExecutionTime;

        const yotpoEnabledDefaultLocale = {
            custom: {
                localeID: 'default',
                ...sfccConfigurationScenarios.enabledConfig.custom
            }
        };

        const yotpoEnabledenUSLocale = {
            custom: {
                localeID: 'en_US',
                ...sfccConfigurationScenarios.enabledConfig.custom
            }
        };

        const yotpoDisabledDefaultLocale = {
            custom: {
                localeID: 'default',
                ...sfccConfigurationScenarios.disabledConfig.custom
            }
        };

        const yotpoDisabledenUSLocale = {
            custom: {
                localeID: 'en_US',
                ...sfccConfigurationScenarios.disabledConfig.custom
            }
        };

        const yotpoEnabledNoTokenDefaultLocale = {
            custom: {
                localeID: 'default',
                ...sfccConfigurationScenarios.noTokenConfig.custom
            }
        };

        const yotpoEnabledConfigurations = {
            0: yotpoEnabledDefaultLocale,
            1: yotpoEnabledenUSLocale,
            size: () => 2
        };

        const yotpoDisabledConfigurations = {
            0: yotpoDisabledDefaultLocale,
            1: yotpoDisabledenUSLocale,
            size: () => 2
        };

        const yotpoNoTokenConfigurations = {
            0: yotpoEnabledNoTokenDefaultLocale,
            size: () => 1
        };

        it('Should return correct config & request info per locale', () => {
            const expectedConfigAndRequestsByLocale = {
                appKeysAndTokensByLocale: { ...sfccConfigurationScenarios.configsByLocale },
                requestsDataByLocale: {
                    'default': cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams),
                    'en_US': cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams)
                }
            };

            const result = exportOrderModelInstance.getConfigAndRequestsByLocale(yotpoEnabledConfigurations, orderFeedJobLastExecutionTime);
            assert.deepEqual(result, expectedConfigAndRequestsByLocale);
        });

        it('Should return empty objects because configValidationResult is not valid', () => {
            const expectedConfigAndReqeustsByLocale = {
                appKeysAndTokensByLocale: {},
                requestsDataByLocale: {}
            };

            const result = exportOrderModelInstance.getConfigAndRequestsByLocale(yotpoDisabledConfigurations, null);

            assert.deepEqual(result, expectedConfigAndReqeustsByLocale);
        });

        it('Should return empty objects because jobValidationResult is not valid', () => {
            const expectedConfigAndReqeustsByLocale = {
                appKeysAndTokensByLocale: {},
                requestsDataByLocale: {}
            };

            const result = exportOrderModelInstance.getConfigAndRequestsByLocale(yotpoDisabledConfigurations, orderFeedJobLastExecutionTime);

            assert.deepEqual(result, expectedConfigAndReqeustsByLocale);
        });

        it('Should return true because getServiceAuthToken is called', () => {
            let sinonGetServiceAuthTokenSpy = sinon.spy(exportOrderModelInstance, 'getServiceAuthToken');

            exportOrderModelInstance.getConfigAndRequestsByLocale(yotpoNoTokenConfigurations, orderFeedJobLastExecutionTime);
            assert.isTrue(sinonGetServiceAuthTokenSpy.called);

            sinonGetServiceAuthTokenSpy.restore();
        });
    });

    describe('loadAllYotpoConfigurations', () => {
        it('Should return true because yotpoConfigurationModel.loadAllYotpoConfigurations is called', () => {
            const sinonLoadAllYotpoConfigurationsSpy = sinon.spy(yotpoConfigurationModel, 'loadAllYotpoConfigurations');

            exportOrderModelInstance.loadAllYotpoConfigurations();

            assert.isTrue(sinonLoadAllYotpoConfigurationsSpy.called);

            sinonLoadAllYotpoConfigurationsSpy.restore();
        });
    });

    describe('loadYotpoJobConfigurations', () => {
        it('Should return true because yotpoConfigurationModel.loadYotpoJobConfigurations is called', () => {
            const loadYotpoJobConfigurationsSpy = sinon.spy(yotpoConfigurationModel, 'loadYotpoJobConfigurations');
            customObjectMgrMock.getCustomObject.returns(sfccConfigurationScenarios.jobConfig);

            exportOrderModelInstance.loadYotpoJobConfigurations();

            assert.isTrue(loadYotpoJobConfigurationsSpy.called);

            loadYotpoJobConfigurationsSpy.restore();
        });
    });

    describe('prepareCustomerData', () => {
        it('Should return correct customer info with data extracted from the customer profile', () => {
            orderMock.customer.isRegistered.returns(true);
            const result = exportOrderModelInstance.prepareCustomerData(orderMock);
            assert.deepEqual(result, {
                customer_name: 'firstName lastName',
                email: 'profile@email.com'
            });
        });

        it('Should return correct customer info with data extracted from the order', () => {
            orderMock.customer.isRegistered.returns(false);
            const result = exportOrderModelInstance.prepareCustomerData(orderMock);
            assert.deepEqual(result, {
                customer_name: 'customerName',
                email: 'order@email.com'
            });
        });
    });

    describe('getIfCouponWasApplied', () => {
        const isBasedOnCouponStub = sinon.stub();

        beforeEach(() => {
            isBasedOnCouponStub.reset();

            productLineItemMock.getPriceAdjustments().iterator().hasNext.onFirstCall().returns(true);
            productLineItemMock.getPriceAdjustments().iterator().next.onFirstCall().returns({
                isBasedOnCoupon: isBasedOnCouponStub
            });
        });

        it('Should return true because productLineItem priceAdjustment is based on a coupon', () => {
            isBasedOnCouponStub.returns(true);

            const isCouponApplied = exportOrderModelInstance.getIfCouponWasApplied(productLineItemMock);

            assert.isTrue(isCouponApplied);
        });

        it('Should return false because productLineItem priceAdjustment is not based on a coupon', () => {
            isBasedOnCouponStub.returns(false);

            const isCouponApplied = exportOrderModelInstance.getIfCouponWasApplied(productLineItemMock);

            assert.isFalse(isCouponApplied);
        });
    });

    describe('prepareOrderProductsOptionalData', () => {
        before(() => {
            sinon.stub(yotpoUtils, 'getProductImageUrl').returns('imageUrl');
        });

        it('Should return expected optional product data', () => {
            const result = exportOrderModelInstance.prepareOrderProductsOptionalData(productMock, productLineItemMock);

            assert.deepEqual(result, yotpoExpectedReturnValues.optionalProductData);
        });

        it('Should not return optional product data when missing on product', () => {
            let product = { ...productMock };
            product.brand = null;

            const expectedProductData = { ...yotpoExpectedReturnValues.optionalProductData };
            delete expectedProductData.name;

            const result = exportOrderModelInstance.prepareOrderProductsOptionalData(product, productLineItemMock);
            assert.notDeepEqual(result, expectedProductData);
        });

        after(() => {
            yotpoUtils.getProductImageUrl.restore();
        });
    });

    describe('prepareOrderProductsSpecsData', () => {
        const productSpecsData = {
            upc: 'UPC'
        };

        it('Should return product specs data', () => {
            let product = { ...productMock };
            const result = exportOrderModelInstance.prepareOrderProductsSpecsData(product);
            assert.deepEqual(result, productSpecsData);
        });

        it('Should not return product specs data when missing on product', () => {
            let product = { ...productMock };
            product.UPC = null;

            const result = exportOrderModelInstance.prepareOrderProductsSpecsData(product);
            assert.notDeepEqual(result, productSpecsData);
        });
    });

    describe('prepareOrderProductsData', () => {
        before(() => {
            sinon.stub(yotpoUtils, 'getProductImageUrl').returns('imageUrl');
            orderMock.customer.isRegistered.returns(true);
            siteMock.getCurrent().getPreferences.returns(sfccConfigurationScenarios.enabledConfig);
        });

        beforeEach(() => {
            shipmentMock.getProductLineItems().iterator().next.returns(productLineItemMock);
            shipmentMock.getProductLineItems().iterator().hasNext.onFirstCall().returns(true);
            orderMock.getShipments().iterator().next.returns(shipmentMock);
            orderMock.getShipments().iterator().hasNext.onFirstCall().returns(true);
        });

        afterEach(() => {
            shipmentMock.getProductLineItems().iterator().next.reset();
            shipmentMock.getProductLineItems().iterator().hasNext.reset();
            orderMock.getShipments().iterator().next.reset();
            orderMock.getShipments().iterator().hasNext.reset();
        });

        it('Should match expected product data for valid product', () => {
            let product = { ...productMock };

            product.getVariationModel.returns({
                master: product
            });

            productMgrMock.getProduct.returns(product);

            const generatedProductsData = exportOrderModelInstance.prepareOrderProductsData(orderMock);

            assert.deepEqual(generatedProductsData, yotpoExpectedReturnValues.productData);
        });

        it('Should not match product data when product brand is different', () => {
            let product = { ...productMock };
            product.brand = null;

            productMgrMock.getProduct.returns(product);
            product.getVariationModel.returns({
                master: product
            });

            const generatedProductsData = exportOrderModelInstance.prepareOrderProductsData(orderMock);

            assert.notDeepEqual(generatedProductsData, yotpoExpectedReturnValues.productsData);
        });

        it('Should throw an error for missing product name', () => {
            let product = { ...productMock };
            product.name = null;

            productMgrMock.getProduct.returns(product);
            product.getVariationModel.returns({
                master: product
            });

            assert.throws(
                () => exportOrderModelInstance.prepareOrderProductsData(orderMock),
                Error,
                constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR
            );
        });
    });

    describe('prepareOrderData', () => {
        before(() => {
            siteMock.getCurrent().getPreferences.returns(sfccConfigurationScenarios.enabledConfig);
        });

        beforeEach(() => {
            shipmentMock.getProductLineItems().iterator().hasNext.onFirstCall().returns(true);
            shipmentMock.getProductLineItems().iterator().next.onFirstCall().returns(productLineItemMock);
            orderMock.getShipments().iterator().next.onFirstCall().returns(shipmentMock);
            orderMock.getShipments().iterator().hasNext.onFirstCall().returns(true);
            orderMock.creationDate.returns({});
        });

        afterEach(() => {
            shipmentMock.getProductLineItems().iterator().next.reset();
            shipmentMock.getProductLineItems().iterator().hasNext.reset();
            orderMock.getShipments().iterator().next.reset();
            orderMock.getShipments().iterator().hasNext.reset();
        });

        it('Should return expected order data', () => {
            let product = { ...productMock };

            productMgrMock.getProduct.returns(product);
            product.getVariationModel.returns({
                master: product
            });

            const generatedOrderData = exportOrderModelInstance.prepareOrderData(orderMock, sfccConfigurationScenarios.lastJobRunInPastDateTimes);
            const expectedOrderData = {
                ...yotpoExpectedReturnValues.orderData,
                products: yotpoExpectedReturnValues.productData
            };

            assert.deepEqual(generatedOrderData, expectedOrderData);
        });

        it('Should throw an error because of missing order data', () => {
            let product = { ...productMock };
            product.name = null;

            productMgrMock.getProduct.returns(product);
            product.getVariationModel.returns({
                master: product
            });

            assert.throws(
                () => exportOrderModelInstance.prepareOrderData(orderMock, sfccConfigurationScenarios.lastJobRunInPastDateTimes),
                Error,
                constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR
            );
        });
    });

    describe('parseYotpoResponse', () => {
        it('Should return OK service response because request was successful', () => {
            let requestResult = { ...serviceResponses.base, object: JSON.stringify(serviceResponses.ok) };
            delete requestResult.error;
            delete requestResult.errorMessage;

            const result = exportOrderModelInstance.parseYotpoResponse(requestResult);

            assert.deepEqual(result, yotpoExpectedReturnValues.okServiceStatus);
        });

        it('Should return unauthorized service response because request was successful but, the response contains an authentication error', () => {
            let requestResult = { ...serviceResponses.base, object: JSON.stringify(serviceResponses.unauthorized) };
            requestResult.error = serviceResponses.unauthorized.code;
            requestResult.errorMessage.error = serviceResponses.unauthorized.msg;

            const result = exportOrderModelInstance.parseYotpoResponse(requestResult);
            assert.deepEqual(result, yotpoExpectedReturnValues.authErrorServiceStatus);
        });

        it('Should return error service response because request was successful but, the response contains a service error', () => {
            let requestResult = { ...serviceResponses.base, object: JSON.stringify(serviceResponses.unknownError) };
            requestResult.error = serviceResponses.unknownError.code;
            requestResult.errorMessage.error = serviceResponses.unknownError.msg;

            const result = exportOrderModelInstance.parseYotpoResponse(requestResult);
            assert.deepEqual(result, yotpoExpectedReturnValues.serviceErrorServiceStatus);
        });

        it('Should return general error response because request was unsuccessful', () => {
            let requestResult = { ...serviceResponses.base, ...serviceResponses.baseError };
            delete requestResult.object;

            const result = exportOrderModelInstance.parseYotpoResponse(requestResult);
            assert.deepEqual(result, yotpoExpectedReturnValues.serviceErrorServiceStatus);
        });
    });

    describe('updateUTokenInRequestData', () => {
        it('Should return object with updated auth token', () => {
            const result = exportOrderModelInstance.updateUTokenInRequestData('utokenAuthCode', {});
            assert.deepEqual(result, { utoken: 'utokenAuthCode' });
        });
    });

    describe('sendOrdersToYotpo', () => {
        afterEach(() => {
            serviceMock.call.reset();
        });

        it('Should return false because orders were sent with the correct parameters and there was not an authentication error', () => {
            const response = { ...serviceResponses.base, object: JSON.stringify(serviceResponses.ok) };

            serviceMock.call.returns(response);

            let orderRequestDataForLocale = cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams);
            orderRequestDataForLocale.orders.push(orderMock);

            const result = exportOrderModelInstance.sendOrdersToYotpo(orderRequestDataForLocale, 'appKey', 'default', false);

            assert.equal(result, false);
        });

        it('Should return true because there was an authentication error', () => {
            const response = { ...serviceResponses.base, object: JSON.stringify(serviceResponses.unauthorized) };

            serviceMock.call.returns(response);

            let orderRequestDataForLocale = cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams);
            orderRequestDataForLocale.orders.push(orderMock);

            const result = exportOrderModelInstance.sendOrdersToYotpo(orderRequestDataForLocale, 'appKey', 'default', false);

            assert.equal(result, true);
        });

        it('Should throw EXPORT_ORDER_RETRY_ERROR because there was an error retrying service requests', () => {
            const response = { ...serviceResponses.base, object: JSON.stringify(serviceResponses.unknownError) };

            serviceMock.call.returns(response);

            let orderRequestDataForLocale = cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams);
            orderRequestDataForLocale.orders.push(orderMock);

            const serviceErrorMsg = new Error('EXPORT_ORDER_RETRY_ERROR: Order Feed submission aborted due to repeated service errors \n' +
            ' Number of attempts: 5');

            try {
                exportOrderModelInstance.sendOrdersToYotpo(orderRequestDataForLocale, 'appKey', 'default', true);
            } catch (e) {
                assert.deepEqual(e, serviceErrorMsg);
            }
        });

        it('Should throw EXPORT_ORDER_RETRY_ERROR because there was an error retrying authentication', () => {
            const response = { ...serviceResponses.base, object: serviceResponses.unauthorized };

            serviceMock.call.returns(response);

            let orderRequestDataForLocale = cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams);
            orderRequestDataForLocale.orders.push(orderMock);
            const authErrorMsg = new Error('EXPORT_ORDER_RETRY_ERROR: Order Feed submission aborted due to repeated service errors \n' +
            ' Number of attempts: 2');

            try {
                exportOrderModelInstance.sendOrdersToYotpo(orderRequestDataForLocale, 'appKey', 'default', true);
            } catch (e) {
                assert.deepEqual(e, authErrorMsg);
            }
        });

        it('Should throw EXPORT_ORDER_SERVICE_ERROR because there was an unknown error', () => {
            const response = { ...serviceResponses.base, ...serviceResponses.baseError };
            delete response.object;

            serviceMock.call.returns(response);

            let orderRequestDataForLocale = cloneDeep(sfccConfigurationScenarios.baseYotpoRequestParams);
            orderRequestDataForLocale.orders.push(orderMock);
            const unknownErrorMsg = new Error('EXPORT_ORDER_SERVICE_ERROR: An unknown error occurred while attempting to communicate with the Yotpo service');

            try {
                exportOrderModelInstance.sendOrdersToYotpo(orderRequestDataForLocale, 'appKey', 'default', true);
            } catch (e) {
                assert.deepEqual(e, unknownErrorMsg);
            }
        });
    });

    describe('exportOrdersByLocale', () => {
        const requestDataByLocale = {
            'default': { ...sfccConfigurationScenarios.baseYotpoRequestParams },
            'en_US': { ...sfccConfigurationScenarios.baseYotpoRequestParams }
        };

        it('Should call sendOrdersToYotpo with the correct parameters', () => {
            let sinonSendOrdersToYotpoStub = sinon.stub(exportOrderModelInstance, 'sendOrdersToYotpo');

            const response = { ...serviceResponses.base, object: serviceResponses.ok };
            serviceMock.call.returns(response);

            const inputConfigAndRequestsByLocale = {
                appKeysAndTokensByLocale: { ...sfccConfigurationScenarios.configsByLocale },
                requestsDataByLocale: requestDataByLocale
            };

            // There has to be at least 1 order for the api to be called
            requestDataByLocale.default.orders.push({});
            exportOrderModelInstance.exportOrdersByLocale(inputConfigAndRequestsByLocale);

            assert.isTrue(sinonSendOrdersToYotpoStub.calledWith(requestDataByLocale.default, 'appKey', 'default', true));
            requestDataByLocale.default.orders.pop({});

            sinonSendOrdersToYotpoStub.restore();
        });
    });

    describe('addOrderDataToRequests', () => {
        const requestDataByLocale = {
            'default': { ...sfccConfigurationScenarios.baseYotpoRequestParams },
            'en_US': { ...sfccConfigurationScenarios.baseYotpoRequestParams }
        };

        beforeEach(() => {
            serviceMock.call.reset();
        });

        it('Should return combined data that matches expected combined data', () => {
            const mockServiceResponse = { ...serviceResponses.base, object: serviceResponses.ok };

            serviceMock.call.returns(mockServiceResponse);

            const inputConfigAndRequestsByLocale = {
                appKeysAndTokensByLocale: { ...sfccConfigurationScenarios.configsByLocale },
                requestsDataByLocale: requestDataByLocale
            };

            const inputOrdersData = {
                0: { orderLocale: 'default', ...yotpoExpectedReturnValues.orderData },
                1: { orderLocale: 'en_US', ...yotpoExpectedReturnValues.orderData },
                size: () => 2
            };

            const result = exportOrderModelInstance.addOrderDataToRequests(inputOrdersData, inputConfigAndRequestsByLocale);

            const expectedRequestsDataByLocale = {
                'default': sfccConfigurationScenarios.baseYotpoRequestParams,
                'en_US': sfccConfigurationScenarios.baseYotpoRequestParams
            };

            expectedRequestsDataByLocale.default.orders.push({ ...yotpoExpectedReturnValues.orderData });
            expectedRequestsDataByLocale.en_US.orders.push({ ...yotpoExpectedReturnValues.orderData });

            assert.deepEqual(result, {
                appKeysAndTokensByLocale: { ...sfccConfigurationScenarios.configsByLocale },
                requestsDataByLocale: expectedRequestsDataByLocale
            });
        });
    });

    describe('updateJobExecutionTime', () => {
        it('Should return true because saveCustomObjectData is called and combined data matches expected combined data', () => {
            let sinonSaveCustomObjectDataSpy = sinon.spy(exportOrderModelInstance, 'saveCustomObjectData');
            let currentDateTime = new Date();

            exportOrderModelInstance.updateJobExecutionTime(currentDateTime);

            assert.isTrue(sinonSaveCustomObjectDataSpy.calledWith(sinon.match.any, 'orderFeedJobLastExecutionDateTime', currentDateTime));

            sinonSaveCustomObjectDataSpy.restore();
        });
    });
});
