var express = require('express');
var router = express.Router();

var util = require('./util');

var segments = require('./segment');

var mapping = {
  'ID': 'id',
  'PROCESS_ID': 'process',
  'THREAD_ID': 'thread',
  'FUNCTION_ID': 'function',
  'INSTRUCTION_ID': 'instruction',
  'START_TIME': 'start',
  'END_TIME': 'end',
  'CALLER': 'caller',
  'CALLS_OTHER': 'callsOthers',
  'DURATION': 'duration',
  'CALL_GROUP': 'callGroup'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM CALL_TABLE');
});

router.get('/many/:ids/segments', function(req, res) {
  util.handleManyQuery(req.db, segments.mapping, res, req.params.ids,
    'SEGMENT_TABLE WHERE CALL_ID');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CALL_TABLE WHERE CALLER');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CALL_TABLE WHERE ID');
});

router.get('/:id/segments', function(req, res) {
  util.handleRelationshipQuery(req.db, segments.mapping, res,
    'SELECT * FROM SEGMENT_TABLE WHERE CALL_ID=?', req.params.id);
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, mapping, res,
    'SELECT * FROM CALL_TABLE WHERE CALLER=?', req.params.id);
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM CALL_TABLE WHERE ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
