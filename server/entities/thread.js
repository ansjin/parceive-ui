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

router.get('/many/:ids/calls', function(req, res) {
  util.buildINStatement(req.db, calls.mapping, res, req.params.ids,
    'CALL_TABLE WHERE THREAD_ID');
});

router.get('/many/:ids', function(req, res) {
  util.buildINStatement(req.db, mapping, res, req.params.ids,
    'THREAD_TABLE WHERE ID');
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
