const sinon = require('sinon');

const configStub = sinon.stub();

module.exports = {
    getCurrent: () => {
        return {
            getPreferences: configStub,
            getName: () => 'Unit Test Site Name',
            getAllowedLocales: () => {
                let locales = {
                    0: 'default',
                    1: 'en_US'
                };
                return {
                    ...locales,
                    remove: sinon.stub().returns([locales['0']]),
                    join: sinon.stub().returns([locales['0']])
                };
            }
        };
    }
};
