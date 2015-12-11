var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Loop': 'loop',
  'ParentIteration': 'parent',
  'Duration': 'duration',
  'Call': 'call'
};

module.exports = {
  router: router,
  mapping: mapping
};

var loopiterations = require('./loopiteration');
var calls = require('./call');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM LoopExecution');
});

router.get('/many/:ids/loopiterations', function(req, res) {
  util.handleManyQuery(req.db, loopiterations.mapping, res, req.params.ids,
    'LoopIteration WHERE Execution');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE CallerExecution');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'LoopExecution WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM LoopExecution WHERE Id=?', req.params.id);
});

router.get('/:id/loopexecutions', function(req, res) {
  util.handleRelationshipQuery(req.db, loopiterations.mapping, res,
    'SELECT * FROM LoopIteration WHERE Execution=?', req.params.id);
});
