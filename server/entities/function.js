var express = require('express');
var router = express.Router();

var util = require('./util');

var calls = require('./call');

var mapping = {
  'ID': 'id',
  'SIGNATURE': 'signature',
  'TYPE': 'type',
  'FILE_ID': 'file',
  'START_LINE_NO': 'startLine'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM FUNCTION_TABLE');
});

router.get('/signature/:sig', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM FUNCTION_TABLE WHERE SIGNATURE=?', req.params.sig);
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'CALL_TABLE WHERE FUNCTION_ID');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'FUNCTION_TABLE  WHERE ID');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM FUNCTION_TABLE WHERE ID=?', req.params.id);
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, calls.mapping, res,
    'SELECT * FROM CALL_TABLE WHERE FUNCTION_ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
