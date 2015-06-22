var express = require('express');
var router = express.Router();

var util = require('./util');

var segments = require('./segment');
var instructions = require('./instruction');

var mapping = {
  'ID': 'id',
  'PROCESS_ID': 'process',
  'THREAD_ID': 'thread',
  'FUNCTION_ID': 'function',
  'INSTRUCTION_ID': 'instruction',
  'START_TIME': 'start',
  'END_TIME': 'end',
  'CALLER': 'caller'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/many/:ids/segments', function(req, res) {
  util.buildINStatement(req.db, segments.mapping, res, req.params.ids,
    'SEGMENT_TABLE WHERE CALL_ID');
});

router.get('/many/:ids/calls', function(req, res) {
  util.buildINStatement(req.db, mapping, res, req.params.ids,
    'CALL_TABLE WHERE CALLER');
});

router.get('/many/:ids', function(req, res) {
  util.buildINStatement(req.db, mapping, res, req.params.ids,
    'CALL_TABLE WHERE ID');
});

router.get('/:id/segments', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM SEGMENT_TABLE WHERE CALL_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, segments.mapping, res);
});

router.get('/:id/calls', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE WHERE CALLER=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
