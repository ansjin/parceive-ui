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
  'END_TIME': 'end'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/many/:ids', function(req, res) {
  var prep = util.makeIN(req.params.ids);

  var stmt =
    req.db.prepare('SELECT * FROM CALL_TABLE WHERE ID in' + prep.str);

  if (prep.args.length > 0) {
    stmt.bind.call(stmt, prep.args);
  }

  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

router.get('/:id/segments', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM SEGMENT_TABLE WHERE CALL_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, segments.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
