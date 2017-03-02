/* @noflow */

module.exports = function(wallaby) {
    process.env.BABEL_ENV = 'test';

    return {
        files: [
            'src/**/*.js',
            {pattern: './jest.config.json', instrument: false},
            {pattern: '**/__tests__/*.js', ignore: true}
        ],

        tests: [
            'src/**/__tests__/*.js',
            {pattern: 'node_modules/**/*.js', ignore: true}
        ],

        compilers: {
            'src/**/*.js': wallaby.compilers.babel()
        },

        env: {
            type: 'node',
            runner: '/usr/local/bin/node'
        },

        testFramework: 'jest',

        bootstrap: function() {
            wallaby.testFramework.configure(require('./jest.config.json'));
        }
    };
};
