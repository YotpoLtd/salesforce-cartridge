const sinon = require('sinon');

const hasNextStub = sinon.stub();
const nextStub = sinon.stub();

module.exports = {
    getPriceAdjustments: () => {
        return {
            iterator: () => {
                return {
                    hasNext: hasNextStub,
                    next: nextStub
                };
            }
        };
    },
    getBasePrice: () => {
        return {
            decimalValue: 100.11
        };
    }
};
