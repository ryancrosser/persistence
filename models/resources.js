var _ = require('lodash');
var db = require('./sqliteDB')('./data/resources.sql');
var del = require('del');
var dir = require('node-dir');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var Q = require('q');
var sqlite3 = require('sqlite3').verbose();

var RESOURCES_LOCATION = './data/resources/';

var PERSISTED_FILE_LOCATION = './to_persist/';

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

    activate();

    db.setDefaults(resourceDefaults());

    var service = {
        create: create,
        read: read,
        update: update,
        destroy: destroy
    };
    return service;

    function activate() {
        try {
            // ensure the resources folder exists
            fs.mkdir(RESOURCES_LOCATION, function(err) {
                if(err) {
                    if(err.code && err.code !== 'EEXIST') {
                        console.error(err);
                    }
                } else {
                    console.info('Directory created: ' + RESOURCES_LOCATION);
                }
            });

            //buildDependencies();
        } catch(e) {

        }

    }

    function create(record) {
        var deferred = Q.defer();

        if(!record) {
            record = resourceDefaults();
            record.data = '';
        }
        db.insertOne(record).then(function(insertId) {
            var filename = RESOURCES_LOCATION + insertId + '-' + record.name;
            fs.writeFile(filename, record.data || '', function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log('CREATED file: ' + filename);
                deferred.resolve(insertId);
            });
        }, function(err) {
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function read(id, getByName) {
        var deferred = Q.defer();
        if(id) {
            if(getByName) {
                getIdByName(id).then(function(idNameMap) {
                    db.readOne(idNameMap[id]).then(function(record) {
                        record.filepath = RESOURCES_LOCATION + record.id + '-' + record.name;
                        deferred.resolve(record);
                    }, function(err) {
                        deferred.reject(err);
                    });
                });
            } else {
                db.readOne(id).then(function(record) {
                    record.filepath = RESOURCES_LOCATION + id + '-' + record.name;
                    deferred.resolve(record);
                }, function(err) {
                    deferred.reject(err);
                });
            }
        } else {
            db.read().then(function(records) {
                deferred.resolve(records);
            });
        }

        return deferred.promise;
    }

    function update(id, values) {
        var deferred = Q.defer();
        db.readOne(id).then(function(row) {
            var origName = row.name;
            console.log(id, row);
            db.updateOne(id, values).then(function(res) {
                var filename = RESOURCES_LOCATION + id + '-' + origName;
                writeFile(filename, values.data).then(function(response) {
                    // rename is async, so to be able to see if it errored, we have to do it
                    // this way :(
                    if(origName !== res.name) {
                        fs.rename(filename, RESOURCES_LOCATION + id + '-' + res.name,
                            function(err) {
                                if(err) {
                                    console.error(err);
                                    console.error('Error renaming file.');
                                    deferred.reject({message: 'Error renaming file.'});
                                }

                                res.data = values.data;
                                deferred.resolve(res);
                            });
                    } else {
                        res.data = values.data;
                        deferred.resolve(res);
                    }
                }, function(err) {
                    console.error(err);
                    deferred.reject(err);
                });
            }, function(err) {
                console.error(err);
                deferred.reject(err);
            });
        }, function(err) {
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function destroy(id) {
        var deferred = Q.defer();
        db.deleteOne(id).then(function(res) {
            del([RESOURCES_LOCATION + id + '-*'], function(err, paths) {
                if(err) {
                    console.error(err);
                    deferred.reject(err);
                }
                if(paths.length) {
                    console.info('Deleted files/folders:\n', paths.join('\n'));
                } else {
                    deferred.reject({message: 'No files found to delete.'});
                }

                deferred.resolve(res);
            });
        }, function(err) {
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    // Utility Functions
    function readFile(path, encoding) {
        var deferred = Q.defer();

        fs.readFile(path, encoding, function(err, data) {
            if(err) {
                console.error(err);
                deferred.reject({message: 'File not accessible.'});
            }
            deferred.resolve(data);
        });

        return deferred.promise;
    }

    function writeFile(path, data) {
        var deferred = Q.defer();

        fs.writeFile(path, data, function(err) {
            if(err) {
                console.log(err);
                deferred.reject(err);
            }

            deferred.resolve(true);
        });

        return deferred.promise;
    }

    function prepareFileName(filename) {
        return filename.replace(/\s+/g, '_');
    }

    function getIdByName(name) {
        console.log(name);
        var deferred = Q.defer();
        var map = {};
        db.read().then(function(res) {
            res.map(function(r) {
                map[r.name] = r.id;
                return {key: r.id};
            });
            deferred.resolve(map);
        });

        return deferred.promise;
    }

    function buildDependencies() {
        var count = 0;

        var re;

        read().then(function(results) {

            results = results.map(function(result) {
                return result.name;
            });

            dir.files(PERSISTED_FILE_LOCATION, function(err, files) {
                if(err) {
                    throw err;
                }

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
                            create({
                                name: pathArr.base,
                                contentType: contentType,
                                expireDate: moment().utc().add(10,
                                    'y').format('YYYY-MM-DD HH:mm:ss.SSS'),
                                data: data
                            }).then(function(res) {
                                ++count;
                            });
                        });
                    }
                });
            });
        });

        function arrMatch(arr, term) {
            arr = arr.filter(function(file, index) {
                var pattern = new RegExp(term, 'g');
                if(file.match(pattern)) {
                    return true;
                } else {
                    return false;
                }
            });

            return arr.length > 0;
        }
    }
};
