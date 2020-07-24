const sinon = require('sinon');

const hasNextStub = sinon.stub();
const nextStub = sinon.stub();
const isRegisteredStub = sinon.stub();
const localeStub = sinon.stub();
const dateTimeStub = sinon.stub();

module.exports = {
    customer: {
        isRegistered: isRegisteredStub,
        profile: {
            firstName: 'firstName',
            lastName: 'lastName',
            email: 'profile@email.com'
        }
    },
    customerName: 'customerName',
    customerEmail: 'order@email.com',
    getShipments: () => {
        return {
            iterator: () => {
                return {
                    hasNext: hasNextStub,
                    next: nextStub
                };
            }
        };
    },
    customerLocaleID: localeStub,
    orderNo: '0000001',
    creationDate: dateTimeStub,
    currencyCode: 'currencyCode'

};
