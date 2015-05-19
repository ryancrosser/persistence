/*jshint node:true*/
'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var logger = require('morgan');

var four0four = require('./utils/404')();

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 5000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

app.set('port', server_port);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(cors());

app.use(express.static('./'));
app.use(express.static(__dirname + '/data'));
app.use('/api', require('./routes'));
app.use('/', function(req, res, next) {
    four0four.send404(req, res);
});

console.log('About to crank up node');
console.log('PORT=' + app.get('port'));
console.log('NODE_ENV=' + app.get('env'));

app.listen(server_port, server_ip_address, function() {
    console.log("Listening on " + server_ip_address + ", server_port " + app.get('port'));
    console.log('env = ' + app.get('env') + '\n' +
                '__dirname = ' + __dirname + '\n' +
                'process.cwd = ' + process.cwd());
});
