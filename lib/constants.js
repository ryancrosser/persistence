module.exports = function() {
    return new (function (){ // jshint ignore:line
        this.RESOURCES_LOCATION = './data/resources/';
        this.RESOURCES_TABLE_NAME = 'resources.sql';
        this.RESOURCES_TABLE_LOCATION = './data/' + this.RESOURCES_TABLE_NAME;
        this.PERSISTED_FILE_LOCATION = './to_persist/';
    })();
};