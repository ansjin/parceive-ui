var express = require('express');
var router = express.Router();

var util = require('./util');

var calls = require('./call');

var mapping = {
  'ID': 'id',
  'FUNCTION_ID': 'function',
  'CALLER': 'caller',
  'COUNT': 'count',
  'PARENT': 'parent'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM GROUPED_CALL_TABLE');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'CALL_TABLE WHERE CALL_GROUP');
});

router.get('/many/:ids/groups', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'GROUPED_CALL_TABLE WHERE PARENT');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'GROUPED_CALL_TABLE WHERE ID');
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, calls.mapping, res,
    'SELECT * FROM CALL_TABLE WHERE CALL_GROUP=?', req.params.id);
});

router.get('/:id/groups', function(req, res) {
  util.handleRelationshipQuery(req.db, mapping, res,
    'SELECT * FROM GROUPED_CALL_TABLE WHERE PARENT=?', req.params.id);
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM GROUPED_CALL_TABLE WHERE ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
