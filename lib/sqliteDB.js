var _ = require('lodash');
var Q = require('q');
var moment = require('moment');
var sqlite3 = require('sqlite3').verbose();

var constants = require('./constants')();

module.exports = function(dbFilePath) {
    var defaults = {};
    var columns = [
        'id INTEGER PRIMARY KEY',
        'name TEXT',
        'createdBy TEXT',
        'contentType TEXT',
        'date TEXT',
        'expireDate TEXT',
        'modifiedDate TEXT'
    ];
    var db = {};
    var tableName = '';

    activate();

    return {
        setDefaults: setDefaults,
        connect: connect,
        closeConnection: closeConnection,
        insertOne: insertOne,
        readOne: readOne,
        read: read,
        updateOne: updateOne,
        deleteOne: deleteOne,
        createTable: createTable,
        dropTable: dropTable,
        changeTable: changeTable
    };

    function activate() {
        connect();
    }

    function connect() {
        if(dbFilePath) {
            tableName = getTableName(dbFilePath);
        } else {
            console.info('In-memory database is in use. ' +
                         'To use a persisted database, provide a file name to constructor');
            dbFilePath = ':memory:';
            tableName = 'temp';
        }
        db = new sqlite3.Database(dbFilePath);

        createTable(tableName, columns);
    }

    function closeConnection() {
        var deferred = Q.defer();

        db.close();

        deferred.resolve({message: 'Database closed'});

        return deferred.promise;
    }

    function setDefaults(d) {
        defaults = d;
    }

    function insertOne(record) {
        var deferred = Q.defer();
        var lastId = '';

        var cleanedRecord = prepareRecords(record);

        // I wanted to do this in a prepared statement, but I could get it to return the lastID
        // after insert (code is commented out below)

        var sql = buildInsertStatement(cleanedRecord);
        db.run(sql, function(err) {
            if(err) {
                console.error(err);
                deferred.reject(err);
            }

            lastId = this.lastID;
            console.info(lastId + ': ' + sql);
            deferred.resolve(this.lastID);
        });

        return deferred.promise;

        //var stmt = db.prepare(buildInsertPrepareStmt(cleanedRecord));
        //stmt.get(buildValues(cleanedRecord), function(err, res){
        //    if(err){
        //        throw Error('Error 111: ', err);
        //    }
        //    //console.info('last id: ', this.lastID);
        //});
        //stmt.finalize(function(err){
        //
        //});
    }

    function readOne(id) {
        var deferred = Q.defer();
        var sql = 'SELECT * FROM ' + tableName + ' WHERE id = ' + id + ' ' +
                  'AND expireDate > DATETIME("now")';
        db.get(sql, function(err, row) {
            if(err) {
                console.error(err);
                deferred.reject(err);
            }
            if(!err && !row) {
                console.error('Resource ID does not exist');
                deferred.reject({message: 'Resource ID does not exist'});
            }
            console.info(sql);
            deferred.resolve(row);
        });

        return deferred.promise;
    }

    function read() {
        var deferred = Q.defer();
        var sql = 'SELECT * FROM ' + tableName /* + ' WHERE expireDate > DATETIME("now")' */;
        db.all(sql,
            function(err, row) {
                if(err) {
                    console.error(err);
                    deferred.reject(err);
                }
                console.info(sql);
                if(row.length) {
                    console.info('Results: ' + row.length);
                }
                deferred.resolve(row);
            });

        return deferred.promise;
    }

    function updateOne(id, values) {
        var deferred = Q.defer();
        var cleaned = prepareRecords(values);
        var toUpdate = _.pick(cleaned[0], _.keys(values));
        toUpdate.modifiedDate = moment().utc().format('YYYY-MM-DD HH:mm:ss.SSS');
        var valuesArr = [];
        _.forEach(toUpdate, function(val, key) {
            valuesArr.push(key + ' = "' + val + '"');
        });
        var sql = 'UPDATE ' + tableName + ' SET ' + valuesArr.join(',') +
                  ' WHERE id = ' + id;
        db.run(sql, function(err, row) {
            if(err) {
                console.error(err);
                deferred.reject(err);
            }
            readOne(id).then(function(row) {
                console.info(sql);
                deferred.resolve(row);
            });
        });

        return deferred.promise;
    }

    function deleteOne(id) {
        var deferred = Q.defer();

        var sql = 'DELETE FROM ' + tableName + ' WHERE id = ' + id;
        db.run(sql, function(err, row) {
            if(err) {
                console.error(err);
                deferred.reject(err);
            }

            if(this.changes) {
                console.info(sql);
                deferred.resolve(true);
            } else {
                console.error('File does not exist.');
                deferred.reject({message: 'File does not exist.'});
            }
        });

        return deferred.promise;
    }

    function createTable() {
        var deferred = Q.defer();

        db.serialize(function() {
            var sql = 'CREATE TABLE if not exists ' + tableName + ' (' + columns.join(',') + ')';
            db.run(sql, function(err) {
                if(err) {
                    console.error(err);
                    deferred.reject(err);
                }
                deferred.resolve({message: 'Table ' + tableName + ' created.'});
            });
        });

        return deferred.promise;
    }

    function dropTable() {
        var deferred = Q.defer();
        db.exec('DROP TABLE ' + tableName, function(err) {
            if(err) {
                console.error(err);
                deferred.reject(err);
            }
            deferred.resolve({message: 'Table ' + tableName + ' dropped.'});
        });

        return deferred.promise;
    }

    function changeTable(name) {
        tableName = name;
    }

    // Util Functions
    function getTableName(dbFilePath) {
        var path = dbFilePath.split('/');
        return path[path.length - 1].split('.')[0];
    }

    function prepareRecords(record) {
        var records = [];
        if(_.isPlainObject(record)) {
            records.push(record);
        } else if(_.isArray(record) && _.isPlainObject(record[0])) {
            records = record;
        }
        records.forEach(function(record, i) {
            // add default properties
            records[i] = _.pick(_.assign({}, defaults, record), _.keys(defaults));
            _.forEach(records[i], function(val, key) {
                if(key === 'name') {
                    records[i][key] = prepareFileName(val);
                }
            });
        });

        return records;
    }

    function buildInsertStatement(records) {
        var sql = 'INSERT INTO ' + tableName + ' (' + getColumns(records) + ' ) VALUES ' +
                  buildValues(records);
        return sql;
    }

    function buildParameters(record) {
        return _.fill(_.keys(covertToArray(record)[0]), '?');
    }

    function buildValues(records) {
        var insert = [];
        var str = '';
        records = covertToArray(records);

        records.forEach(function(obj, i) {
            records[i] = _.assign({}, defaults, obj);
        });
        var valueArr = [];
        records.forEach(function(record, i) {
            var values = _.values(record);
            values.forEach(function(v, i) {
                values[i] = '"' + v + '"';
            });
            valueArr.push(values.join(','));
        });

        return '(' + valueArr.join('),(') + ')';
    }

    function getColumns(record) {
        return _.keys(covertToArray(record)[0]).join(',');
    }

    function covertToArray(arrOrObj) {
        var arr = [];
        if(_.isPlainObject(arrOrObj)) {
            arr.push(arrOrObj);
        } else if(_.isArray(arrOrObj) && _.isPlainObject(arrOrObj[0])) {
            arr = arrOrObj;
        }
        return arr;
    }

    function prepareFileName(filename) {
        return filename.replace(/\s+/g, '_');
    }
};
