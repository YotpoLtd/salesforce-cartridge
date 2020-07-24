const sinon = require('sinon');

const callStub = sinon.stub();

module.exports = {
    getConfiguration: () => {
        return {
            getCredential: () => {
                return {
                    getURL: () => 'https://api.yotpo.com/apps/:app_key/purchases/mass_create.json'
                };
            }
        };
    },
    setURL: () => {},
    call: callStub
};
