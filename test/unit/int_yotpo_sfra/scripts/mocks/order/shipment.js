const sinon = require('sinon');

const hasNextStub = sinon.stub();
const nextStub = sinon.stub();

module.exports = {
    getProductLineItems: () => {
        return {
            iterator: () => {
                return {
                    hasNext: hasNextStub,
                    next: nextStub
                };
            }
        };
    }
};
