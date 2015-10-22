var express = require('express');
var router = express.Router();

var util = require('./util');

var calls = require('./call');

var mapping = {
  'Id': 'id',
  'Signature': 'signature',
  'Type': 'type',
  'File': 'file',
  'Line': 'startLine'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Function');
});

router.get('/signature/:sig', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Function WHERE Signature=?', req.params.sig);
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE Function');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Function  WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Function WHERE ID=?', req.params.id);
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, calls.mapping, res,
    'SELECT * FROM Call WHERE Function=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
