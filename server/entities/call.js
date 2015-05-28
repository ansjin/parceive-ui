var express = require('express');
var router = express.Router();

var util = require('./util');
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

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
