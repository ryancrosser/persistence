/*jshint node:true*/
'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var logger = require('morgan');

var four0four = require('./utils/404')();

var port = process.env.OPENSHIFT_NODEJS_PORT || 5000;
var ipAddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var dbName = 'test';
// preparing MongoDB
var mongodbConnectionString = 'mongodb://127.0.0.1:27017/' + dbName;

app.set('port', port);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(cors());

app.use(express.static('./'));
app.use(express.static(__dirname + '/data'));
app.use('/api/autoload', require('./routes/autoload'));
app.use('/api', require('./routes/persistence'));
app.use('/', function(req, res, next) {
    four0four.send404(req, res);
});

console.log('About to crank up node');
console.log('PORT=' + app.get('port'));
console.log('NODE_ENV=' + app.get('env'));


//take advantage of openshift env vars when available:
if(process.env.OPENSHIFT_MONGODB_DB_URL){
    mongodbConnectionString = process.env.OPENSHIFT_MONGODB_DB_URL + dbName;
}

app.listen(port, ipAddress, function() {
    console.log('Listening on ' + ipAddress + ', port ' + app.get('port'));
    console.log('env = ' + app.get('env') + '\n' +
                '__dirname = ' + __dirname + '\n' +
                'process.cwd = ' + process.cwd());
});
