const sinon = require('sinon');

const variationModelStub = sinon.stub();

module.exports = {
    name: 'Product Name',
    shortDescription: {
        getMarkup: () => 'Product Short Description'
    },
    variant: true,
    productGroupId: 'productID',
    getVariationModel: variationModelStub,
    brand: 'brand',
    UPC: 'UPC',
    ID: 'productID'
};
