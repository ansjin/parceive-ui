var express = require('express');
var router = express.Router();

var util = require('./util');

var calls = require('./call');

var mapping = {
  'Id': 'id',
  'Function': 'function',
  'Caller': 'caller',
  'Count': 'count',
  'Parent': 'parent'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM CallGroup');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE CallGroup');
});

router.get('/many/:ids/groups', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CallGroup WHERE Parent');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CallGroup WHERE Id');
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, calls.mapping, res,
    'SELECT * FROM Call WHERE CallGroup=?', req.params.id);
});

router.get('/:id/groups', function(req, res) {
  util.handleRelationshipQuery(req.db, mapping, res,
    'SELECT * FROM CallGroup WHERE Parent=?', req.params.id);
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM CallGroup WHERE Id=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
