var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Execution': 'execution',
  'LoopIteration': 'iteration',
  'Segment': 'segment'
};

module.exports = {
  router: router,
  mapping: mapping
};

var calls = require('./call');
var segments = require('./segment');
var loopexecutions = require('./loopexecution');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM LoopIteration');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'LoopIteration WHERE Id');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE CallerIteration');
});

router.get('/many/:ids/segments', function(req, res) {
  util.handleManyQuery(req.db, segments.mapping, res, req.params.ids,
    'Segment WHERE Loop');
});

router.get('/many/:ids/loopexecutions', function(req, res) {
  util.handleManyQuery(req.db, loopexecutions.mapping, res, req.params.ids,
    'LoopExecution WHERE ParentIteration');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM LoopIteration WHERE Id=?', req.params.id);
});
