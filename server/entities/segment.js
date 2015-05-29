var express = require('express');
var router = express.Router();

var util = require('./util');

var instructions = require('./instruction');

var mapping = {
  'ID': 'id',
  'CALL_ID': 'call',
  'SEGMENT_NO': 'segmentNumber',
  'SEGMENT_TYPE': 'type',
  'LOOP_POINTER': 'loopPointer'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM SEGMENT_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM SEGMENT_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

router.get('/many/:ids', function(req, res) {
  var prep = util.makeIN(req.params.ids);

  var stmt =
    req.db.prepare('SELECT * FROM SEGMENT_TABLE WHERE ID in' + prep.str);

  if (prep.args.length > 0) {
    stmt.bind.call(stmt, prep.args);
  }

  util.sendAll(stmt, mapping, res);
});

router.get('/:id/instructions', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM INSTRUCTION_TABLE WHERE SEGMENT_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, instructions.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
