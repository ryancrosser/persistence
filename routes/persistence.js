var _ = require('lodash');
var dir = require('node-dir');
var router = require('express').Router();

var data = require('../data/data');
var four0four = require('../utils/404')();
var resources = require('../lib/resources')();

router.post('/resources', create);
router.get('/resources', read);
router.get('/resources/:id', read);
router.put('/resources/:id', update);
router.delete('/resources/:id', destroy);

router.get('/', function(req, res, next) {
    res.json({message: 'hooray! welcome to our api!'});
    next();
});

// catch
router.get('/*', four0four.notFoundMiddleware);

module.exports = router;

//////////////

function create(req, res, next) {
    resources.create(req.body).then(function(id) {
        res.status(200).json(id);
    }, function(err) {
        res.status(400).json(err);
    });
}

function read(req, res, next) {
    var id = getResourceId(req);
    if(id) {
        if(typeof req.query.name !== 'undefined') {
            resources.read(id, true).then(function(record) {
                //res.type(record.contentType).status(200).json(record.data);
                res.type(record.contentType).status(200).sendFile(record.filepath, {root: './'});
            }, function(err) {
                res.status(400).json(err);
            });
        } else {
            resources.read(id).then(function(record) {
                res.type(record.contentType).status(200).sendFile(record.filepath, {root: './'});
            }, function(err) {
                res.status(400).json(err);
            });
        }
    } else {
        resources.read().then(function(records) {
            res.status(200).json(records);
        }, function(err) {
            res.status(400).json(err);
        });
    }
}

function update(req, res, next) {
    var id = getResourceId(req);
    if(!id) {
        res.status(400).json({message: 'Error: Cannot PUT without an ID'});
    }
    resources.update(id, req.body).then(function(record) {
        res.status(200).json(record);
    }, function(err) {
        res.status(400).json(err);
    });
}

function destroy(req, res, next) {
    var id = getResourceId(req);
    if(!id) {
        res.status(400).json({message: 'Error: Cannot DELETE without an ID'});
    }
    resources.destroy(id).then(function(response) {
        if(response) {
            res.status(200).json(response);
        }
    }, function(err) {
        res.status(400).json(err);
    });
}

function getResourceId(req) {
    return req.params && req.params.id ? req.params.id : false;
}
