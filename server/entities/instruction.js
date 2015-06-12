var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');
var calls = require('./call');

var mapping = {
  'ID': 'id',
  'SEGMENT_ID': 'segment',
  'INSTRUCTION_TYPE': 'type',
  'LINE_NUMBER': 'lineNumber'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM INSTRUCTION_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/many/:ids/accesses', function(req, res) {
  util.buildINStatement(req.db, accesses.mapping, res, req.params.ids,
    'ACCESS_TABLE WHERE INSTRUCTION_ID');
});

router.get('/many/:ids/calls', function(req, res) {
  util.buildINStatement(req.db, calls.mapping, res, req.params.ids,
    'CALL_TABLE WHERE INSTRUCTION_ID');
});

router.get('/many/:ids', function(req, res) {
  util.buildINStatement(req.db, mapping, res, req.params.ids,
    'INSTRUCTION_TABLE WHERE ID');
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM INSTRUCTION_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);

});

router.get('/:id/accesses', function(req, res) {
  var stmt =
    req.db.prepare('SELECT * FROM ACCESS_TABLE WHERE INSTRUCTION_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, accesses.mapping, res);
});

router.get('/:id/calls', function(req, res) {
  var stmt =
    req.db.prepare('SELECT * FROM CALL_TABLE WHERE INSTRUCTION_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, calls.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
