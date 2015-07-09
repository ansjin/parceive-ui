var express = require('express');
var router = express.Router();

var util = require('./util');

var functions = require('./function');

var mapping = {
  'ID': 'id',
  'FILE_NAME': 'name',
  'FILE_PATH': 'path'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM FILE_TABLE');
});

router.get('/many/:ids/functions', function(req, res) {
  util.handleManyQuery(req.db, functions.mapping, res, req.params.ids,
    'FUNCTION_TABLE WHERE FILE_ID');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'FILE_TABLE WHERE ID');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM FILE_TABLE WHERE ID=?', req.params.id);
});

router.get('/:id/functions', function(req, res) {
  util.handleRelationshipQuery(req.db, functions.mapping, res,
    'SELECT * FROM FUNCTION_TABLE WHERE FILE_ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
