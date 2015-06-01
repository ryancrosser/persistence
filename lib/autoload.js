var _ = require('lodash');
var del = require('del');
var dir = require('node-dir');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var Q = require('q');

var constants = require('./constants')();
var db = require('./sqliteDB')(constants.RESOURCES_TABLE_LOCATION);
var resources = require('./resources')();

module.exports = function(app) {
    var dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
    var resourceDefaults = function() {
        var date = moment().utc();
        var displayDate = date.format(dateFormat);
        var displayExpireDate = date.add(30, 'd').format(dateFormat);
        return {
            name: 'unnamed',
            createdBy: 'SYSTEM',
            contentType: 'text/plain',
            date: displayDate,
            expireDate: displayExpireDate,
            modifiedDate: displayDate
        };
    };

    db.setDefaults(resourceDefaults());

    var service = {
        persistFiles: persistFiles,
        clearFiles: clearFiles
    };
    return service;

    function persistFiles() {
        try {
            // ensure the resources folder exists
            fs.mkdir(constants.PERSISTED_FILE_LOCATION, function(err) {
                if(err) {
                    if(err.code && err.code !== 'EEXIST') {
                        console.error(err);
                    }
                } else {
                    console.info('Directory created: ' + constants.RESOURCES_LOCATION);
                }
            });
        } catch(e) {

        }

        var deferred = Q.defer();
        var count = 0;
        resources.read().then(function(results) {
            results = results.map(function(result) {
                return result.name;
            });
            dir.files(constants.PERSISTED_FILE_LOCATION, function(err, files) {
                if(err) {
                    console.error(err);
                    deferred.reject(err);
                }
                var fileAdded = false;
                if(files.length) {
                    files.forEach(function(file) {
                        var pathArr = path.parse(file);
                        var contentType;

                        if(file.indexOf('.js') !== -1) {
                            contentType = 'text/javascript';
                        } else if(file.indexOf('.css') !== -1) {
                            contentType = 'text/css';
                        } else if(file.indexOf('.html') !== -1) {
                            contentType = 'text/html';
                        } else {
                            contentType = 'text/plain';
                        }

                        if(!arrMatch(results, pathArr.base)) {
                            fs.readFile(file, function(err, data) {
                                resources.create({
                                    name: pathArr.base,
                                    contentType: contentType,
                                    expireDate: moment().utc().add(10, 'y')
                                        .format('YYYY-MM-DD HH:mm:ss.SSS'),
                                    data: data
                                }).then(function(res) {
                                    if(++count === files.length) {
                                        deferred.resolve({message: count + ' files added.'});
                                    }
                                });
                            });
                        }
                    });
                    deferred.resolve({message: 'All files already added.'});
                } else {
                    deferred.resolve({message: 'No files to add.'});
                }

            });
        });
        return deferred.promise;
    }

    function clearFiles() {
        var deferred = Q.defer();
        db.dropTable().then(function(res) {
            db.createTable();
            del([constants.RESOURCES_LOCATION + '*.*'], function(err, paths) {

                if(err) {
                    console.error(err);
                    deferred.reject(err);
                }
                deferred.resolve({message: 'All files removed.'});
            });
        });
        deferred.resolve({message: 'All files removed.'});
        return deferred.promise;
    }

    function arrMatch(arr, term) {
        arr = arr.filter(function(file, index) {
            var pattern = new RegExp(term, 'g');
            return file.match(pattern);
        });

        return arr.length > 0;
    }
};
