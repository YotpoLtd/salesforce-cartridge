const sinon = require('sinon');

const getCustomObjectStub = sinon.stub();
const getAllCustomObjectsStub = sinon.stub();

module.exports = {
    getCustomObject: getCustomObjectStub,
    getAllCustomObjects: getAllCustomObjectsStub.returns({
        count: 0,
        hasNext: () => true,
        asList: () => [],
        close: () => {}
    })
};
