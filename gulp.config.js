module.exports = function() {
    var server = './server/';
    var root = './';

    var nodeModules = 'node_modules';

    var config = {
        /**
         * File paths
         */
        // all javascript that we want to vet
        alljs: [
            './server/**/*.js',
            './*.js',
            '!./to_persist/',
            '!./to_persist/**',
            '!./server/data/',
            '!./server/data/**'
        ],
        // app js, with no specs
        root: root,
        server: server,

        /**
         * NPM files
         */
        packages: [
            './package.json'
        ],

        /**
         * Node settings
         */
        nodeServer: './server/index.js',
        defaultPort: '8001'
    };

    return config;
};
