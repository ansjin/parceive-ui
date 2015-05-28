var express = require('express');
var router = express.Router();

var util = require('./util');

var calls = require('./call');

var mapping = {
  'ID': 'id',
  'INSTRUCTION_ID': 'instruction',
  'PARENT_THREAD_ID': 'parent',
  'CHILD_THREAD_ID': 'child'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM THREAD_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM THREAD_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

router.get('/:id/calls', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE WHERE THREAD_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, calls.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
