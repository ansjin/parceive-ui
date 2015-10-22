var express = require('express');
var router = express.Router();

var util = require('./util');

var functions = require('./function');

var mapping = {
  'Id': 'id',
  'Name': 'name',
  'Path': 'path'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM File');
});

router.get('/many/:ids/functions', function(req, res) {
  util.handleManyQuery(req.db, functions.mapping, res, req.params.ids,
    'Function WHERE File');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'File WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM File WHERE Id=?', req.params.id);
});

router.get('/:id/functions', function(req, res) {
  util.handleRelationshipQuery(req.db, functions.mapping, res,
    'SELECT * FROM Function WHERE File=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
