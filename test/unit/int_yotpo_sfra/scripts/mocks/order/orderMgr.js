const sinon = require('sinon');

const searchOrdersSpy = sinon.spy();

module.exports = {
    searchOrders: searchOrdersSpy,
    ORDER_STATUS_CREATED: 0
};
