var express = require('express');
var router = express.Router();

var util = require('./util');

var calls = require('./call');

var mapping = {
  'ID': 'id',
  'SIGNATURE': 'signature',
  'TYPE': 'type',
  'FILE_ID': 'file',
  'START_LINE_NO': 'startLine'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM FUNCTION_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/signature/:sig', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM FUNCTION_TABLE WHERE SIGNATURE=?');

  stmt.bind(req.params.sig);

  util.sendOne(stmt, mapping, res);
});

router.get('/many/:ids/calls', function(req, res) {
  util.buildINStatement(req.db, calls.mapping, res, req.params.ids,
    'CALL_TABLE WHERE FUNCTION_ID');
});

router.get('/many/:ids', function(req, res) {
  util.buildINStatement(req.db, mapping, res, req.params.ids,
    'FUNCTION_TABLE  WHERE ID');
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM FUNCTION_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

router.get('/:id/calls', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM CALL_TABLE WHERE FUNCTION_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, calls.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
