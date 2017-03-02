var getBabelRelayPlugin = require('babel-relay-plugin');


module.exports = getBabelRelayPlugin(require('./test-schema.json'), {
    abortOnError: true
});
