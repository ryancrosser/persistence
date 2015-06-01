var _ = require('lodash');
var dir = require('node-dir');
var router = require('express').Router();

var autoload = require('../lib/autoload')();
var four0four = require('../utils/404')();

router.get('/resources/clear', remove);
router.get('/resources', load);

// catch
router.get('/*', four0four.notFoundMiddleware);

module.exports = router;

function load(req, res, next) {
    autoload.persistFiles().then(function(response) {
        res.status(200).json(response);
    }, function(err) {
        res.status(400).json(err);
    });
}

function remove(req, res, next){
    autoload.clearFiles().then(function(response){
        res.status(200).json(response);
    }, function(err) {
        res.status(400).json(err);
    });
}